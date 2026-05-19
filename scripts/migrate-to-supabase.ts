import 'dotenv/config';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { daySchema } from '../server/src/schema/daySchema';
import type { Database } from '../web/src/lib/supabase-types';

const OWNER_EMAIL = 'gaabscps@gmail.com';
// Dev credential intentionally hardcoded per FEAT-030 spec (US-004 Notes):
// owner uses this account locally; rotated before SaaS launch in FEAT-031+.
const OWNER_PASSWORD = 'bob1010';
const DAYS_DIR = 'server/data/days';

interface RawPriority {
  id: string;
  text: string;
  done: boolean;
}
interface RawNote {
  id: string;
  prefix: string;
  text: string;
}
interface RawGratitude {
  id: string;
  text: string;
}
interface RawAgendaSlot {
  hour: number;
  text: string;
  energy: { emoji: string } | null;
}

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Missing env ${name} in .env`);
    process.exit(1);
  }
  return v;
}

async function main() {
  const projectId = requireEnv('SUPABASE_PROJECT_ID');
  const serviceRole = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  const url = `https://${projectId}.supabase.co`;

  const admin = createClient<Database>(url, serviceRole, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`Migrating to: ${url}`);

  let userId: string;
  const created = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: OWNER_PASSWORD,
    email_confirm: true,
  });
  if (created.error) {
    const code = (created.error as { code?: string }).code;
    const alreadyExists =
      code === 'email_exists' || /already (registered|exists)/i.test(created.error.message);
    if (alreadyExists) {
      const list = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      if (list.error) {
        console.error('listUsers error:', list.error.message);
        process.exit(1);
      }
      const found = list.data.users.find((u) => u.email === OWNER_EMAIL);
      if (!found) {
        console.error('User exists but listUsers did not return it');
        process.exit(1);
      }
      userId = found.id;
      console.log(`Target user (existing): ${userId}`);
    } else {
      console.error('createUser error:', created.error.message);
      process.exit(1);
    }
  } else {
    if (!created.data.user) {
      console.error('createUser returned no user');
      process.exit(1);
    }
    userId = created.data.user.id;
    console.log(`Target user (new): ${userId}`);
  }

  let files: string[];
  try {
    files = readdirSync(DAYS_DIR).filter((f) => f.endsWith('.json'));
  } catch {
    console.log('No day files to migrate');
    process.exit(0);
  }
  if (files.length === 0) {
    console.log('No day files to migrate');
    process.exit(0);
  }

  let okCount = 0;
  let skipCount = 0;
  let errCount = 0;

  for (const file of files) {
    const date = file.replace('.json', '');
    let rawJson: unknown;
    try {
      rawJson = JSON.parse(readFileSync(join(DAYS_DIR, file), 'utf8'));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`${date}: skip — invalid JSON (${msg})`);
      skipCount++;
      continue;
    }

    const parsed = daySchema.safeParse(rawJson);
    if (!parsed.success) {
      const reason = parsed.error.issues
        .slice(0, 2)
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      console.log(`${date}: skip — invalid schema (${reason})`);
      skipCount++;
      continue;
    }
    const raw = parsed.data;

    try {
      const { error: dayErr } = await admin.from('days').upsert(
        {
          user_id: userId,
          date: raw.date,
          intention: raw.intention ?? null,
          mood: raw.mood ?? null,
          created_at: raw.createdAt ?? new Date().toISOString(),
          updated_at: raw.updatedAt ?? new Date().toISOString(),
        },
        { onConflict: 'user_id,date' },
      );
      if (dayErr) {
        if (dayErr.code === '42501') {
          throw new Error(
            `days: RLS violation (42501) — service_role should bypass RLS; SUPABASE_SERVICE_ROLE_KEY is likely wrong`,
          );
        }
        throw new Error(`days: ${dayErr.message}`);
      }

      const { error: prioDelErr } = await admin
        .from('priorities')
        .delete()
        .eq('user_id', userId)
        .eq('date', raw.date);
      if (prioDelErr) throw new Error(`priorities delete: ${prioDelErr.message}`);

      const priorities: RawPriority[] = raw.priorities;
      if (priorities.length > 0) {
        const prioRows = priorities.map((p, i) => ({
          id: p.id,
          user_id: userId,
          date: raw.date,
          text: p.text,
          done: !!p.done,
          position: i,
        }));
        const { error: prioErr } = await admin.from('priorities').insert(prioRows);
        if (prioErr) throw new Error(`priorities: ${prioErr.message}`);
      }

      const { error: noteDelErr } = await admin
        .from('notes')
        .delete()
        .eq('user_id', userId)
        .eq('date', raw.date);
      if (noteDelErr) throw new Error(`notes delete: ${noteDelErr.message}`);

      const notes: RawNote[] = raw.notes;
      if (notes.length > 0) {
        const noteRows = notes.map((n, i) => ({
          id: n.id,
          user_id: userId,
          date: raw.date,
          prefix: n.prefix,
          text: n.text,
          position: i,
        }));
        const { error: noteErr } = await admin.from('notes').insert(noteRows);
        if (noteErr) throw new Error(`notes: ${noteErr.message}`);
      }

      const { error: gratDelErr } = await admin
        .from('gratitude_items')
        .delete()
        .eq('user_id', userId)
        .eq('date', raw.date);
      if (gratDelErr) throw new Error(`gratitude delete: ${gratDelErr.message}`);

      const gratitude: RawGratitude[] = raw.gratitude;
      if (gratitude.length > 0) {
        const gratRows = gratitude.map((g, i) => ({
          id: g.id,
          user_id: userId,
          date: raw.date,
          text: g.text,
          position: i,
        }));
        const { error: gratErr } = await admin.from('gratitude_items').insert(gratRows);
        if (gratErr) throw new Error(`gratitude: ${gratErr.message}`);
      }

      const slotsByHour = new Map<number, RawAgendaSlot>();
      for (const s of raw.agenda as RawAgendaSlot[]) {
        if (typeof s?.hour === 'number') slotsByHour.set(s.hour, s);
      }
      const slotRows: {
        user_id: string;
        date: string;
        hour: number;
        text: string;
        energy_emoji: string | null;
      }[] = [];
      for (let h = 6; h <= 23; h++) {
        const s = slotsByHour.get(h);
        slotRows.push({
          user_id: userId,
          date: raw.date,
          hour: h,
          text: s?.text ?? '',
          energy_emoji: s?.energy?.emoji ?? null,
        });
      }
      const { error: slotErr } = await admin
        .from('agenda_slots')
        .upsert(slotRows, { onConflict: 'user_id,date,hour' });
      if (slotErr) throw new Error(`agenda_slots: ${slotErr.message}`);

      const nonEmptyAgenda = slotRows.filter((s) => s.text && s.text !== '').length;
      console.log(
        `${date}: ok — prio=${priorities.length} agenda_non_empty=${nonEmptyAgenda} notes=${notes.length} grat=${gratitude.length}`,
      );
      okCount++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`${date}: error — ${msg}`);
      errCount++;
    }
  }

  console.log(`\nSummary: ok=${okCount} skip=${skipCount} err=${errCount} (total=${files.length})`);
  process.exit(errCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});
