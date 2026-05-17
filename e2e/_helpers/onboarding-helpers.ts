/**
 * onboarding-helpers.ts — Reusable selectors and actions for onboarding E2E specs.
 *
 * All selectors prefer semantic ARIA locators first; data-testid is used only
 * where ARIA is insufficient. Where testids are absent from the production
 * component, ARIA alternatives are provided with a comment documenting the
 * follow-up addition needed (tagged: TODO-TESTID).
 */

import type { Locator, Page } from '@playwright/test';

const STORAGE_KEY = 'calendarfr.onboarding.state';

// ── Types ──────────────────────────────────────────────────────────────────────

export type MissionId =
  | 'M-INTENTION'
  | 'M-MOOD'
  | 'M-PRIORITY'
  | 'M-FORMAT'
  | 'M-CHECK'
  | 'M-WRITE'
  | 'M-GRATITUDE'
  | 'M-NAVIGATE';

export interface PartialOnboardingState {
  status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  missionsCompleted?: Partial<Record<MissionId, string | null>>;
  completedAt?: string | null;
  completedOnDate?: string | null;
}

export type MissionIdV2 =
  | 'M-INTENTION'
  | 'M-MOOD'
  | 'M-PRIORITY'
  | 'M-FORMAT'
  | 'M-CHECK'
  | 'M-WRITE'
  | 'M-GRATITUDE';

export interface PartialOnboardingStateV2 {
  status?: 'pending' | 'in_progress' | 'completed' | 'dismissed';
  progressByDate?: Partial<Record<string, Partial<Record<MissionIdV2, string | null>>>>;
  completedAt?: string | null;
  completedOnDate?: string | null;
}

// ── State helpers ─────────────────────────────────────────────────────────────

const ALL_MISSION_IDS: MissionId[] = [
  'M-INTENTION',
  'M-MOOD',
  'M-PRIORITY',
  'M-FORMAT',
  'M-CHECK',
  'M-WRITE',
  'M-GRATITUDE',
  'M-NAVIGATE',
];

/**
 * Removes the onboarding state from localStorage and reloads the page.
 * Ensures the component initializes from scratch (pending state, AC-001).
 */
export async function clearOnboardingState(page: Page): Promise<void> {
  await page.evaluate((key) => {
    // Runs in browser context — localStorage is available.
    globalThis.localStorage.removeItem(key);
  }, STORAGE_KEY);
  await page.reload();
}

/**
 * Merges `partial` into the current persisted OnboardingState (or a fresh
 * initial state if absent) then reloads the page.
 *
 * Useful for pre-seeding specific mission progress without navigating through
 * the full UI flow (e.g., testing persistence after 3 missions).
 */
export async function setOnboardingState(
  page: Page,
  partial: PartialOnboardingState,
): Promise<void> {
  await page.evaluate(
    ({ key, partialStr, missionIds }) => {
      // Runs in browser context — globalThis.localStorage is available.
      const store = globalThis.localStorage;
      const defaultMissions: Record<string, string | null> = Object.fromEntries(
        missionIds.map((id: string) => [id, null]),
      );
      let base: Record<string, unknown>;
      try {
        const raw = store.getItem(key);
        base = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
      } catch {
        base = {};
      }
      const partialState = JSON.parse(partialStr) as Record<string, unknown>;
      const baseMissions = (base.missionsCompleted ?? {}) as Record<string, unknown>;
      const partialMissions = (partialState.missionsCompleted ?? {}) as Record<string, unknown>;
      const merged = {
        schemaVersion: 1,
        status: 'in_progress',
        completedAt: null,
        completedOnDate: null,
        ...base,
        ...partialState,
        missionsCompleted: { ...defaultMissions, ...baseMissions, ...partialMissions },
      };
      store.setItem(key, JSON.stringify(merged));
    },
    { key: STORAGE_KEY, partialStr: JSON.stringify(partial), missionIds: ALL_MISSION_IDS },
  );
  await page.reload();
}

/**
 * Sets a v2 onboarding state in localStorage and reloads the page.
 *
 * Use for FEAT-028 E2E tests that need per-date progress.
 */
