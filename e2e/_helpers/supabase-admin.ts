/**
 * Admin helper for E2E tests — uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
 * Only used in E2E tests; never bundled into the web app.
 *
 * Reads env directly via process.env. The `.env` file is loaded by Playwright at
 * spec-runtime via Node's standard mechanism (or via npm script invocation).
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env['VITE_SUPABASE_URL'] ?? '';
const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '';

export function adminClient() {
  if (!url || !serviceKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env — required for E2E cleanup.',
    );
  }
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}

export async function deleteUserByEmail(email: string): Promise<void> {
  const client = adminClient();
  const { data, error } = await client.auth.admin.listUsers();
  if (error) throw error;
  const target = data.users.find((u) => u.email === email);
  if (!target) return;
  const { error: delErr } = await client.auth.admin.deleteUser(target.id);
  if (delErr && !String(delErr.message).includes('not found')) throw delErr;
}

export function randomTestEmail(): string {
  const id = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`).replace(
    /[^a-z0-9]/gi,
    '',
  );
  return `test+${id}@calendarfr.dev`;
}
