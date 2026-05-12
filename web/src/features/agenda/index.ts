/**
 * Public surface of the agenda feature.
 *
 * This is the ONLY import point for external consumers (regra inviolável #1).
 * Components (Agenda, AgendaSlot) will be added in BATCH-B.
 *
 * Covers: AC-019, AC-020, AC-022.
 *
 * Constraints enforced here:
 * - No re-export of anything from @tiptap (delegated to rich-text-line barrel).
 * - No re-export of anything from other domain features (priorities, notes, mood).
 */

// Types — `AgendaSlot` (type from @calendarfr/shared) is exported as
// `AgendaSlotData` to avoid clashing with the React component below
// (AC-020 allows renaming on conflict). `AgendaSlot` in JSX is the component.
export type { AgendaSlot as AgendaSlotData, AgendaSlots, AgendaHour } from './types.js';
export { EMPTY_AGENDA } from './types.js';

// Components (BATCH-B)
export { Agenda } from './components/Agenda.js';
export { AgendaSlot } from './components/AgendaSlot.js';
export type { AgendaSlotProps } from './components/AgendaSlot.js';

// Hook
export { useAgenda } from './hooks/useAgenda.js';
export type { UseAgendaReturn } from './hooks/useAgenda.js';

// NOTE: useCurrentHour is internal to Agenda and intentionally NOT exported.

// Lib (exported for consumers that need display helpers)
export { formatHourLabel, formatHourAriaLabel } from './lib/formatHour.js';
export { getCurrentAgendaHour } from './lib/currentHour.js';
export { normalizeAgenda } from './lib/normalizeAgenda.js';
