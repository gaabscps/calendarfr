/**
 * Public types for the priorities feature.
 *
 * Priority is re-exported from @calendarfr/shared — single source of truth.
 * PrioritiesTuple is the client-side narrowed type: exactly 3 slots, readonly.
 * EMPTY_PRIORITY is the canonical empty slot value.
 */

export type { Priority } from '@calendarfr/shared';

import type { Priority } from '@calendarfr/shared';

/**
 * A readonly 3-tuple of Priority — the fixed structure of the daily top-3.
 * Using a tuple (not Priority[]) enforces exactly-3 at compile time.
 * Covers AC-011.
 */
export type PrioritiesTuple = readonly [Priority, Priority, Priority];

/**
 * Canonical empty slot value. id: "" signals the slot has never been edited.
 * Exported so consumers (useDailyPage in FEAT-005) can construct the initial value.
 * Covers AC-003, AC-010.
 */
export const EMPTY_PRIORITY: Priority = { id: '', text: '', done: false };
