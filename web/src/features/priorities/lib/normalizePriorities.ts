/**
 * normalizePriorities — defensive normalisation for priority arrays arriving
 * from server payloads or serialised state.
 *
 * Covers: AC-012, AC-015.
 *
 * Rules:
 * - If value is not an array or is empty → return [EMPTY_PRIORITY] and warn.
 * - If an item does not match Priority shape, drop it and warn.
 * - After filtering, if the result is empty → return [EMPTY_PRIORITY].
 * - Do NOT pad to any fixed size — return what's there (≥1 item).
 *
 * Pure function — no side effects beyond console.warn.
 */

import type { Priority } from '@calendarfr/shared';
import { ulid } from 'ulid';

import { EMPTY_PRIORITY } from '../types.js';

/** Type-guard: checks whether a value has the Priority shape. */
function isPriority(v: unknown): v is Priority {
  if (v === null || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.id === 'string' && typeof obj.text === 'string' && typeof obj.done === 'boolean'
  );
}

/**
 * Normalises an unknown value to a valid Priority[].
 *
 * Emits console.warn ONLY when the normalisation actually changes the input.
 */
export function normalizePriorities(value: unknown): Priority[] {
  // Case 1: not an array
  if (!Array.isArray(value)) {
    console.warn(
      '[priorities] normalizePriorities: expected an array, got',
      typeof value,
      '— falling back to 1 empty slot.',
    );
    return [{ ...EMPTY_PRIORITY, id: ulid() }];
  }

  // Case 2: empty array
  if (value.length === 0) {
    console.warn(
      '[priorities] normalizePriorities: received empty array — falling back to 1 empty slot.',
    );
    return [{ ...EMPTY_PRIORITY, id: ulid() }];
  }

  // Validate each item, dropping invalids with a warning
  const validated: Priority[] = [];
  for (let idx = 0; idx < value.length; idx++) {
    const item: unknown = value[idx];
    if (isPriority(item)) {
      validated.push(item);
    } else {
      console.warn(
        `[priorities] normalizePriorities: item at index ${idx} has invalid shape — dropping item.`,
        item,
      );
    }
  }

  // Case 3: all items were invalid
  if (validated.length === 0) {
    return [{ ...EMPTY_PRIORITY, id: ulid() }];
  }

  // AC-014: every returned item must have a non-empty id so React keys are
  // stable from mount — prevents editor remount on first keystroke.
  return validated.map((p) => (p.id !== '' ? p : { ...p, id: ulid() }));
}
