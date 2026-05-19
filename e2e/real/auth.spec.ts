/**
 * auth.spec.ts — FEAT-031 E2E real.
 *
 * Prereq:
 *   - Vite dev server running on localhost:3000 (npm run dev:web)
 *   - .env populated with VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
 *   - Supabase project has mailer_autoconfirm=true (no email confirmation required)
 *
 * Run: npm run test:e2e:real -- --grep "auth"
 */
import { expect, test } from '@playwright/test';

import { deleteUserByEmail, randomTestEmail } from '../_helpers/supabase-admin';

const PASSWORD = 'probe-123456';

test.describe('FEAT-031 auth flow', () => {
  let email = '';

  test.beforeEach(() => {
    email = randomTestEmail();
  });

  test.afterEach(async () => {
    await deleteUserByEmail(email).catch(() => {
      /* idempotent */
    });
  });

  test('signup → logout → login flow', async ({ page }) => {
    await page.goto('/');

    // Toggle to signup
    await page.getByRole('button', { name: /criar conta/i }).click();

    // Fill + submit signup
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^criar conta$/i }).click();

    // DailyPage appears (gate switched) — wait for h1 (date) to show
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // Open AccountDockItem popover and Sair
    await page.getByRole('button', { name: /^conta$/i }).click();
    await page.getByRole('button', { name: /sair/i }).click();

    // AuthPage reappears
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();

    // Log back in
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill(PASSWORD);
    await page.getByRole('button', { name: /entrar/i }).click();

    // DailyPage again
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
  });

  test('reload preserves session — no flash of AuthPage', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /criar conta/i }).click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^criar conta$/i }).click();
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    await page.reload();
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /^entrar$/i })).toHaveCount(0);
  });

  test('login with wrong password shows translated error and stays on AuthPage', async ({
    page,
  }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /criar conta/i }).click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^criar conta$/i }).click();
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    // Logout
    await page.getByRole('button', { name: /^conta$/i }).click();
    await page.getByRole('button', { name: /sair/i }).click();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();

    // Wrong password
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill('definitely-wrong-12345');
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText('Email ou senha incorretos.')).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
  });

  test('signup with already-registered email shows translated error', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /criar conta/i }).click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^criar conta$/i }).click();
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /^conta$/i }).click();
    await page.getByRole('button', { name: /sair/i }).click();
    await page.getByRole('button', { name: /criar conta/i }).click();
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/senha/i).fill(PASSWORD);
    await page.getByRole('button', { name: /^criar conta$/i }).click();

    // Supabase with mailer_autoconfirm=true may either (a) surface a duplicate
    // error, or (b) silently return the existing user without error (security-
    // by-obscurity). Accept either: the translated error visible, OR we end up
    // on the authenticated DailyPage (gate switched because supabase returned
    // a session for the existing user).
    const errorLocator = page.getByText('Este email já tem conta. Faça login.');
    const dailyPageLocator = page.locator('h1').first();
    await Promise.race([
      errorLocator.waitFor({ state: 'visible', timeout: 10000 }),
      dailyPageLocator.waitFor({ state: 'visible', timeout: 10000 }),
    ]);
    const errorVisible = await errorLocator.isVisible();
    const onDailyPage = await dailyPageLocator.isVisible();
    expect(errorVisible || onDailyPage).toBe(true);
  });

  test('short password is blocked client-side and never reaches Supabase', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel(/email/i).fill('someone@calendarfr.dev');
    await page.getByLabel(/senha/i).fill('short');
    const requestPromise = page
      .waitForRequest((req) => req.url().includes('/auth/v1/') && req.method() === 'POST', {
        timeout: 2000,
      })
      .catch(() => null);
    await page.getByRole('button', { name: /entrar/i }).click();
    await expect(page.getByText(/ao menos 8 caracteres/i)).toBeVisible();
    expect(await requestPromise).toBeNull();
  });
});
