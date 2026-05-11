/**
 * smoke.spec.ts — AC-001: App loads without console.error, <h1> shows today.
 *
 * Prerequisites (start before running):
 *   Terminal 1: npm run dev:web    (Vite on localhost:3000)
 *   Terminal 2: npm run dev:server (Fastify on localhost:3003)
 *
 * Or simply: npm run dev  (starts both)
 *
 * Run: npm run test:e2e:real -- --grep "smoke"
 *      npx playwright test --project=real e2e/real/smoke.spec.ts
 */

import { expect, test } from '@playwright/test';

import { attachConsoleErrorCapture } from '../_helpers/console-errors.js';
import { waitForCompanion } from '../_helpers/server-ready.js';

// Check companion availability once at module level so each test can skip inline.
// test.skip() inside test.beforeAll() only skips the hook, NOT the tests — anti-pattern.
// Using a module-level flag + inline test.skip(condition, reason) is the correct approach.
let companionReady = true;

test.beforeAll(async () => {
  try {
    await waitForCompanion();
  } catch {
    companionReady = false;
  }
});

test('AC-001: app loads, <h1> shows today in pt-BR, no console.error', async ({ page }) => {
  test.skip(!companionReady, 'Companion server not available — start with: npm run dev:server');

  const consoleErrors = attachConsoleErrorCapture(page);

  await page.goto('/');

  // Expect <h1> with today's date in PT-BR full format (e.g. "segunda-feira, 11 de maio de 2026").
  // We derive the expected string the same way the app does: Intl.DateTimeFormat pt-BR full.
  const today = new Date();
  const expectedDateText = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(today);

  // Wait for h1 to be visible with today's date — timeout 2s per AC-001.
  const h1 = page.locator('h1');
  await expect(h1).toBeVisible({ timeout: 2_000 });
  await expect(h1).toHaveText(expectedDateText, { timeout: 2_000 });

  // After page is loaded and rendered, assert no console.error occurred (SC-003).
  expect(
    consoleErrors,
    `AC-001 FAIL: console.error(s) detected during page load:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
});
