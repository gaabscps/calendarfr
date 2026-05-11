/**
 * navigation-keyboard.spec.ts — AC-004, AC-005: Keyboard navigation prev/next.
 *
 * Prerequisites (start before running):
 *   Terminal 1: npm run dev:web    (Vite on localhost:3000)
 *   Terminal 2: npm run dev:server (Fastify on localhost:3003)
 *
 * Or simply: npm run dev  (starts both)
 *
 * Run: npx playwright test --project=real e2e/real/navigation-keyboard.spec.ts
 *
 * Keyboard mapping:
 *   - Mac: Cmd+ArrowLeft / Cmd+ArrowRight
 *   - Win/Linux: Ctrl+ArrowLeft / Ctrl+ArrowRight
 *   Playwright's `ControlOrMeta` key alias sends the platform-correct modifier.
 *   However, the app listens for both `e.metaKey` and `e.ctrlKey`, so both work
 *   on all platforms. We use `Meta+ArrowLeft` per process.platform and fall back
 *   to `Control+ArrowLeft` on Win/Linux.
 */

import { expect, test } from '@playwright/test';

import { attachConsoleErrorCapture } from '../_helpers/console-errors.js';
import { modKey } from '../_helpers/dates.js';
import { waitForCompanion } from '../_helpers/server-ready.js';

let companionReady = true;

test.beforeAll(async () => {
  try {
    await waitForCompanion();
  } catch {
    companionReady = false;
  }
});

test('AC-004: Cmd/Ctrl+ArrowLeft navigates to previous day; Cmd/Ctrl+ArrowRight to next', async ({
  page,
}) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }

  const consoleErrors = attachConsoleErrorCapture(page);

  await page.goto('/');

  const h1 = page.locator('h1');
  await expect(h1).toBeVisible({ timeout: 5_000 });

  // Capture the initial date text (today in pt-BR full format).
  const initialDateText = await h1.textContent();
  expect(initialDateText, 'AC-004 FAIL: h1 text is empty before navigation').toBeTruthy();

  // Blur any focused element to ensure keyboard shortcut is not swallowed by an editor.
  // (FE-L-MINOR-3: page.evaluate blur is safer than body.click which may hit a focusable element.)
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.blur();
  });

  // Press Cmd/Ctrl+ArrowLeft → navigate to previous day.
  const mod = modKey();
  await page.keyboard.press(`${mod}+ArrowLeft`);

  // Wait for h1 to update to a different date (animation 300ms + DOM update).
  // Use not.toHaveText rather than waitForTimeout (anti-débito).
  await expect(h1).not.toHaveText(initialDateText!, { timeout: 2_000 });

  const prevDateText = await h1.textContent();
  expect(prevDateText, 'AC-004 FAIL: h1 did not change after navigating prev').toBeTruthy();
  expect(prevDateText, 'AC-004 FAIL: prev date should differ from initial').not.toBe(
    initialDateText,
  );

  // Wait for animation to complete before next press.
  // usePageNavigation has an isAnimating guard (ANIMATION_DURATION_MS = 300ms) that
  // drops concurrent navigation input. PageNavigator disables the nav buttons while
  // isAnimating is true — waiting for the "Próximo dia" button to be enabled is the
  // reliable semantic signal that the guard has lifted (works in both full-animation
  // and reducedMotion modes).
  await expect(page.getByRole('button', { name: /Próximo dia/i })).toBeEnabled({ timeout: 1_000 });

  // Press Cmd/Ctrl+ArrowRight → navigate back to today.
  await page.keyboard.press(`${mod}+ArrowRight`);

  // Wait for h1 to return to the initial date.
  await expect(h1).toHaveText(initialDateText!, { timeout: 2_000 });

  // No console errors.
  expect(
    consoleErrors,
    `AC-004 FAIL: console.error(s) detected:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
});

test('AC-005: after prev → next navigation, app returns to today with correct date', async ({
  page,
}) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }

  const consoleErrors = attachConsoleErrorCapture(page);

  await page.goto('/');

  const h1 = page.locator('h1');
  await expect(h1).toBeVisible({ timeout: 5_000 });

  const today = new Date();
  const expectedTodayText = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(today);

  // Verify initial state is today.
  await expect(h1).toHaveText(expectedTodayText, { timeout: 3_000 });

  // Blur any focused element before keyboard nav.
  // (FE-L-MINOR-3: safer than body.click which may land on a focusable element.)
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.blur();
  });

  const mod = modKey();

  // Navigate to previous day.
  await page.keyboard.press(`${mod}+ArrowLeft`);
  await expect(h1).not.toHaveText(expectedTodayText, { timeout: 2_000 });

  // Wait for animation to complete before next press.
  // usePageNavigation has an isAnimating guard (ANIMATION_DURATION_MS = 300ms) that
  // drops concurrent navigation input. PageNavigator disables the nav buttons while
  // isAnimating is true — waiting for the "Próximo dia" button to be enabled is the
  // reliable semantic signal that the guard has lifted (works in both full-animation
  // and reducedMotion modes).
  await expect(page.getByRole('button', { name: /Próximo dia/i })).toBeEnabled({ timeout: 1_000 });

  // Navigate back to next day (today).
  await page.keyboard.press(`${mod}+ArrowRight`);

  // AC-005: h1 must show today's full pt-BR date again.
  await expect(h1).toHaveText(expectedTodayText, { timeout: 2_000 });

  // No console errors.
  expect(
    consoleErrors,
    `AC-005 FAIL: console.error(s) detected:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
});
