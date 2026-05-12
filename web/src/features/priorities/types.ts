/**
 * Public types for the priorities feature.
 *
 * Priority is re-exported from @calendarfr/shared — single source of truth.
 * PrioritiesTuple is the client-side dynamic type: a variable-length Priority[].
 * EMPTY_PRIORITY is the canonical empty slot value.
 */

export type { Priority } from '@calendarfr/shared';

import type { Priority } from '@calendarfr/shared';

/**
 * A dynamic list of Priority items (1–10 items).
 * Covers AC-012, AC-015.
 */
export type PrioritiesTuple = Priority[];

/**
 * Canonical empty slot value. id: "" signals the slot has never been edited.
 * Exported so consumers (useDailyPage in FEAT-005) can construct the initial value.
 * Covers AC-010.
 */
export const EMPTY_PRIORITY: Priority = { id: '', text: '', done: false };

/**
 * Default initial priorities list — a single empty slot.
 * Covers AC-015.
 */
export const INITIAL_PRIORITIES: PrioritiesTuple = [{ ...EMPTY_PRIORITY }];
