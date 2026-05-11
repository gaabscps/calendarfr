/**
 * autosave-roundtrip.spec.ts — AC-002, AC-003: Edit priority → autosave → reload → persisted.
 *
 * Prerequisites (start before running):
 *   Terminal 1: npm run dev:web    (Vite on localhost:3000)
 *   Terminal 2: npm run dev:server (Fastify on localhost:3003)
 *
 * Or simply: npm run dev  (starts both)
 *
 * Run: npx playwright test --project=real e2e/real/autosave-roundtrip.spec.ts
 *
 * Design decision — date used:
 *   Uses fixture date 2099-12-31 via `?date=` URL param (App.tsx reads it).
 *   This ensures no collision with real user data (NFR-002 isolation).
 *   The day file is cleaned up in afterAll.
 */

import { expect, test } from '@playwright/test';

import { attachConsoleErrorCapture } from '../_helpers/console-errors.js';
import { cleanupDay, readDayFile } from '../_helpers/cleanup.js';
import { waitForCompanion } from '../_helpers/server-ready.js';
import type { DayPayload } from '../_helpers/payload.js';

// Fixture date far in the future — no collision with real user data.
const TEST_DATE = '2099-12-31';

// Unique marker — short enough to fit in a priority single-line editor.
// Includes a timestamp to survive concurrent test runs on the same machine.
const EDITED_TEXT = `e2e-autosave-${Date.now()}`;

let companionReady = true;

test.beforeAll(async () => {
  try {
    await waitForCompanion();
  } catch {
    companionReady = false;
  }
});

test.afterAll(async () => {
  await cleanupDay(TEST_DATE);
});

test('AC-002: edit priority slot, wait for "Salvo" indicator, reload, text persists', async ({
  page,
}) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }

  const consoleErrors = attachConsoleErrorCapture(page);

  await page.goto(`/?date=${TEST_DATE}`);

  // Wait for app to finish loading data (save indicator shows "Salvo" on fresh load).
  // Scope to the header region to avoid ambiguity with LoadingSkeleton's role="status"
  // (which is also present briefly during initial load — strict mode would fail otherwise).
  const headerRegion = page.getByRole('region', { name: /Cabeçalho do dia/i });
  const saveIndicator = headerRegion.getByRole('status');
  await expect(saveIndicator).toBeVisible({ timeout: 5_000 });

  // Wait for "Salvo" to confirm data is loaded and no pending save.
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Locate the first priority editor (contenteditable).
  // PriorityItem renders a RichTextLine which is a contenteditable div.
  const priorityEditor = page.locator('[contenteditable="true"]').first();
  await expect(priorityEditor).toBeVisible({ timeout: 3_000 });

  // Click to focus, select all, type the unique text.
  await priorityEditor.click();
  // Select all existing content and replace with EDITED_TEXT.
  await page.keyboard.press('ControlOrMeta+A');
  await page.keyboard.type(EDITED_TEXT);

  // Wait for save indicator to show in-progress state then settle to "Salvo".
  // Regex covers both "Editando…" and "Salvando…" transitions; final state is "Salvo".
  // (FE-L-MINOR-2: skip fragile intermediate assertion — final "Salvo" is the source of truth.)
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  // Reload page and verify text persists (AC-002).
  await page.reload();
  await expect(saveIndicator).toBeVisible({ timeout: 5_000 });
  await expect(saveIndicator).toHaveText('Salvo', { timeout: 5_000 });

  const persistedEditor = page.locator('[contenteditable="true"]').first();
  await expect(persistedEditor).toContainText(EDITED_TEXT, { timeout: 3_000 });

  // No console errors during the entire flow (SC-003).
  expect(
    consoleErrors,
    `AC-002 FAIL: console.error(s) detected:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
});

test('AC-003: filesystem assertion — data/days/<date>.json contains edited text', async () => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }

  // This test depends on AC-002 having run and created the file.
  // In Playwright, tests in the same file run sequentially by default.
  const dayData = await readDayFile(TEST_DATE);

  expect(
    dayData,
    `AC-003 FAIL: data/days/${TEST_DATE}.json was not created by the companion server.`,
  ).not.toBeNull();

  // Verify the edited text is present in priorities[0].text.
  // The app sends the full Tiptap HTML; the raw text will be inside a <p> tag.
  const data = dayData as DayPayload;
  const p0text = data.priorities?.[0]?.text ?? '';

  expect(
    p0text,
    `AC-003 FAIL: priorities[0].text="${p0text}" does not contain "${EDITED_TEXT}". ` +
      `Full data: ${JSON.stringify(dayData)}`,
  ).toContain(EDITED_TEXT);
});
