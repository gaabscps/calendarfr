/**
 * normalizePriorities — defensive normalisation for priority arrays arriving
 * from server payloads or serialised state.
 *
 * Covers: AC-012.
 *
 * Rules:
 * - If value is not an array, return 3 EMPTY_PRIORITY and warn.
 * - If length !== 3, truncate excess / fill missing with EMPTY_PRIORITY and warn.
 * - If an item does not match Priority shape, replace with EMPTY_PRIORITY and warn.
 * - If the input is already a valid 3-tuple, return it as-is (no warn, no copy).
 *
 * Pure function — no side effects beyond console.warn.
 */

import type { Priority } from '@calendarfr/shared';

import { EMPTY_PRIORITY, type PrioritiesTuple } from '../types.js';

/** Type-guard: checks whether a value has the Priority shape. */
function isPriority(v: unknown): v is Priority {
  if (v === null || typeof v !== 'object') return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj.id === 'string' && typeof obj.text === 'string' && typeof obj.done === 'boolean'
  );
}

/**
 * Normalises an unknown value to a valid PrioritiesTuple.
 *
 * Emits console.warn ONLY when the normalisation actually changes the input
 * (i.e. silent pass-through for a valid tuple).
 */
export function normalizePriorities(value: unknown): PrioritiesTuple {
  const TARGET_LENGTH = 3 as const;

  // Case 1: not an array
  if (!Array.isArray(value)) {
    console.warn(
      '[priorities] normalizePriorities: expected an array, got',
      typeof value,
      '— falling back to 3 empty slots.',
    );
    return [EMPTY_PRIORITY, EMPTY_PRIORITY, EMPTY_PRIORITY];
  }

  // Validate each item and collect results
  const validated: Priority[] = (value as unknown[]).map((item, idx) => {
    if (isPriority(item)) return item;
    console.warn(
      `[priorities] normalizePriorities: item at index ${idx} has invalid shape — falling back to EMPTY_PRIORITY.`,
      item,
    );
    return EMPTY_PRIORITY;
  });

  // Case 2: wrong length — needs truncation or padding
  if (validated.length !== TARGET_LENGTH) {
    const padded: Priority[] = Array.from({ length: TARGET_LENGTH }, (_, i) => {
      return validated[i] ?? EMPTY_PRIORITY;
    });

    console.warn(
      `[priorities] normalizePriorities: expected array of length 3, got ${String(validated.length)} — normalised to 3 slots.`,
    );

    return padded as unknown as PrioritiesTuple;
  }

  // At this point length === 3 and all items are valid Priority objects.
  // If there were any item fallbacks, we already warned above. Return the tuple.
  return validated as unknown as PrioritiesTuple;
}
