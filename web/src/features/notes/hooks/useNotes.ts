/**
 * useNotes — thin hook managing add/remove/edit/cyclePrefix for the dynamic
 * notes list. Uses the valueRef + onChangeRef pattern from FEAT-009 useAgenda
 * so all handlers are permanently stable (useCallback(fn, [])) and race-safe
 * against React 19 batched updates.
 *
 * Covers: AC-001 (onAdd ULID + append), AC-002 (ULID stable id), AC-005
 * (onChangeText referential preservation), AC-007 (id/prefix unchanged by
 * text edit), AC-008 (onCyclePrefix advances prefix), AC-009 (cycle preserves
 * id/text), AC-011 (onRemove filter), AC-013 (no orphan DOM node), AC-020
 * (no fetch/api imports), AC-025 (unit tests exist).
 *
 * Contract:
 * - Receives (value: Note[], onChange: (next: Note[]) => void).
 * - Returns { onAdd, onRemove, onChangeText, onCyclePrefix, justAddedIdRef }.
 * - No internal state for the array — purely controlled.
 * - No async effects, no fetch.
 */

import type { Note } from '@calendarfr/shared';
import { useCallback, useRef } from 'react';
// `@/shared/utils/id/createId.ts` is not present (Plan fallback path); usePriorities
// uses the same `ulid` package, keeping the ULID source consistent across features.
import { ulid } from 'ulid';

import { nextPrefix } from '../lib/prefixCycle.js';

export interface UseNotesReturn {
  /**
   * Appends a new note (id=ULID, prefix='•', text='') to the list.
   * Sets justAddedIdRef.current BEFORE calling onChange.
   * Covers AC-001, AC-002.
   */
  onAdd: () => void;

  /**
   * Removes the note with the given id via filter.
   * Preserves all other notes by reference.
   * Covers AC-011.
   */
  onRemove: (id: string) => void;

  /**
   * Updates only the `text` field of the matching note.
   * All other notes remain Object.is identical to their input.
   * Covers AC-005, AC-007.
   */
  onChangeText: (id: string, html: string) => void;

  /**
   * Advances the prefix of the matching note by one step in PREFIX_ORDER.
   * Preserves id and text.
   * Covers AC-008, AC-009.
   */
  onCyclePrefix: (id: string) => void;

  /**
   * Ref set to the newly-created note id synchronously inside onAdd, before
   * onChange fires. Consumer (Notes.tsx) reads this ref on the next render to
   * drive autoFocus on the matching NoteItem.
   * Covers AC-003 (via BATCH-B consumption).
   */
  justAddedIdRef: React.RefObject<string | null>;
}

export function useNotes(value: Note[], onChange: (next: Note[]) => void): UseNotesReturn {
  // ── Refs: always hold latest value and callback without closing over them ──
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);

  // Keep refs in sync on every render (before any handler fires)
  valueRef.current = value;
  onChangeRef.current = onChange;

  // Exposed to Notes.tsx so it knows which NoteItem to autoFocus after add.
  const justAddedIdRef = useRef<string | null>(null);

  // ── Handlers (stable — deps array is empty; read latest via refs) ──────────

  const onAdd = useCallback(() => {
    const newId = ulid();
    // Set ref BEFORE calling onChange so Notes.tsx can read it synchronously
    // on the next render after the parent commits the new value.
    justAddedIdRef.current = newId;
    const newNote: Note = { id: newId, prefix: '•', text: '' };
    onChangeRef.current([...valueRef.current, newNote]);
  }, []);

  const onRemove = useCallback((id: string) => {
    onChangeRef.current(valueRef.current.filter((n) => n.id !== id));
  }, []);

  const onChangeText = useCallback((id: string, html: string) => {
    onChangeRef.current(valueRef.current.map((n) => (n.id === id ? { ...n, text: html } : n)));
  }, []);

  const onCyclePrefix = useCallback((id: string) => {
    onChangeRef.current(
      valueRef.current.map((n) => (n.id === id ? { ...n, prefix: nextPrefix(n.prefix) } : n)),
    );
  }, []);

  return { onAdd, onRemove, onChangeText, onCyclePrefix, justAddedIdRef };
}
