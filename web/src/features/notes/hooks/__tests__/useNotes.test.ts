/**
 * Unit tests for useNotes — basics: mount, onAdd, justAddedIdRef, prefix integrity.
 *
 * Sister files: useNotes.mutations.test.ts (onRemove/onChangeText/onCyclePrefix),
 * useNotes.stability.test.ts (handler stability + race safety).
 */

import type { Note, NotePrefix } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { useNotes } from '../useNotes.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeNote(overrides?: Partial<Note>): Note {
  return { id: 'id-1', prefix: '•', text: '', ...overrides };
}

/** Checks whether a string looks like a valid ULID (26 chars, Crockford base32). */
function isUlid(s: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(s);
}

describe('useNotes — basics', () => {
  it('does not call onChange on mount', () => {
    const onChange = jest.fn();
    renderHook(() => useNotes([], onChange));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('exposes justAddedIdRef initialised to null', () => {
    const { result } = renderHook(() => useNotes([], jest.fn()));
    expect(result.current.justAddedIdRef.current).toBeNull();
  });
});

// ── onAdd ─────────────────────────────────────────────────────────────────
describe('onAdd', () => {
  it('emits onChange with new note appended at end', () => {
    const onChange = jest.fn();
    const existing = makeNote({ id: 'existing', prefix: '→', text: 'hello' });
    const { result } = renderHook(() => useNotes([existing], onChange));

    act(() => {
      result.current.onAdd();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toBe(existing); // first note unchanged by reference
  });

  it('new note has prefix "•" and text ""', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([], onChange));

    act(() => {
      result.current.onAdd();
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    const newNote = emitted[0]!;
    expect(newNote.prefix).toBe('•');
    expect(newNote.text).toBe('');
  });

  it('new note id is a valid ULID (AC-002)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([], onChange));

    act(() => {
      result.current.onAdd();
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    const newNote = emitted[0]!;
    expect(isUlid(newNote.id)).toBe(true);
  });

  it('populates justAddedIdRef.current synchronously before onChange fires', () => {
    const capturedIds: (string | null)[] = [];
    const onChange = jest.fn().mockImplementation(() => {
      // Capture justAddedIdRef at the moment onChange fires
      capturedIds.push(result.current.justAddedIdRef.current);
    });

    const { result } = renderHook(() => useNotes([], onChange));

    act(() => {
      result.current.onAdd();
    });

    expect(capturedIds).toHaveLength(1);
    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(capturedIds[0]).toBe(emitted[0]!.id);
    expect(isUlid(capturedIds[0]!)).toBe(true);
  });

  it('two sequential onAdd calls generate distinct ULIDs', () => {
    const onChange = jest.fn();
    let value: Note[] = [];

    const { result, rerender } = renderHook(
      ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
      { initialProps: { v: value, cb: onChange } },
    );

    // First add
    act(() => {
      result.current.onAdd();
    });
    const firstEmit = onChange.mock.calls[0]?.[0] as Note[];
    value = firstEmit;
    rerender({ v: value, cb: onChange });

    // Second add
    act(() => {
      result.current.onAdd();
    });
    const secondEmit = onChange.mock.calls[1]?.[0] as Note[];

    expect(secondEmit).toHaveLength(2);
    const id1 = firstEmit[0]!.id;
    const id2 = secondEmit[1]!.id;
    expect(id1).not.toBe(id2);
    expect(isUlid(id1)).toBe(true);
    expect(isUlid(id2)).toBe(true);
    // justAddedIdRef must hold the SECOND id, not the first.
    expect(result.current.justAddedIdRef.current).toBe(id2);
  });

  it('emitted array is a new reference', () => {
    const onChange = jest.fn();
    const value: Note[] = [];
    const { result } = renderHook(() => useNotes(value, onChange));

    act(() => {
      result.current.onAdd();
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted).not.toBe(value);
  });
});

// ── onRemove ──────────────────────────────────────────────────────────────
describe('justAddedIdRef', () => {
  it('is null initially', () => {
    const { result } = renderHook(() => useNotes([], jest.fn()));
    expect(result.current.justAddedIdRef.current).toBeNull();
  });

  it('is set after onAdd fires', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([], onChange));

    act(() => {
      result.current.onAdd();
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(result.current.justAddedIdRef.current).toBe(emitted[0]!.id);
  });

  it('does NOT auto-clear on re-render — consumer must clear', () => {
    // Consumer-clears contract: after BATCH-B's autoFocus useEffect sets
    // justAddedIdRef.current = null, the hook must not re-set it on subsequent
    // re-renders that don't call onAdd. Without this, stale ids would bleed.
    const onChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
      { initialProps: { v: [] as Note[], cb: onChange } },
    );

    act(() => {
      result.current.onAdd();
    });
    const id = result.current.justAddedIdRef.current;
    expect(id).not.toBeNull();

    // Simulate the consumer clearing the ref (e.g., in a useEffect after
    // applying autoFocus to the matching NoteItem).
    result.current.justAddedIdRef.current = null;

    // Re-render with the new value — without a fresh onAdd.
    const newValue = onChange.mock.calls[0]?.[0] as Note[];
    rerender({ v: newValue, cb: onChange });

    // Hook must not "remember" the old id; ref stays null.
    expect(result.current.justAddedIdRef.current).toBeNull();
  });
});

// ── prefix cycle: all 4 starting prefixes advance to the expected next ──
describe('prefix cycle integrity', () => {
  it.each<[NotePrefix, NotePrefix]>([
    ['•', '→'],
    ['→', '—'],
    ['—', '★'],
    ['★', '•'],
  ])('cycling %s advances to %s', (start, expectedNext) => {
    const note = makeNote({ id: `n-${start}`, prefix: start });
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([note], onChange));

    act(() => {
      result.current.onCyclePrefix(`n-${start}`);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted[0]!.prefix).toBe(expectedNext);
  });
});
