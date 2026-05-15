/**
 * energy.spec.ts — Hour Energy persistence roundtrip.
 *
 * Prerequisites (start before running):
 *   Terminal 1: npm run dev:web    (Vite on localhost:3000)
 *   Terminal 2: npm run dev:server (Fastify on localhost:3003)
 *
 * Or simply: npm run dev (starts both)
 *
 * Run: npx playwright test --project=real e2e/real/energy.spec.ts
 *
 * Scope: verifies that EnergyButton selections persist via PUT /api/days/:date.
 * Uses fixture date 2099-12-31 with cleanup in beforeAll + afterAll.
 */

import { expect, test } from '@playwright/test';

import { attachConsoleErrorCapture } from '../_helpers/console-errors.js';
import { cleanupDay } from '../_helpers/cleanup.js';
import { waitForCompanion } from '../_helpers/server-ready.js';

// Fixture date far in the future — no collision with real user data.
const TEST_DATE = '2099-12-31';

let companionReady = true;

test.beforeAll(async () => {
  try {
    await waitForCompanion();
  } catch {
    companionReady = false;
  }
  // Clean up any stale data from previous runs so each test starts from a
  // known state (no pre-existing energy values on the fixture date).
  if (companionReady) {
    await cleanupDay(TEST_DATE);
  }
});

test.afterAll(async () => {
  await cleanupDay(TEST_DATE);
});

test('escolher emoji da paleta persiste após reload', async ({ page }) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }

  const consoleErrors = attachConsoleErrorCapture(page);

  await page.goto(`/?date=${TEST_DATE}`);

  // Wait for app to settle — scope to header region to avoid ambiguity with
  // LoadingSkeleton's role="status" briefly present during initial load.
  const headerRegion = page.getByRole('region', { name: /Cabeçalho do dia/i });
  const saveIndicator = headerRegion.getByRole('status');
  await expect(saveIndicator).toBeVisible({ timeout: 5_000 });
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Open EnergyButton for hour 14 — aria-label: "Definir energy da hora 14"
  const energyBtn = page.getByRole('button', { name: /Definir energy da hora 14/i });
  await expect(energyBtn).toBeVisible();
  await energyBtn.click();

  // Pick "Em chamas" (🔥) from the palette — aria-label: "Em chamas"
  await page.getByRole('menuitemradio', { name: /Em chamas/i }).click();

  // Button label changes to "Energy da hora 14: 🔥"
  const setBtn = page.getByRole('button', { name: /Energy da hora 14/i });
  await expect(setBtn).toHaveText('🔥');

  // Wait for autosave to settle.
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Reload and verify persistence.
  await page.reload();
  await expect(saveIndicator).toBeVisible({ timeout: 5_000 });
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Emoji must still be shown after reload.
  await expect(page.getByRole('button', { name: /Energy da hora 14/i })).toHaveText('🔥');

  expect(consoleErrors, `console.error(s) detected:\n${consoleErrors.join('\n')}`).toHaveLength(0);
});

test('clique direito limpa energy e persiste após reload', async ({ page }) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }

  const consoleErrors = attachConsoleErrorCapture(page);

  await page.goto(`/?date=${TEST_DATE}`);

  const headerRegion = page.getByRole('region', { name: /Cabeçalho do dia/i });
  const saveIndicator = headerRegion.getByRole('status');
  await expect(saveIndicator).toBeVisible({ timeout: 5_000 });
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Setup: define energy em 15h via palette — pick "Focado" (🎯)
  const setBtn = page.getByRole('button', { name: /Definir energy da hora 15/i });
  await expect(setBtn).toBeVisible();
  await setBtn.click();
  await page.getByRole('menuitemradio', { name: /Focado/i }).click();

  // Verify energy is set — button label: "Energy da hora 15: 🎯"
  const activeBtn = page.getByRole('button', { name: /Energy da hora 15/i });
  await expect(activeBtn).toHaveText('🎯');
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Right-click clears energy — onContextMenu calls onChange(null)
  await activeBtn.click({ button: 'right' });

  // Button reverts to "Definir energy da hora 15" (energy cleared)
  const clearedBtn = page.getByRole('button', { name: /Definir energy da hora 15/i });
  await expect(clearedBtn).toBeVisible();

  // Wait for autosave to settle then reload.
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });
  await page.reload();
  await expect(saveIndicator).toBeVisible({ timeout: 5_000 });
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Energy must remain cleared after reload.
  await expect(page.getByRole('button', { name: /Definir energy da hora 15/i })).toBeVisible();

  expect(consoleErrors, `console.error(s) detected:\n${consoleErrors.join('\n')}`).toHaveLength(0);
});
