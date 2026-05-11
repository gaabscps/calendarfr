/**
 * race-date-change.spec.ts — AC-007: Race condition: edit then immediately change date.
 *
 * Prerequisites (start before running):
 *   Terminal 1: npm run dev:web    (Vite on localhost:3000)
 *   Terminal 2: npm run dev:server (Fastify on localhost:3003)
 *
 * Or simply: npm run dev  (starts both)
 *
 * Run: npx playwright test --project=real e2e/real/race-date-change.spec.ts
 *
 * AC-007 scenario:
 *   1. User edits priority text on day D.
 *   2. BEFORE the 800ms debounce fires, user blurs editor and presses Cmd+ArrowRight.
 *   3. The app should flush the pending save for day D (flushSavePending via onBeforeChange).
 *   4. Network: ≥1 PUT to /api/days/DATE_D contains RACE_TEXT; zero PUTs to DATE_D1.
 *   5. data/days/<D>.json should contain the edited text.
 *   6. data/days/<D+1>.json should NOT contain the edited text.
 *
 * Design — dates used:
 *   D   = 2099-12-31 (fixture date via ?date= URL param — far from today for safety).
 *   D+1 = 2100-01-01 (one press of Cmd+ArrowRight from D).
 *   Both files are cleaned up in afterAll.
 *
 * retries: 2 — retained as belt-and-suspenders; the network assertion + blur sync
 *   make the test deterministic. Retries protect against rare DevTools protocol jitter.
 */

import { expect, test } from '@playwright/test';

import { attachConsoleErrorCapture } from '../_helpers/console-errors.js';
import { cleanupDay, readDayFile } from '../_helpers/cleanup.js';
import { modKey } from '../_helpers/dates.js';
import { waitForCompanion } from '../_helpers/server-ready.js';
import type { DayPayload } from '../_helpers/payload.js';

// retries: 2 — see module JSDoc for justification.
test.describe.configure({ retries: 2 });

// Fixture dates far in the future — no collision with real user data (NFR-002).
const DATE_D = '2099-12-31';
const DATE_D1 = '2100-01-01';
const RACE_TEXT = `e2e-race-${Date.now()}`;

let companionReady = true;

test.beforeAll(async () => {
  try {
    await waitForCompanion();
  } catch {
    companionReady = false;
  }
});

test.afterAll(async () => {
  await cleanupDay(DATE_D);
  await cleanupDay(DATE_D1);
});

