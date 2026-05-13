/**
 * Unit tests for usePriorities hook — immutability, onChangeItem, addPriority, EMPTY_PRIORITY.
 *
 * Covers: immutability guarantees, onChangeItem partial update, addPriority bounds,
 * other-slots preservation, EMPTY_PRIORITY shape.
 *
 * See also:
 *  - usePriorities.test.ts          (mount, onChangeText, onToggleDone)
 *  - usePriorities.reorder.test.ts  (removePriority, reorder, out-of-bounds)
 */

import type { Priority } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { EMPTY_PRIORITY } from '../../types.js';
import { usePriorities } from '../usePriorities.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTriple = (overrides?: (Partial<Priority> | undefined)[]): Priority[] => [
  { id: '', text: '', done: false, ...(overrides?.[0] ?? {}) },
  { id: '', text: '', done: false, ...(overrides?.[1] ?? {}) },
  { id: '', text: '', done: false, ...(overrides?.[2] ?? {}) },
];

const EXISTING_ID = '01HZ000000000000000000001';

/** Checks whether a string looks like a valid ULID (26 chars, Crockford base32). */
function isUlid(s: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(s);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePriorities — immutability', () => {
  it('emitted array is a new reference', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeText(0, 'new text');
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted).not.toBe(value);
  });

  it('emitted slot is a new object reference', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeText(0, 'new text');
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]).not.toBe(value[0]);
  });
});

describe('usePriorities — other slots untouched', () => {
  it('onChangeText on slot 0 preserves slots 1 and 2', () => {
    const s1: Priority = { id: 'id1', text: 'slot1', done: false };
    const s2: Priority = { id: 'id2', text: 'slot2', done: true };
    const value: Priority[] = [{ id: EXISTING_ID, text: 'original', done: false }, s1, s2];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeText(0, 'updated');
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[1]).toEqual(s1);
    expect(emitted[2]).toEqual(s2);
  });

  it('onToggleDone on slot 1 preserves slots 0 and 2', () => {
    const s0: Priority = { id: 'id0', text: 'zero', done: false };
    const s2: Priority = { id: 'id2', text: 'two', done: false };
    const value: Priority[] = [s0, { id: 'id1', text: 'one', done: false }, s2];
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onToggleDone(1);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]).toEqual(s0);
    expect(emitted[2]).toEqual(s2);
  });
});

describe('usePriorities — onChangeItem', () => {
  it('applies partial update and preserves other fields', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'original', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeItem(0, { text: 'patched' });
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.text).toBe('patched');
    expect(emitted[0]?.id).toBe(EXISTING_ID);
    expect(emitted[0]?.done).toBe(false);
  });

  it('generates ULID on first onChangeItem when id is empty', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

    act(() => {
      result.current.onChangeItem(0, { text: 'hi' });
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(isUlid(emitted[0]?.id ?? '')).toBe(true);
  });

  it('preserves pre-seeded ULID when partial.id is a different id (AC-002 immutability)', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: '', done: false }]);
    const OTHER_ID = '01HZ000000000000000000002';
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeItem(0, { id: OTHER_ID, text: 'updated' });
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.id).toBe(EXISTING_ID);
    expect(emitted[0]?.text).toBe('updated');
  });

  it('preserves existing slot.id when partial.id is "" (AC-002 invariant)', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'original', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeItem(0, { id: '', text: 'updated' });
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.id).toBe(EXISTING_ID);
    expect(emitted[0]?.text).toBe('updated');
  });

  it('uses slot.text when partial.text is undefined', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'original', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeItem(0, { done: true });
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.text).toBe('original');
  });

  it('uses slot.done when partial.done is undefined', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: true }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeItem(0, { text: 'updated' });
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.done).toBe(true);
  });
});

describe('usePriorities — addPriority', () => {
  it('appends a new empty slot (count N → N+1)', () => {
    const value = makeTriple();
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.addPriority();
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted).toHaveLength(4);
    expect(emitted[3]).toEqual({ id: expect.any(String), text: '', done: false });
    expect(isUlid(emitted[3]?.id ?? '')).toBe(true);
  });

  it('new slot has a non-empty ULID id (assigned eagerly on add)', () => {
    const value = makeTriple();
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.addPriority();
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[3]?.id).not.toBe('');
    expect(isUlid(emitted[3]?.id ?? '')).toBe(true);
  });

  it('no-op when items.length is already 10 (max guard)', () => {
    const tenItems: Priority[] = Array.from({ length: 10 }, (_, i) => ({
      id: `id${i}`,
      text: `item ${i}`,
      done: false,
    }));
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(tenItems, onChange));

    act(() => {
      result.current.addPriority();
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});

describe('usePriorities — EMPTY_PRIORITY', () => {
  it('has expected shape', () => {
    expect(EMPTY_PRIORITY).toEqual({ id: '', text: '', done: false });
  });
});
