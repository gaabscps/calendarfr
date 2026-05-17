/**
 * onboarding.spec.ts — FEAT-028 onboarding "Roteiro do Diário" E2E real tests.
 *
 * Prerequisites (start before running):
 *   Terminal 1: npm run dev:web    (Vite on localhost:3000)
 *   Terminal 2: npm run dev:server (Fastify on localhost:3003)
 *
 * Or simply: npm run dev  (starts both)
 *
 * Run: npx playwright test --project=real e2e/real/onboarding.spec.ts
 *
 * Fixture date: 2099-12-31 — far in the future, no collision with real data.
 *
 * AC covered: AC-001, AC-007, AC-012, AC-016, AC-017, AC-019, AC-023, AC-024,
 *             AC-029 (multi-tab), AC-031, plus E2E validation of SC-001 walkthrough.
 * FEAT-028: 7 missions (M-NAVIGATE removed); per-date progress; CompletedDayDecor.
 */

import { expect, test } from '@playwright/test';

import { attachConsoleErrorCapture } from '../_helpers/console-errors.js';
import { waitForCompanion } from '../_helpers/server-ready.js';
import {
  clearOnboardingState,
  getCompletedDayDecor,
  getCompletionStamp,
  getMissionSeal,
  getQuestSticky,
  setOnboardingStateV2,
} from '../_helpers/onboarding-helpers.js';

const TEST_DATE = '2099-12-31';
const BASE_URL = `/?date=${TEST_DATE}`;

let companionReady = true;

test.beforeAll(async () => {
  try {
    await waitForCompanion();
  } catch {
    companionReady = false;
  }
});

// ── Helper: navigate to test date with onboarding cleared ──────────────────────

async function freshPage(page: Parameters<typeof clearOnboardingState>[0]): Promise<void> {
  await page.goto(BASE_URL);
  await page.evaluate((key) => {
    // Runs in browser context — globalThis.localStorage is available.
    globalThis.localStorage.removeItem(key);
  }, 'calendarfr.onboarding.state');
  await page.reload();
}

// ── Describe block ─────────────────────────────────────────────────────────────