export async function setOnboardingStateV2(
  page: Page,
  partial: PartialOnboardingStateV2,
): Promise<void> {
  await page.evaluate(
    ({ key, partialStr }) => {
      const store = globalThis.localStorage;
      const partialState = JSON.parse(partialStr) as Record<string, unknown>;
      const base = {
        schemaVersion: 2,
        status: 'in_progress',
        progressByDate: {},
        completedAt: null,
        completedOnDate: null,
      };
      let existing: Record<string, unknown> = {};
      try {
        const raw = store.getItem(key);
        if (raw) existing = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        existing = {};
      }
      const merged = {
        ...base,
        ...existing,
        ...partialState,
        progressByDate: {
          ...(typeof (existing.progressByDate ?? null) === 'object' &&
          existing.progressByDate != null
            ? (existing.progressByDate as Record<string, unknown>)
            : {}),
          ...(typeof (partialState.progressByDate ?? null) === 'object' &&
          partialState.progressByDate != null
            ? (partialState.progressByDate as Record<string, unknown>)
            : {}),
        },
        schemaVersion: 2,
      };
      store.setItem(key, JSON.stringify(merged));
    },
    { key: STORAGE_KEY, partialStr: JSON.stringify(partial) },
  );
  await page.reload();
}

// ── Locators ──────────────────────────────────────────────────────────────────

/**
 * Returns the Locator for the quest sticky-note region.
 *
 * Primary: role="region" with aria-label matching "Roteiro".
 * The OnboardingQuest component passes ariaLabel="Roteiro do diário, N de 8 missões"
 * to QuestSticky which sets role="region" + aria-label (AC-001, NFR-002).
 *
 * TODO-TESTID: Adding data-testid="onboarding-quest" to QuestSticky.tsx would
 * provide a more stable selector independent of the aria-label wording.
 */
export function getQuestSticky(page: Page): Locator {
  return page.getByRole('region', { name: /Roteiro/i });
}

/**
 * Returns the Locator for a specific mission's quest-seal element.
 *
 * The QuestItem renders each mission as a listitem with aria-label "<label>, <status>".
 * The QuestSeal span has data-testid="quest-seal" (QuestSeal.tsx).
 *
 * TODO-TESTID: Adding data-testid={`quest-seal-${missionId}`} to QuestSeal.tsx
 * would make this selector label-wording-independent.
 */
export function getMissionSeal(page: Page, missionId: MissionId): Locator {
  const missionLabels: Record<MissionId, string> = {
    'M-INTENTION': 'Defina a intenção do dia',
    'M-MOOD': 'Escolha seu humor',
    'M-PRIORITY': 'Anote uma prioridade',
    'M-FORMAT': 'Use a barra flutuante (negrito/itálico)',
    'M-CHECK': 'Marque uma prioridade como feita',
    'M-WRITE': 'Escreva na agenda ou em notas',
    'M-GRATITUDE': 'Registre uma linha de gratidão',
    'M-NAVIGATE': 'Vire a página (vá a outro dia)',
  };
  const label = missionLabels[missionId];
  return page
    .getByRole('listitem', { name: new RegExp(label, 'i') })
    .locator('[data-testid="quest-seal"]');
}

/**
 * Returns the Locator for the CompletionStamp component.
 *
 * Primary: data-testid="completion-stamp" (set on the container div in CompletionStamp.tsx).
 * Fallback for reduced-motion variant: data-testid="stamp-reduced-wrapper".
 */
export function getCompletionStamp(page: Page): Locator {
  return page.locator('[data-testid="completion-stamp"], [data-testid="stamp-reduced-wrapper"]');
}

/**
 * Returns the Locator for the CompletedDayDecor component.
 *
 * Primary: data-testid="washi-left" (rendered by WashiTape inside CompletedDayDecor).
 * The decor wrapper itself is aria-hidden; using a child testid is more stable.
 */
export function getCompletedDayDecor(page: Page): Locator {
  return page.locator('[data-testid="washi-left"]');
}
