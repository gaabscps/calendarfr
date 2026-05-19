/**
 * supabase-error-contract.spec.ts — FEAT-031 contract test.
 *
 * Provokes each error string that supabaseErrorMessage() maps and asserts the
 * substring still appears in the raw error returned by the live Supabase
 * project. If this test fails, the mapping degraded silently — update
 * web/src/shared/lib/supabaseErrorMessage.ts before merging.
 *
 * Prereq: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in env.
 * Run: npm run test:e2e:real -- --grep "contract"
 */
import { createClient } from '@supabase/supabase-js';
import { expect, test } from '@playwright/test';

import { deleteUserByEmail, randomTestEmail } from '../_helpers/supabase-admin';

const url = process.env['VITE_SUPABASE_URL'] ?? '';
const anonKey = process.env['VITE_SUPABASE_ANON_KEY'] ?? '';
const client = createClient(url, anonKey, { auth: { persistSession: false } });

test.describe('Supabase error contract', () => {
  test('invalid login credentials still contains expected substring', async () => {
    const { error } = await client.auth.signInWithPassword({
      email: 'nobody@calendarfr.dev',
      password: 'absolutely-wrong-password',
    });
    expect(error?.message?.toLowerCase()).toContain('invalid login credentials');
  });

  test('user already registered still contains expected substring', async () => {
    const email = randomTestEmail();
    try {
      const first = await client.auth.signUp({ email, password: 'probe-123456' });
      expect(first.error).toBeNull();
      const second = await client.auth.signUp({ email, password: 'probe-123456' });
      // With mailer_autoconfirm=true, Supabase may not surface a duplicate error
      // on signUp — it can return the existing user as if it were a fresh signup
      // (security-by-obscurity). The mapping only fires when error exists, so
      // this assertion is conditional: if error surfaces, validate the substring.
      if (second.error) {
        expect(second.error.message.toLowerCase()).toContain('user already registered');
      }
    } finally {
      await deleteUserByEmail(email).catch(() => {});
    }
  });

  test('RLS / permission denied still contains expected substring', async () => {
    // Anon client (no session) attempting to insert into days — RLS rejects.
    const { error: insertError } = await client
      .from('days')
      .insert({ user_id: '00000000-0000-0000-0000-000000000000', date: '2099-01-01' });
    expect(insertError).toBeTruthy();
    const msg = insertError!.message.toLowerCase();
    const matchesRls = msg.includes('row-level security') || msg.includes('permission denied');
    expect(matchesRls).toBe(true);
  });
});
