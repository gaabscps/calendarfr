/**
 * normalizeAgenda — defensive normalisation for agenda arrays arriving from
 * server payloads or serialised state.
 *
 * Covers: AC-008.
 *
 * Rules:
 * - If value is not an array, return EMPTY_AGENDA and warn.
 * - Fix items with invalid shape (non-object, missing/wrong-type fields):
 *   replace with {hour: H, text: ""} for the expected hour at that position,
 *   or mark for removal so missing hours can be filled.
 * - Sort by hour, fill missing hours with {hour: H, text: ""}, truncate excess.
 * - Emit console.warn ONCE only when normalisation actually changes the input
 *   (silent pass-through for a valid 18-slot array in order).
 *
 * Pure function — no side effects beyond console.warn.
 */

import type { AgendaSlot } from '@calendarfr/shared';

import { AGENDA_HOURS, EMPTY_AGENDA, type AgendaSlots } from '../types.js';

/** Type-guard: checks whether a value has the AgendaSlot shape with valid hour. */
function isAgendaSlot(v: unknown): v is AgendaSlot {
  if (v === null || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.hour === 'number' &&
    Number.isInteger(obj.hour) &&
    obj.hour >= 6 &&
    obj.hour <= 23 &&
    typeof obj.text === 'string'
  );
}

/**
 * Normalises an unknown value to a valid AgendaSlots tuple (readonly 18-element
 * array with hours 6..23 in order).
 *
 * Emits console.warn ONCE only when normalisation actually changes the input.
 */
export function normalizeAgenda(value: unknown): AgendaSlots {
  // Case 1: not an array
  if (!Array.isArray(value)) {
    console.warn(
      '[agenda] normalizeAgenda: expected an array, got',
      typeof value,
      '— falling back to EMPTY_AGENDA.',
    );
    return EMPTY_AGENDA;
  }

  let needsNormalization = false;

  // Collect valid slots (items with correct AgendaSlot shape and hour in range)
  // Items with invalid shape are dropped (hours re-filled below).
  const validSlots: AgendaSlot[] = [];
  for (const item of value as unknown[]) {
    if (isAgendaSlot(item)) {
      validSlots.push(item);
    } else {
      // Invalid item — needs normalization
      needsNormalization = true;
    }
  }

  // Build a map: hour → AgendaSlot (last write wins for duplicate hours)
  const byHour = new Map<number, AgendaSlot>();
  for (const slot of validSlots) {
    byHour.set(slot.hour, slot);
  }

  // Check if we need normalization: wrong count or any hour missing/extra
  if (validSlots.length !== 18) {
    needsNormalization = true;
  } else {
    // Check ordering and completeness
    for (let i = 0; i < AGENDA_HOURS.length; i++) {
      if (validSlots[i]?.hour !== AGENDA_HOURS[i]) {
        needsNormalization = true;
        break;
      }
    }
  }

  if (!needsNormalization) {
    // Fast path: input is already a valid 18-slot array in order
    return value as unknown as AgendaSlots;
  }

  console.warn(
    '[agenda] normalizeAgenda: input does not match expected 18-slot structure (hours 6..23 in order) — normalising.',
  );

  // Build the canonical 18-slot array
  const result: AgendaSlot[] = AGENDA_HOURS.map((hour) => {
    const existing = byHour.get(hour);
    if (existing !== undefined) {
      // Preserve text; coerce to string if somehow not (defensive)
      return { hour, text: typeof existing.text === 'string' ? existing.text : '' };
    }
    return { hour, text: '' };
  });

  return result as unknown as AgendaSlots;
}
