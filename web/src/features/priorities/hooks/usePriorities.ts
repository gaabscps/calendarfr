/**
 * usePriorities — thin hook managing id stability and immutable updates for
 * the dynamic priority list (1–10 items).
 *
 * Covers: AC-001, AC-002, AC-004, AC-007, AC-011, AC-020.
 *
 * Contract:
 * - Receives (value: Priority[], onChange: (next: Priority[]) => void).
 * - Returns { items, onChangeText, onToggleDone, onChangeItem, addPriority, removePriority }.
 * - No internal state, no async effects, no fetch.
 *
 * ULID id-stability rules:
 * - If slot.id === "" at the time of mutation, generate a ULID once and bake it
 *   into the emitted value. Subsequent mutations on that slot see the id already
 *   set (id !== "") and preserve it.
 * - addPriority emits a new item with an eagerly assigned ULID so the React key
 *   is stable from mount — prevents editor remount on first keystroke (AC-014).
 * - Handlers are stable references (useCallback). items is memoised (useMemo).
 */

import type { Priority } from '@calendarfr/shared';
import { useCallback, useMemo } from 'react';
import { ulid } from 'ulid';

import { normalizePriorities } from '../lib/normalizePriorities.js';

export interface UsePrioritiesReturn {
  /** Normalised, memoised view of the current value. */
  items: Priority[];
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
  /**
   * Append a new empty slot (id: "", text: "", done: false).
   * No-op if items.length >= 10. Covers AC-011.
   */
  addPriority: () => void;
  /**
   * Remove the slot at the given index.
   * No-op if items.length <= 1 (minimum 1 item). Covers AC-010, AC-011.
   */
  removePriority: (index: number) => void;
}

/** Produces a new stable id: reuses existing if non-empty, else generates ULID. */
function resolveId(existingId: string): string {
  return existingId !== '' ? existingId : ulid();
}

export function usePriorities(
  value: Priority[],
  onChange: (next: Priority[]) => void,
): UsePrioritiesReturn {
  // Normalise on every render but memo-gate so downstream only re-renders
  // if the resulting array reference changes (i.e. value itself changed).
  const items = useMemo(() => normalizePriorities(value), [value]);

  const onChangeText = useCallback(
    (index: number, html: string) => {
      const slot = items[index] ?? { id: '', text: '', done: false };
      const id = resolveId(slot.id);
      onChange(items.map((s, i) => (i === index ? { id, text: html, done: slot.done } : s)));
    },
    [items, onChange],
  );

  const onToggleDone = useCallback(
    (index: number) => {
      const slot = items[index] ?? { id: '', text: '', done: false };
      const id = resolveId(slot.id);
      onChange(items.map((s, i) => (i === index ? { id, text: slot.text, done: !slot.done } : s)));
    },
    [items, onChange],
  );

  const onChangeItem = useCallback(
    (index: number, partial: Partial<Priority>) => {
      const slot = items[index] ?? { id: '', text: '', done: false };
      // AC-002 invariant: once a slot has a non-empty id, it is immutable.
      // When slot is empty, caller-supplied partial.id is honored as a seed;
      // resolveId generates a ULID if neither slot nor partial has a valid id.
      const seedId = slot.id !== '' ? slot.id : (partial.id ?? '');
      const updated: Priority = {
        ...slot,
        ...partial,
        id: resolveId(seedId),
      };
      onChange(items.map((s, i) => (i === index ? updated : s)));
    },
    [items, onChange],
  );

  const addPriority = useCallback(() => {
    if (items.length >= 10) return; // max 10
    // Assign ULID eagerly so the React key is stable from mount (AC-014).
    // Lazy assignment (id:'') would flip the key on first keystroke, remounting
    // the editor and losing focus mid-typing.
    onChange([...items, { id: ulid(), text: '', done: false }]);
  }, [items, onChange]);

  const removePriority = useCallback(
    (index: number) => {
      if (items.length <= 1) return; // min 1
      onChange(items.filter((_, i) => i !== index));
    },
    [items, onChange],
  );

  return { items, onChangeText, onToggleDone, onChangeItem, addPriority, removePriority };
}