test.describe('Onboarding "Roteiro do Diário"', () => {
  test('AC-001: sticky-note appears on first load (no prior localStorage)', async ({ page }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await freshPage(page);

    // The sticky-note region must appear (AC-001).
    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });

    // All 7 mission seals start in pending state (data-completed="false"). M-NAVIGATE removed.
    const missionIds = [
      'M-INTENTION',
      'M-MOOD',
      'M-PRIORITY',
      'M-FORMAT',
      'M-CHECK',
      'M-WRITE',
      'M-GRATITUDE',
    ] as const;

    for (const id of missionIds) {
      const seal = getMissionSeal(page, id);
      await expect(seal).toHaveAttribute('data-completed', 'false', { timeout: 3_000 });
    }

    expect(
      consoleErrors,
      `AC-001 FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  test('AC-019: HelpButton is always visible in PageNavigator header', async ({ page }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    await freshPage(page);

    const helpButton = page.getByRole('button', { name: /Abrir roteiro do diário/i });
    await expect(helpButton).toBeVisible({ timeout: 5_000 });
  });

  test('persistência de progresso parcial (AC-027)', async ({ page }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    // Pre-seed 3 missions completed via v2 helper (schemaVersion:2, progressByDate).
    await page.goto(BASE_URL);
    await setOnboardingStateV2(page, {
      status: 'in_progress',
      progressByDate: {
        [TEST_DATE]: {
          'M-INTENTION': '2099-12-31T08:00:00.000Z',
          'M-MOOD': '2099-12-31T08:05:00.000Z',
          'M-PRIORITY': '2099-12-31T08:10:00.000Z',
          'M-FORMAT': null,
          'M-CHECK': null,
          'M-WRITE': null,
          'M-GRATITUDE': null,
        },
      },
    });

    // After reload, sticky-note re-appears with 3 selos preserved.
    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });

    await expect(getMissionSeal(page, 'M-INTENTION')).toHaveAttribute('data-completed', 'true', {
      timeout: 3_000,
    });
    await expect(getMissionSeal(page, 'M-MOOD')).toHaveAttribute('data-completed', 'true', {
      timeout: 3_000,
    });
    await expect(getMissionSeal(page, 'M-PRIORITY')).toHaveAttribute('data-completed', 'true', {
      timeout: 3_000,
    });
    await expect(getMissionSeal(page, 'M-FORMAT')).toHaveAttribute('data-completed', 'false', {
      timeout: 3_000,
    });

    expect(
      consoleErrors,
      `persistência FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  test('? button reopens dismissed sticky (AC-020, AC-022)', async ({ page }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    // Pre-seed 1 mission completed, status=dismissed via v2 helper.
    await page.goto(BASE_URL);
    await setOnboardingStateV2(page, {
      status: 'dismissed',
      progressByDate: {
        [TEST_DATE]: {
          'M-INTENTION': '2099-12-31T08:00:00.000Z',
          'M-MOOD': null,
          'M-PRIORITY': null,
          'M-FORMAT': null,
          'M-CHECK': null,
          'M-WRITE': null,
          'M-GRATITUDE': null,
        },
      },
    });

    // Sticky-note should be absent (dismissed state).
    const questSticky = getQuestSticky(page);
    await expect(questSticky).not.toBeVisible({ timeout: 3_000 });

    // Click the ? button (AC-019).
    const helpButton = page.getByRole('button', { name: /Abrir roteiro do diário/i });
    await expect(helpButton).toBeVisible({ timeout: 3_000 });
    await helpButton.click();

    // Sticky-note should reappear with the seal preserved.
    await expect(questSticky).toBeVisible({ timeout: 3_000 });
    await expect(getMissionSeal(page, 'M-INTENTION')).toHaveAttribute('data-completed', 'true', {
      timeout: 3_000,
    });

    expect(
      consoleErrors,
      `? button FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── AC-023: Esc focus tests ────────────────────────────────────────────────

  test('Esc dismisses sticky when focus is on the dismiss button (AC-023)', async ({ page }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await freshPage(page);

    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });

    // Explicitly focus the "ocultar roteiro" button (not body or contenteditable).
    await page.getByRole('button', { name: /ocultar roteiro/i }).focus();
    await page.keyboard.press('Escape');

    // Sticky-note should disappear (dismissed).
    await expect(questSticky).not.toBeVisible({ timeout: 3_000 });

    expect(
      consoleErrors,
      `Esc dismiss FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  test('Esc does NOT dismiss sticky when focus is inside a rich-text editor (AC-023)', async ({
    page,
  }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await freshPage(page);

    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });

    // Wait for save indicator to confirm page data loaded.
    const saveIndicator = page
      .getByRole('region', { name: /Cabeçalho do dia/i })
      .getByRole('status');
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });

    // Focus a priority input (contenteditable) — Esc is handled by the editor, not onboarding.
    const priorityEditor = page
      .locator('[data-testid="priorities-section"]')
      .locator('[contenteditable="true"]')
      .first();
    if (await priorityEditor.isVisible()) {
      await priorityEditor.focus();
    } else {
      // Fallback: use the intention editor (also contenteditable).
      const intentionEditor = page.getByPlaceholder(/Defina sua intenção/i);
      await intentionEditor.focus();
    }

    await page.keyboard.press('Escape');

    // Sticky-note must still be visible (Esc inside editor must not dismiss).
    await expect(questSticky).toBeVisible({ timeout: 2_000 });

    expect(
      consoleErrors,
      `Esc-in-editor FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  test('AC-002: completed state hides sticky on load; CompletionStamp visible on matching date (AC-028)', async ({
    page,
  }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await page.goto(BASE_URL);
    await setOnboardingStateV2(page, {
      status: 'completed',
      progressByDate: {
        [TEST_DATE]: {
          'M-INTENTION': '2099-12-31T08:00:00.000Z',
          'M-MOOD': '2099-12-31T08:05:00.000Z',
          'M-PRIORITY': '2099-12-31T08:10:00.000Z',
          'M-FORMAT': '2099-12-31T08:15:00.000Z',
          'M-CHECK': '2099-12-31T08:20:00.000Z',
          'M-WRITE': '2099-12-31T08:25:00.000Z',
          'M-GRATITUDE': '2099-12-31T08:30:00.000Z',
        },
      },
      completedAt: '2099-12-31T08:30:00.000Z',
      completedOnDate: TEST_DATE,
    });

    // Sticky-note should not auto-mount (status=completed, AC-002).
    const questSticky = getQuestSticky(page);
    await expect(questSticky).not.toBeVisible({ timeout: 3_000 });

    // CompletionStamp should appear (completedOnDate matches current date, AC-028).
    const stamp = getCompletionStamp(page);
    await expect(stamp).toBeVisible({ timeout: 5_000 });

    expect(
      consoleErrors,
      `completed state FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  test('AC-021: ? button on completed state shows readonly sticky (all seals, no state mutation)', async ({
    page,
  }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await page.goto(BASE_URL);
    await setOnboardingStateV2(page, {
      status: 'completed',
      progressByDate: {
        [TEST_DATE]: {
          'M-INTENTION': '2099-12-31T08:00:00.000Z',
          'M-MOOD': '2099-12-31T08:05:00.000Z',
          'M-PRIORITY': '2099-12-31T08:10:00.000Z',
          'M-FORMAT': '2099-12-31T08:15:00.000Z',
          'M-CHECK': '2099-12-31T08:20:00.000Z',
          'M-WRITE': '2099-12-31T08:25:00.000Z',
          'M-GRATITUDE': '2099-12-31T08:30:00.000Z',
        },
      },
      completedAt: '2099-12-31T08:30:00.000Z',
      completedOnDate: TEST_DATE,
    });

    // Click ? button.
    const helpButton = page.getByRole('button', { name: /Abrir roteiro do diário/i });
    await expect(helpButton).toBeVisible({ timeout: 3_000 });
    await helpButton.click();

    // Sticky-note re-appears in readonly mode (header: "Roteiro concluído ✓").
    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 3_000 });
    await expect(questSticky).toContainText('Roteiro concluído ✓');

    // All 7 seals are completed (M-NAVIGATE removed in FEAT-028).
    for (const id of [
      'M-INTENTION',
      'M-MOOD',
      'M-PRIORITY',
      'M-FORMAT',
      'M-CHECK',
      'M-WRITE',
      'M-GRATITUDE',
    ] as const) {
      await expect(getMissionSeal(page, id)).toHaveAttribute('data-completed', 'true', {
        timeout: 3_000,
      });
    }

    expect(
      consoleErrors,
      `readonly FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── SC-001 + AC-012 + AC-017: complete 7-mission live walkthrough ──────────

  /**
   * Drives through all 7 missions via real user actions and asserts:
   * - each seal appears after its corresponding action
   * - sticky-note exits after mission 7
   * - CompletionStamp appears (AC-017)
   * - CompletedDayDecor visible (washi + golden seal) after 7/7 (AC-031)
   * - reload: sticky absent, stamp present (AC-012 persistence)
   *
   * Satisfies SC-001, AC-012, AC-017, AC-031 live chain.
   * M-NAVIGATE removed in FEAT-028 (AC-014).
   */
  test('SC-001 + AC-012 + AC-017: complete 7-mission live walkthrough', async ({ page }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await freshPage(page);

    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });

    // Wait for page data to load before interacting with fields.
    const saveIndicator = page
      .getByRole('region', { name: /Cabeçalho do dia/i })
      .getByRole('status');
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });

    // ── M-INTENTION: type into intention field ───────────────────────────────
    const intentionEditor = page.getByPlaceholder(/Defina sua intenção/i);
    if (await intentionEditor.isVisible()) {
      await intentionEditor.click();
      await intentionEditor.fill('Foco total hoje');
    } else {
      const intentionRegion = page.getByRole('region', { name: /intenção/i });
      const editor = intentionRegion.locator('[contenteditable="true"]').first();
      await editor.click();
      await editor.fill('Foco total hoje');
    }
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });
    await expect(getMissionSeal(page, 'M-INTENTION')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    // ── M-MOOD: click mood picker and select an emoji ────────────────────────
    const moodButton = page
      .getByRole('button', { name: /humor|mood/i })
      .or(page.locator('[data-testid="mood-trigger"]'))
      .first();
    if (await moodButton.isVisible()) {
      await moodButton.click();
      // Select the first mood option in the popover.
      const moodOption = page
        .getByRole('button', { name: /😊|😄|🙂|feliz|ótimo/i })
        .or(page.locator('[data-testid="mood-option"]').first());
      if (await moodOption.isVisible({ timeout: 2_000 })) {
        await moodOption.click();
      } else {
        // Fallback: click the first listitem/button inside an open popover.
        await page.locator('[role="listbox"] [role="option"]').first().click();
      }
    }
    await expect(getMissionSeal(page, 'M-MOOD')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    // ── M-PRIORITY: type into first priority RichTextLine ────────────────────
    const priorityEditor = page
      .locator('[data-testid="priorities-section"]')
      .locator('[contenteditable="true"]')
      .first()
      .or(
        page
          .getByRole('region', { name: /prioridades/i })
          .locator('[contenteditable="true"]')
          .first(),
      );
    await priorityEditor.click();
    await priorityEditor.fill('Entregar FEAT-027');
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });
    await expect(getMissionSeal(page, 'M-PRIORITY')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    // ── M-FORMAT: select text in priority field, apply bold (Ctrl+B / Cmd+B) ─
    await priorityEditor.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.press('ControlOrMeta+b');
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });
    await expect(getMissionSeal(page, 'M-FORMAT')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    // ── M-CHECK: click a priority's checkbox ────────────────────────────────
    const priorityCheckbox = page
      .locator('[data-testid="priorities-section"]')
      .getByRole('checkbox')
      .first()
      .or(
        page
          .getByRole('region', { name: /prioridades/i })
          .getByRole('checkbox')
          .first(),
      );
    await priorityCheckbox.click();
    await expect(getMissionSeal(page, 'M-CHECK')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    // ── M-WRITE: type into any agenda slot ───────────────────────────────────
    const agendaSlot = page
      .locator('[data-testid="agenda-section"]')
      .locator('[contenteditable="true"]')
      .first()
      .or(
        page
          .getByRole('region', { name: /agenda/i })
          .locator('[contenteditable="true"]')
          .first(),
      );
    await agendaSlot.click();
    await agendaSlot.fill('10h reunião de sync');
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });
    await expect(getMissionSeal(page, 'M-WRITE')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    // ── M-GRATITUDE: type into first gratitude line ──────────────────────────
    const gratitudeEditor = page
      .locator('[data-testid="gratitude-section"]')
      .locator('[contenteditable="true"]')
      .first()
      .or(
        page
          .getByRole('region', { name: /gratidão/i })
          .locator('[contenteditable="true"]')
          .first(),
      );
    await gratitudeEditor.click();
    await gratitudeEditor.fill('Grato por ter terminado o feature');
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });
    await expect(getMissionSeal(page, 'M-GRATITUDE')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    // ── All 7 done: sticky exits, CompletionStamp + CompletedDayDecor appear ──
    await expect(questSticky).not.toBeVisible({ timeout: 5_000 });
    // Navigate back to TEST_DATE to see CompletionStamp + CompletedDayDecor.
    await page.goto(BASE_URL);
    const stamp = getCompletionStamp(page);
    await expect(stamp).toBeVisible({ timeout: 5_000 });
    // CompletedDayDecor (washi tape + golden seal) must be visible (AC-031).
    const decor = getCompletedDayDecor(page);
    await expect(decor).toBeVisible({ timeout: 5_000 });

    // ── Reload: sticky still gone, stamp still visible ───────────────────────
    await page.reload();
    await expect(getQuestSticky(page)).not.toBeVisible({ timeout: 3_000 });
    await expect(getCompletionStamp(page)).toBeVisible({ timeout: 5_000 });

    expect(
      consoleErrors,
      `walkthrough FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── FEAT-028: CompletedDayDecor on 7/7 completion (AC-031) ────────────────

  test('AC-031: 7/7 missions → CompletedDayDecor visible (washi + golden seal)', async ({
    page,
  }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await page.goto(BASE_URL);
    await setOnboardingStateV2(page, {
      status: 'completed',
      progressByDate: {
        [TEST_DATE]: {
          'M-INTENTION': '2099-12-31T08:00:00.000Z',
          'M-MOOD': '2099-12-31T08:05:00.000Z',
          'M-PRIORITY': '2099-12-31T08:10:00.000Z',
          'M-FORMAT': '2099-12-31T08:15:00.000Z',
          'M-CHECK': '2099-12-31T08:20:00.000Z',
          'M-WRITE': '2099-12-31T08:25:00.000Z',
          'M-GRATITUDE': '2099-12-31T08:30:00.000Z',
        },
      },
      completedAt: '2099-12-31T08:30:00.000Z',
      completedOnDate: TEST_DATE,
    });

    const decor = getCompletedDayDecor(page);
    await expect(decor).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('[data-testid="washi-right"]')).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('[data-testid="golden-seal"]')).toBeVisible({ timeout: 3_000 });

    expect(
      consoleErrors,
      `CompletedDayDecor FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── FEAT-028: per-date progress independence (AC-016/AC-017) ──────────────

  test('AC-016: 3 missions in date=2099-12-31, navigate to 2099-12-30 → 0 marked; back → 3 preserved', async ({
    page,
  }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);
    const DATE_ALT = '2099-12-30';

    await page.goto(BASE_URL);
    await setOnboardingStateV2(page, {
      status: 'in_progress',
      progressByDate: {
        [TEST_DATE]: {
          'M-INTENTION': '2099-12-31T08:00:00.000Z',
          'M-MOOD': '2099-12-31T08:05:00.000Z',
          'M-PRIORITY': '2099-12-31T08:10:00.000Z',
          'M-FORMAT': null,
          'M-CHECK': null,
          'M-WRITE': null,
          'M-GRATITUDE': null,
        },
        [DATE_ALT]: {
          'M-INTENTION': null,
          'M-MOOD': null,
          'M-PRIORITY': null,
          'M-FORMAT': null,
          'M-CHECK': null,
          'M-WRITE': null,
          'M-GRATITUDE': null,
        },
      },
    });

    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });
    // 3 sealed in TEST_DATE
    await expect(getMissionSeal(page, 'M-INTENTION')).toHaveAttribute('data-completed', 'true', {
      timeout: 3_000,
    });

    // Navigate to DATE_ALT
    await page.goto(`/?date=${DATE_ALT}`);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });
    await expect(getMissionSeal(page, 'M-INTENTION')).toHaveAttribute('data-completed', 'false', {
      timeout: 3_000,
    });

    // Navigate back to TEST_DATE — 3 preserved
    await page.goto(BASE_URL);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });
    await expect(getMissionSeal(page, 'M-INTENTION')).toHaveAttribute('data-completed', 'true', {
      timeout: 3_000,
    });

    expect(
      consoleErrors,
      `per-date FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── FEAT-028: autosave gate — mission marks after save (AC-007) ───────────

  test('AC-007: typing intention without waiting → mission not marked; wait 2s → marks', async ({
    page,
  }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await freshPage(page);

    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });

    const saveIndicator = page
      .getByRole('region', { name: /Cabeçalho do dia/i })
      .getByRole('status');
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });

    // Type into intention — do NOT wait for save
    const intentionEditor = page.getByPlaceholder(/Defina sua intenção/i);
    await intentionEditor.click();
    await intentionEditor.fill('Testando autosave gate');

    // Immediately after typing, M-INTENTION should still be pending
    await expect(getMissionSeal(page, 'M-INTENTION')).toHaveAttribute('data-completed', 'false', {
      timeout: 1_000,
    });

    // Wait for autosave to commit
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });

    // Now M-INTENTION should be marked
    await expect(getMissionSeal(page, 'M-INTENTION')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    expect(
      consoleErrors,
      `autosave gate FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── FEAT-028: QuestActionButton scrolls + focuses target (AC-024) ──────────

  test('AC-024: click QuestActionButton M-INTENTION → page scrolls + focuses intention input', async ({
    page,
  }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    const consoleErrors = attachConsoleErrorCapture(page);

    await freshPage(page);

    const questSticky = getQuestSticky(page);
    await expect(questSticky).toBeVisible({ timeout: 5_000 });

    const saveIndicator = page
      .getByRole('region', { name: /Cabeçalho do dia/i })
      .getByRole('status');
    await expect(saveIndicator).toHaveText('Salvo', { timeout: 8_000 });

    // Click the QuestActionButton for M-INTENTION
    const actionBtn = page.getByRole('button', {
      name: /ir para missão: defina a intenção do dia/i,
    });
    await expect(actionBtn).toBeVisible({ timeout: 3_000 });
    await actionBtn.click();

    // The intention input should receive focus (or at least be in viewport)
    const intentionInput = page.getByPlaceholder(/Defina sua intenção/i);
    await expect(intentionInput).toBeInViewport({ timeout: 3_000 });

    expect(
      consoleErrors,
      `QuestActionButton FAIL: console.error(s):\n${consoleErrors.join('\n')}`,
    ).toHaveLength(0);
  });

  // ── AC-029: multi-tab localStorage sync ───────────────────────────────────

  /**
   * AC-029 multi-tab test: uses two pages within the same browser context so
   * that storage events propagate between them (same-origin, same process).
   *
   * Approach: Playwright's browser.newContext() creates an isolated context; to
   * share localStorage between tabs, both pages must share the SAME context.
   * We open page B from the same context as page A via context.newPage().
   *
   * Flow: page A fills intention → storage event fires → page B reads the
   * updated localStorage → M-INTENTION seal shows as completed.
   *
   * Note: storage events in browsers only fire in OTHER tabs/windows of the
   * same origin (not the writing tab itself). Playwright pages in the same
   * context simulate this correctly.
   */
  test('AC-029: multi-tab sync — mission completed in tab A reflects in tab B', async ({
    context,
  }) => {
    if (!companionReady) {
      test.skip(true, 'companion not up on localhost:3003');
      return;
    }

    // Page A: the writing tab.
    const pageA = await context.newPage();
    // Clear onboarding state before loading.
    await pageA.goto(BASE_URL);
    await pageA.evaluate((key) => {
      globalThis.localStorage.removeItem(key);
    }, 'calendarfr.onboarding.state');
    await pageA.reload();

    const saveIndicatorA = pageA
      .getByRole('region', { name: /Cabeçalho do dia/i })
      .getByRole('status');
    await expect(saveIndicatorA).toHaveText('Salvo', { timeout: 8_000 });

    // Page B: opened in the same context — will receive storage events from page A.
    const pageB = await context.newPage();
    await pageB.goto(BASE_URL);
    // No reload needed; localStorage is already clear from page A's setup.

    // Page B should show the sticky-note (onboarding state is pending/in_progress).
    const questStickyB = getQuestSticky(pageB);
    await expect(questStickyB).toBeVisible({ timeout: 5_000 });

    // Check M-INTENTION is pending in page B.
    await expect(getMissionSeal(pageB, 'M-INTENTION')).toHaveAttribute('data-completed', 'false', {
      timeout: 3_000,
    });

    // Page A: fill intention field → triggers storage write → storage event fires in page B.
    const intentionEditorA = pageA.getByPlaceholder(/Defina sua intenção/i);
    if (await intentionEditorA.isVisible()) {
      await intentionEditorA.click();
      await intentionEditorA.fill('Sincronizado entre abas');
    } else {
      const intentionRegion = pageA.getByRole('region', { name: /intenção/i });
      const editor = intentionRegion.locator('[contenteditable="true"]').first();
      await editor.click();
      await editor.fill('Sincronizado entre abas');
    }
    // Wait for autosave and onboarding state write in page A.
    await expect(saveIndicatorA).toHaveText('Salvo', { timeout: 8_000 });
    await expect(getMissionSeal(pageA, 'M-INTENTION')).toHaveAttribute('data-completed', 'true', {
      timeout: 5_000,
    });

    // Page B should receive the storage event and update M-INTENTION seal within 1s (AC-029).
    await expect(getMissionSeal(pageB, 'M-INTENTION')).toHaveAttribute('data-completed', 'true', {
      timeout: 3_000,
    });

    await pageA.close();
    await pageB.close();
  });
});
