/**
 * Unit tests for useNotes — reorder mutation (AC-016, AC-017).
 *
 * Sister files: useNotes.test.ts (basics), useNotes.mutations.test.ts (add/remove/text).
 */

import type { Note } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { useNotes } from '../useNotes.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeNote(overrides?: Partial<Note>): Note {
  return { id: 'id-1', prefix: '•', text: '', ...overrides };
}

describe('useNotes — reorder (AC-016, AC-017)', () => {
  it('calls onChange with array reordered via arrayMove (AC-016)', () => {
    const n1 = makeNote({ id: 'n1', text: 'a' });
    const n2 = makeNote({ id: 'n2', text: 'b' });
    const n3 = makeNote({ id: 'n3', text: 'c' });
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([n1, n2, n3], onChange));

    act(() => {
      result.current.reorder(0, 2);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(3);
    expect(emitted[0]).toBe(n2);
    expect(emitted[1]).toBe(n3);
    expect(emitted[2]).toBe(n1);
  });

  it('moves item from end to beginning', () => {
    const n1 = makeNote({ id: 'n1' });
    const n2 = makeNote({ id: 'n2' });
    const n3 = makeNote({ id: 'n3' });
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([n1, n2, n3], onChange));

    act(() => {
      result.current.reorder(2, 0);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted[0]).toBe(n3);
    expect(emitted[1]).toBe(n1);
    expect(emitted[2]).toBe(n2);
  });

  it('from === to still calls onChange with same-order array', () => {
    const n1 = makeNote({ id: 'n1' });
    const n2 = makeNote({ id: 'n2' });
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([n1, n2], onChange));

    act(() => {
      result.current.reorder(0, 0);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted[0]).toBe(n1);
    expect(emitted[1]).toBe(n2);
  });

  it('reorder handler is stable across re-renders with different value (AC-017)', () => {
    const n1 = makeNote({ id: 'n1' });
    const onChange = jest.fn();

    const { result, rerender } = renderHook(
      ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
      { initialProps: { v: [] as Note[], cb: onChange } },
    );

    const firstReorder = result.current.reorder;
    rerender({ v: [n1], cb: onChange });

    expect(result.current.reorder).toBe(firstReorder);
  });

  it('reorder handler is stable across re-renders with different onChange (AC-017)', () => {
    const cb1 = jest.fn();
    const cb2 = jest.fn();
    const n1 = makeNote({ id: 'n1' });

    const { result, rerender } = renderHook(
      ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
      { initialProps: { v: [n1], cb: cb1 } },
    );

    const firstReorder = result.current.reorder;
    rerender({ v: [n1], cb: cb2 });

    expect(result.current.reorder).toBe(firstReorder);
  });

  it('reads latest value from valueRef at call time (race safety)', () => {
    const onChange = jest.fn();
    const n1 = makeNote({ id: 'n1' });
    const n2 = makeNote({ id: 'n2' });

    const { result, rerender } = renderHook(
      ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
      { initialProps: { v: [n1] as Note[], cb: onChange } },
    );

    const stableReorder = result.current.reorder;
    rerender({ v: [n1, n2], cb: onChange });

    act(() => {
      stableReorder(1, 0);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(2);
    expect(emitted[0]).toBe(n2);
    expect(emitted[1]).toBe(n1);
  });

  it('reorder(0, 1) on [A, B, C] produces [B, A, C] (AC-016)', () => {
    const nA = makeNote({ id: 'nA', text: 'A' });
    const nB = makeNote({ id: 'nB', text: 'B' });
    const nC = makeNote({ id: 'nC', text: 'C' });
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([nA, nB, nC], onChange));

    act(() => {
      result.current.reorder(0, 1);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(3);
    expect(emitted[0]).toBe(nB);
    expect(emitted[1]).toBe(nA);
    expect(emitted[2]).toBe(nC);
  });

  it('reorder(n, n) — same index is no-op in terms of order (AC-016)', () => {
    const n1 = makeNote({ id: 'n1', text: 'stay' });
    const n2 = makeNote({ id: 'n2', text: 'also stay' });
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([n1, n2], onChange));

    act(() => {
      result.current.reorder(1, 1);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted[0]).toBe(n1);
    expect(emitted[1]).toBe(n2);
  });

  it('reorder(0, 0) boundary — does not throw and emits unchanged array (AC-016)', () => {
    const n1 = makeNote({ id: 'n1', text: 'solo' });
    const onChange = jest.fn();
    const { result } = renderHook(() => useNotes([n1], onChange));

    expect(() => {
      act(() => {
        result.current.reorder(0, 0);
      });
    }).not.toThrow();

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Note[];
    expect(emitted[0]).toBe(n1);
  });
});
