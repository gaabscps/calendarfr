/**
 * usePriorities — thin hook managing id stability and immutable updates for
 * the fixed 3-slot priority list.
 *
 * Covers: AC-001, AC-002, AC-004, AC-007, AC-020.
 *
 * Contract:
 * - Receives (value: PrioritiesTuple, onChange: (next: PrioritiesTuple) => void).
 * - Returns { items, onChangeText, onToggleDone, onChangeItem }.
 * - No internal state, no async effects, no fetch.
 *
 * ULID id-stability rules:
 * - If slot.id === "" at the time of mutation, generate a ULID once and bake it
 *   into the emitted value. Subsequent mutations on that slot see the id already
 *   set (id !== "") and preserve it.
 * - Handlers are stable references (useCallback). items is memoised (useMemo).
 */

import type { Priority } from '@calendarfr/shared';
import { useCallback, useMemo } from 'react';
import { ulid } from 'ulid';

import { normalizePriorities } from '../lib/normalizePriorities.js';
import type { PrioritiesTuple } from '../types.js';

export interface UsePrioritiesReturn {
  /** Normalised, memoised view of the current value. */
  items: PrioritiesTuple;
  /**
   * Update the text of a slot. If slot.id === "", generates a ULID first.
   * Preserves done. Covers AC-001, AC-002, AC-004.
   */
  onChangeText: (index: number, html: string) => void;
  /**
   * Toggle done for a slot. If slot.id === "", generates a ULID first.
   * Preserves text. Covers AC-005, AC-007.
   */
  onToggleDone: (index: number) => void;
  /**
   * Generic partial update for a slot. Applies id-stability rule.
   * Covers AC-020.
   */
  onChangeItem: (index: number, partial: Partial<Priority>) => void;
}

/** Produces a new stable id: reuses existing if non-empty, else generates ULID. */
function resolveId(existingId: string): string {
  return existingId !== '' ? existingId : ulid();
}

/**
 * Builds a new PrioritiesTuple by replacing the slot at `index`.
 * items is guaranteed to be a valid 3-tuple from normalizePriorities.
 */
function replaceSlot(items: PrioritiesTuple, index: number, next: Priority): PrioritiesTuple {
  return items.map(
    (slot, i): Priority => (i === index ? next : slot),
  ) as unknown as PrioritiesTuple;
}

export function usePriorities(
  value: PrioritiesTuple,
  onChange: (next: PrioritiesTuple) => void,
): UsePrioritiesReturn {
  // Normalise on every render but memo-gate so downstream only re-renders
  // if the resulting tuple reference changes (i.e. value itself changed).
  const items = useMemo(() => normalizePriorities(value), [value]);

  const onChangeText = useCallback(
    (index: number, html: string) => {
      const slot = items[index as 0 | 1 | 2] ?? { id: '', text: '', done: false };
      const id = resolveId(slot.id);
      onChange(replaceSlot(items, index, { id, text: html, done: slot.done }));
    },
    [items, onChange],
  );

  const onToggleDone = useCallback(
    (index: number) => {
      const slot = items[index as 0 | 1 | 2] ?? { id: '', text: '', done: false };
      const id = resolveId(slot.id);
      onChange(replaceSlot(items, index, { id, text: slot.text, done: !slot.done }));
    },
    [items, onChange],
  );

  const onChangeItem = useCallback(
    (index: number, partial: Partial<Priority>) => {
      const slot = items[index as 0 | 1 | 2] ?? { id: '', text: '', done: false };
      // AC-002 invariant: once a slot has a non-empty id, it is immutable.
      // Caller-supplied id is only honored to seed an empty slot.
      const id = slot.id !== '' ? slot.id : partial.id && partial.id !== '' ? partial.id : ulid();
      const merged: Priority = {
        id,
        text: partial.text ?? slot.text,
        done: partial.done ?? slot.done,
      };
      onChange(replaceSlot(items, index, merged));
    },
    [items, onChange],
  );

  return { items, onChangeText, onToggleDone, onChangeItem };
}