test('AC-007: edit then immediately navigate — text saves to original date, not new date', async ({
  page,
}) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }

  const consoleErrors = attachConsoleErrorCapture(page);

  // Capture PUT requests to /api/days/* for network assertion (FE-L-MAJOR-3).
  const puts: Array<{ url: string; body: unknown }> = [];
  page.on('request', (req) => {
    if (req.method() === 'PUT' && req.url().includes('/api/days/')) {
      let body: unknown = {};
      try {
        body = JSON.parse(req.postData() ?? '{}') as unknown;
      } catch {
        /* ignore parse errors */
      }
      puts.push({ url: req.url(), body });
    }
  });

  // Navigate to fixture date D via ?date= URL param.
  await page.goto(`/?date=${DATE_D}`);

  // Wait for app to be in "Salvo" state (initial load complete, no pending edits).
  // Scope to the header region to avoid ambiguity with LoadingSkeleton's role="status"
  // (which is also present briefly during initial load — strict mode would fail otherwise).
  const headerRegion = page.getByRole('region', { name: /Cabeçalho do dia/i });
  const saveIndicator = headerRegion.getByRole('status');
  await expect(saveIndicator).toBeVisible({ timeout: 5_000 });
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Capture initial h1 text (the fixture date formatted in pt-BR).
  const h1 = page.locator('h1');
  const initialDateText = await h1.textContent();

  // Focus the first priority editor.
  const priorityEditor = page.locator('[contenteditable="true"]').first();
  await expect(priorityEditor).toBeVisible({ timeout: 3_000 });
  await priorityEditor.click();

  // Select all and type RACE_TEXT.
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(RACE_TEXT);

  // IMMEDIATELY trigger navigation — measure elapsed time to verify race window.
  // Blur editor first so isEditableTarget guard in usePageNavigation allows the keypress.
  // (FE-L-BLOCKER-2: keyboard nav is swallowed if contenteditable has focus.)
  const t0 = Date.now();
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement) el.blur();
  });

  // Press Cmd/Ctrl+ArrowRight — BEFORE the 800ms debounce fires.
  // flushSavePending fires synchronously via onBeforeChange before goToNext().
  const mod = modKey();
  await page.keyboard.press(`${mod}+ArrowRight`);

  // Assert we acted within the debounce window (800ms).
  expect(Date.now() - t0).toBeLessThan(800);

  // Wait for h1 to show D+1 (animation + load).
  await expect(h1).not.toHaveText(initialDateText!, { timeout: 3_000 });

  // Wait for "Salvo" to confirm everything persisted (flushSavePending resolved).
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // --- Network assertions (FE-L-MAJOR-3) ---
  // At least one PUT to DATE_D must contain RACE_TEXT in priorities.
  const putsToDateD = puts.filter((p) => p.url.endsWith(`/api/days/${DATE_D}`));
  const dataDHasRaceText = putsToDateD.some((p) => {
    const body = p.body as DayPayload;
    return (body.priorities ?? []).some((pr) => (pr.text ?? '').includes(RACE_TEXT));
  });
  expect(
    dataDHasRaceText,
    `AC-007 FAIL: no PUT to /api/days/${DATE_D} contained RACE_TEXT "${RACE_TEXT}". ` +
      `Captured PUTs: ${JSON.stringify(puts.map((p) => ({ url: p.url })))}`,
  ).toBe(true);

  // Zero PUTs to DATE_D1 should contain RACE_TEXT (text belongs to D only).
  const putsToDateD1WithRaceText = puts.filter((p) => {
    if (!p.url.endsWith(`/api/days/${DATE_D1}`)) return false;
    const body = p.body as DayPayload;
    return (body.priorities ?? []).some((pr) => (pr.text ?? '').includes(RACE_TEXT));
  });
  expect(
    putsToDateD1WithRaceText,
    `AC-007 FAIL: PUT(s) to /api/days/${DATE_D1} contained RACE_TEXT "${RACE_TEXT}" — ` +
      'the race text leaked into the wrong date.',
  ).toHaveLength(0);

  // --- Filesystem assertions (SC-004) ---

  // DATE_D: must contain RACE_TEXT in priorities[0].text.
  const dataDFile = await readDayFile(DATE_D);
  expect(
    dataDFile,
    `AC-007 FAIL: data/days/${DATE_D}.json was not created — flush did not fire.`,
  ).not.toBeNull();

  const dData = dataDFile as DayPayload;
  const p0text = dData.priorities?.[0]?.text ?? '';
  expect(
    p0text,
    `AC-007 FAIL: data/days/${DATE_D}.json priorities[0].text="${p0text}" does not contain "${RACE_TEXT}". ` +
      'flushSavePending may not have persisted the edit to the original date.',
  ).toContain(RACE_TEXT);

  // DATE_D+1: must NOT contain RACE_TEXT (text belongs to DATE_D only).
  const dataD1File = await readDayFile(DATE_D1);
  if (dataD1File !== null) {
    const d1Data = dataD1File as DayPayload;
    const allTexts = (d1Data.priorities ?? []).map((p) => p.text ?? '').join('');
    expect(
      allTexts,
      `AC-007 FAIL: data/days/${DATE_D1}.json contains "${RACE_TEXT}" — ` +
        'the race text leaked into the wrong date.',
    ).not.toContain(RACE_TEXT);
  }
  // If D+1 file doesn't exist, that's fine — lazy creation means no write until edited.

  // No console errors.
  expect(
    consoleErrors,
    `AC-007 FAIL: console.error(s) detected:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
});
