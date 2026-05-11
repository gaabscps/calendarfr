/**
 * a11y-semantics.spec.ts — AC-006: ARIA attributes and roles are present.
 *
 * Prerequisites (start before running):
 *   Terminal 1: npm run dev:web    (Vite on localhost:3000)
 *   Terminal 2: npm run dev:server (Fastify on localhost:3003)
 *
 * Or simply: npm run dev  (starts both)
 *
 * Run: npx playwright test --project=real e2e/real/a11y-semantics.spec.ts
 *
 * Scope: verifies ARIA attribute presence (not screen-reader behavior — that is
 * out of scope per FEAT-013 spec). Covers AC-038–AC-042 semantics.
 *
 * Note: `page.getByRole('status')` matches `role="status"` elements. The
 * SaveIndicator renders `<span role="status" aria-live="polite" aria-atomic="true">`.
 */

import { expect, test } from '@playwright/test';

import { attachConsoleErrorCapture } from '../_helpers/console-errors.js';
import { waitForCompanion } from '../_helpers/server-ready.js';

let companionReady = true;

test.beforeAll(async () => {
  try {
    await waitForCompanion();
  } catch {
    companionReady = false;
  }
});

test('AC-006: ARIA semantics — region, h1 aria-live, role=status, nav aria-keyshortcuts', async ({
  page,
}) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }

  const consoleErrors = attachConsoleErrorCapture(page);

  await page.goto('/');

  // Wait for the app to load before asserting ARIA structure.
  await expect(page.locator('h1')).toBeVisible({ timeout: 5_000 });

  // --- AC-038: Header region with aria-label ---
  // PageNavigator renders: <section role="region" aria-label="Cabeçalho do dia">
  const headerRegion = page.getByRole('region', { name: /Cabeçalho do dia/i });
  await expect(headerRegion).toBeVisible({
    timeout: 3_000,
  });

  // --- AC-039: <h1> with aria-live="polite" ---
  // Locate the heading level 1 within the header region, then assert the attribute.
  // (FE-L-MINOR-1: use role-based locator scoped to headerRegion instead of attribute CSS selector.)
  const h1 = headerRegion.getByRole('heading', { level: 1 });
  await expect(h1).toBeVisible({ timeout: 3_000 });
  await expect(h1).toHaveAttribute('aria-live', 'polite');

  // --- AC-040: Save indicator has role="status" ---
  // SaveIndicator renders <span role="status" aria-live="polite" aria-atomic="true">.
  // Scope to headerRegion to avoid ambiguity with LoadingSkeleton's role="status"
  // (strict mode would fail if skeleton is still mounted during the check).
  const statusEl = headerRegion.getByRole('status');
  await expect(statusEl).toBeVisible({ timeout: 3_000 });

  // Verify aria-live and aria-atomic attributes on the status element.
  await expect(statusEl).toHaveAttribute('aria-live', 'polite');
  await expect(statusEl).toHaveAttribute('aria-atomic', 'true');

  // --- AC-041: Nav buttons have aria-keyshortcuts ---
  // "Dia anterior" button (goToPrev).
  const prevButton = page.getByRole('button', { name: /Dia anterior/i });
  await expect(prevButton).toBeVisible({ timeout: 3_000 });

  const prevShortcuts = await prevButton.getAttribute('aria-keyshortcuts');
  expect(
    prevShortcuts,
    'AC-006 FAIL: "Dia anterior" button missing aria-keyshortcuts',
  ).toBeTruthy();

  // "Próximo dia" button (goToNext).
  const nextButton = page.getByRole('button', { name: /Próximo dia/i });
  await expect(nextButton).toBeVisible({ timeout: 3_000 });

  const nextShortcuts = await nextButton.getAttribute('aria-keyshortcuts');
  expect(nextShortcuts, 'AC-006 FAIL: "Próximo dia" button missing aria-keyshortcuts').toBeTruthy();

  // No console errors.
  expect(
    consoleErrors,
    `AC-006 FAIL: console.error(s) detected:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
});
