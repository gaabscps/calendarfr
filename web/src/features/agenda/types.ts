/**
 * Public types for the agenda feature.
 *
 * AgendaSlot is re-exported from @calendarfr/shared — single source of truth.
 * The shared type uses `hour: number` (not a literal union) to stay portable
 * across server and client. We declare AgendaHour locally as a narrowed
 * literal union for compile-time slot-count enforcement.
 *
 * Design decision (MADR):
 *   @calendarfr/shared#AgendaSlot has `hour: number` — broad enough for the
 *   server (validated at runtime via zod). On the client side, we narrow hour
 *   to the literal union 6|7|…|23 and encode the 18-slot constraint as a
 *   readonly tuple. AgendaHour is therefore declared locally; AgendaSlot itself
 *   is re-exported from shared to avoid type drift.
 *
 * Covers: AC-005, AC-006, AC-007.
 */

export type { AgendaSlot } from '@calendarfr/shared';

import type { AgendaSlot } from '@calendarfr/shared';

/**
 * Literal union of valid agenda hours.
 * Exactly the 18 integer hours in [6, 23] — matches server zod constraint.
 * Covers AC-005.
 */
export type AgendaHour =
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23;

/**
 * Readonly 18-tuple of AgendaSlot — the fixed daily agenda structure.
 * Using a tuple (not AgendaSlot[]) enforces exactly-18 at compile time.
 * Covers AC-007.
 */
export type AgendaSlots = readonly [
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
  AgendaSlot,
];

/**
 * The canonical "empty day" agenda — 18 slots with empty text, hours 6..23.
 * Object.freeze'd to prevent accidental mutation.
 * Exported for consumers (daily-page orchestrator) to initialise state.
 * Covers AC-003, AC-008.
 */
export const AGENDA_HOURS: readonly AgendaHour[] = [
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23,
];

export const EMPTY_AGENDA: AgendaSlots = Object.freeze([
  { hour: 6, text: '', energy: null },
  { hour: 7, text: '', energy: null },
  { hour: 8, text: '', energy: null },
  { hour: 9, text: '', energy: null },
  { hour: 10, text: '', energy: null },
  { hour: 11, text: '', energy: null },
  { hour: 12, text: '', energy: null },
  { hour: 13, text: '', energy: null },
  { hour: 14, text: '', energy: null },
  { hour: 15, text: '', energy: null },
  { hour: 16, text: '', energy: null },
  { hour: 17, text: '', energy: null },
  { hour: 18, text: '', energy: null },
  { hour: 19, text: '', energy: null },
  { hour: 20, text: '', energy: null },
  { hour: 21, text: '', energy: null },
  { hour: 22, text: '', energy: null },
  { hour: 23, text: '', energy: null },
]) as unknown as AgendaSlots;
