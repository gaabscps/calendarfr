/**
 * Unit tests for usePriorities hook — removePriority, reorder, out-of-bounds.
 *
 * Covers: AC-004 (reorder via arrayMove, no mutation in-place),
 *         AC-005 (onChange called immediately after reorder).
 *
 * See also:
 *  - usePriorities.test.ts          (mount, onChangeText, onToggleDone)
 *  - usePriorities.mutations.test.ts (immutability, onChangeItem, addPriority)
 */

import type { Priority } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { usePriorities } from '../usePriorities.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTriple = (overrides?: (Partial<Priority> | undefined)[]): Priority[] => [
  { id: '', text: '', done: false, ...(overrides?.[0] ?? {}) },
  { id: '', text: '', done: false, ...(overrides?.[1] ?? {}) },
  { id: '', text: '', done: false, ...(overrides?.[2] ?? {}) },
];

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePriorities — removePriority', () => {
  it('removes the slot at the given index (count N → N-1)', () => {
    const value = makeTriple();
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.removePriority(0);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted).toHaveLength(2);
  });

  it('removes the correct slot (index 0)', () => {
    const s0: Priority = { id: 'id0', text: 'first', done: false };
    const s1: Priority = { id: 'id1', text: 'second', done: false };
    const value: Priority[] = [s0, s1];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.removePriority(0);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0]).toEqual(s1);
  });

  it('no-op when items.length is 1 (min 1 guard)', () => {
    const singleItem: Priority[] = [{ id: 'id0', text: 'only', done: false }];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(singleItem, onChange));

    act(() => {
      result.current.removePriority(0);
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('usePriorities — reorder (AC-004, AC-005)', () => {
  it('calls onChange with array reordered via arrayMove (AC-004)', () => {
    const s0: Priority = { id: 'id0', text: 'zero', done: false };
    const s1: Priority = { id: 'id1', text: 'one', done: false };
    const s2: Priority = { id: 'id2', text: 'two', done: false };
    const value: Priority[] = [s0, s1, s2];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.reorder(0, 2);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    // arrayMove([s0,s1,s2], 0, 2) → [s1, s2, s0]
    expect(emitted[0]).toEqual(s1);
    expect(emitted[1]).toEqual(s2);
    expect(emitted[2]).toEqual(s0);
  });

  it('emitted array is a new reference (no mutation in-place)', () => {
    const s0: Priority = { id: 'id0', text: 'zero', done: false };
    const s1: Priority = { id: 'id1', text: 'one', done: false };
    const value: Priority[] = [s0, s1];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.reorder(0, 1);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted).not.toBe(value);
  });

  it('reorder handler is stable reference across same-value renders (AC-005)', () => {
    const value = makeTriple();
    const onChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ v, cb }: { v: Priority[]; cb: (_n: Priority[]) => void }) => usePriorities(v, cb),
      { initialProps: { v: value, cb: onChange } },
    );

    const ref1 = result.current.reorder;
    rerender({ v: value, cb: onChange });
    const ref2 = result.current.reorder;

    expect(ref1).toBe(ref2);
  });

  it('reorder with same index emits unchanged order', () => {
    const s0: Priority = { id: 'id0', text: 'zero', done: false };
    const s1: Priority = { id: 'id1', text: 'one', done: false };
    const value: Priority[] = [s0, s1];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.reorder(1, 1);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]).toEqual(s0);
    expect(emitted[1]).toEqual(s1);
  });

  it('reorder(0, 1) on [A, B, C] produces [B, A, C] (AC-004)', () => {
    const sA: Priority = { id: 'idA', text: 'A', done: false };
    const sB: Priority = { id: 'idB', text: 'B', done: false };
    const sC: Priority = { id: 'idC', text: 'C', done: false };
    const value: Priority[] = [sA, sB, sC];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.reorder(0, 1);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]).toEqual(sB);
    expect(emitted[1]).toEqual(sA);
    expect(emitted[2]).toEqual(sC);
  });

  it('reorder(0, 0) boundary — does not throw (AC-004)', () => {
    const s0: Priority = { id: 'id0', text: 'zero', done: false };
    const s1: Priority = { id: 'id1', text: 'one', done: false };
    const value: Priority[] = [s0, s1];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    expect(() => {
      act(() => {
        result.current.reorder(0, 0);
      });
    }).not.toThrow();
  });

  it('onChange called with new sorted array (AC-003 onReorder callback)', () => {
    // AC-003: after reorder, onReorder (onChange) is called with the sorted array.
    const s0: Priority = { id: 'id0', text: 'alpha', done: false };
    const s1: Priority = { id: 'id1', text: 'beta', done: false };
    const s2: Priority = { id: 'id2', text: 'gamma', done: false };
    const value: Priority[] = [s0, s1, s2];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.reorder(2, 0);
    });

    // arrayMove([s0,s1,s2], 2, 0) → [s2, s0, s1]
    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted).toHaveLength(3);
    expect(emitted[0]).toEqual(s2);
    expect(emitted[1]).toEqual(s0);
    expect(emitted[2]).toEqual(s1);
  });
});

describe('usePriorities — out-of-bounds index (defensive branches)', () => {
  it('onChangeText with index 5 still calls onChange', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

    act(() => {
      result.current.onChangeText(5, 'oob');
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('onToggleDone with index 5 still calls onChange', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

    act(() => {
      result.current.onToggleDone(5);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('onChangeItem with index 5 still calls onChange', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

    act(() => {
      result.current.onChangeItem(5, { text: 'oob' });
    });

    expect(onChange).toHaveBeenCalledTimes(1);
  });
});
