/**
 * useAgenda — thin hook managing immutable updates for the fixed 18-slot
 * agenda timeline.
 *
 * Covers: AC-001, AC-003, AC-004, AC-019, AC-021, AC-026.
 *
 * Contract:
 * - Receives (value: AgendaSlots, onChange: (next: AgendaSlots) => void).
 * - Returns { onChangeText }.
 * - No internal state, no async effects, no fetch.
 *
 * NFR-002 (referential preservation):
 *   When emitting, the 17 untouched slots are referencially identical to
 *   the input slots. value.map((s, i) => s.hour === hour ? {...s, text: html} : s)
 *   uses identity for unchanged elements — verified in tests via Object.is().
 *
 * Stale-closure safety:
 *   `value` is held in a ref updated synchronously during render so that
 *   `onChangeText` always reads the latest committed value at call time.
 *   The handler closes over the ref (stable), not over `value` directly,
 *   so it remains referentially stable across re-renders driven by `value`
 *   changes — eliminating the deferred-effect race that arises with the
 *   "latest-ref" pattern around batched updates in React 19.
 */

import { useCallback, useRef } from 'react';

import type { AgendaSlots } from '../types.js';

export interface UseAgendaReturn {
  /**
   * Update the text of a slot identified by `hour`.
   * Emits onChange with the updated AgendaSlots; the 17 other slots are
   * referencially identical to the input (for React.memo compatibility).
   * Covers AC-001, AC-003, AC-004, NFR-002.
   */
  onChangeText: (hour: number, html: string) => void;
}

/**
 * Hook for agenda slot text updates.
 *
 * @param value - Current controlled agenda slots (18-tuple).
 * @param onChange - Called with the next AgendaSlots when a slot changes.
 */
export function useAgenda(
  value: AgendaSlots,
  onChange: (next: AgendaSlots) => void,
): UseAgendaReturn {
  // Track the latest value AND onChange in refs, updated synchronously each
  // render. The returned `onChangeText` then closes only over the (stable)
  // refs, so it has permanent identity for the lifetime of the hook —
  // bullet-proof against parents that pass inline callbacks.
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const onChangeText = useCallback((hour: number, html: string) => {
    const current = valueRef.current;

    // Guard: silently ignore out-of-range hours (no spurious onChange).
    const matches = current.some((s) => s.hour === hour);
    if (!matches) return;

    // map preserves identity for unchanged slots (NFR-002):
    //   - slots where s.hour !== hour: return `s` (same reference)
    //   - the matching slot: return a new object with updated text
    const next = current.map((s) =>
      s.hour === hour ? { ...s, text: html } : s,
    ) as unknown as AgendaSlots;
    onChangeRef.current(next);
  }, []);

  return { onChangeText };
}
