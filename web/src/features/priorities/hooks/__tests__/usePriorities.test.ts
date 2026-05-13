/**
 * Unit tests for usePriorities hook — mount, text, toggle.
 *
 * Covers: AC-001 (ULID generated once on first edit), AC-002 (id preserved on
 * subsequent edits), AC-004 (text cleared, id preserved), AC-007 (toggle on
 * empty slot generates ULID).
 *
 * Strategy: renderHook from @testing-library/react. No Tiptap or DOM involved.
 * Taps onChange spy to capture emitted arrays.
 *
 * See also:
 *  - usePriorities.mutations.test.ts  (immutability, other-slots, onChangeItem, addPriority, EMPTY_PRIORITY)
 *  - usePriorities.reorder.test.ts   (removePriority, reorder, out-of-bounds)
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

const EXISTING_ID = '01HZ000000000000000000001';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Checks whether a string looks like a valid ULID (26 chars, Crockford base32). */
function isUlid(s: string): boolean {
  return /^[0-9A-HJKMNP-TV-Z]{26}$/.test(s);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('usePriorities — mount', () => {
  it('does not call onChange on mount', () => {
    const onChange = jest.fn();
    renderHook(() => usePriorities(makeTriple(), onChange));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('returns items as a normalised array of length 3', () => {
    const value = makeTriple();
    const { result } = renderHook(() => usePriorities(value, jest.fn()));
    expect(result.current.items).toHaveLength(3);
  });
});

describe('usePriorities — onChangeText', () => {
  it('generates a ULID on first edit when id is empty', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

    act(() => {
      result.current.onChangeText(0, 'hello');
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(isUlid(emitted[0]?.id ?? '')).toBe(true);
  });

  it('emits updated text with generated ULID', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

    act(() => {
      result.current.onChangeText(1, '<b>world</b>');
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[1]?.text).toBe('<b>world</b>');
  });

  it('preserves existing id on subsequent edit (AC-002)', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'old', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeText(0, 'new text');
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.id).toBe(EXISTING_ID);
  });

  it('preserves done state when changing text', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: true }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeText(0, 'updated');
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.done).toBe(true);
  });

  it('emits text: "" when text is cleared but preserves id (AC-004)', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'some text', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onChangeText(0, '');
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.text).toBe('');
    expect(emitted[0]?.id).toBe(EXISTING_ID);
  });

  it('generates ULID once — second edit from parent re-render preserves it', () => {
    const onChange = jest.fn();
    let value = makeTriple();

    const { result, rerender } = renderHook(
      ({ v, cb }: { v: Priority[]; cb: (_n: Priority[]) => void }) => usePriorities(v, cb),
      { initialProps: { v: value, cb: onChange } },
    );

    // First edit — ULID generated
    act(() => {
      result.current.onChangeText(0, 'first');
    });

    const firstEmit = onChange.mock.calls[0]?.[0] as Priority[];
    const generatedId = firstEmit[0]?.id ?? '';
    expect(isUlid(generatedId)).toBe(true);

    // Simulate parent updating value with the emitted result (ULID now set)
    value = firstEmit;
    rerender({ v: value, cb: onChange });

    // Second edit — should preserve the id
    act(() => {
      result.current.onChangeText(0, 'second');
    });

    const secondEmit = onChange.mock.calls[1]?.[0] as Priority[];
    expect(secondEmit[0]?.id).toBe(generatedId);
  });
});

describe('usePriorities — onToggleDone', () => {
  it('toggles done from false to true on an existing slot', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onToggleDone(0);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.done).toBe(true);
    expect(emitted[0]?.id).toBe(EXISTING_ID);
  });

  it('toggles done from true to false', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: true }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onToggleDone(0);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.done).toBe(false);
  });

  it('generates ULID when toggling an empty slot (AC-007)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

    act(() => {
      result.current.onToggleDone(2);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(isUlid(emitted[2]?.id ?? '')).toBe(true);
    expect(emitted[2]?.done).toBe(true);
    expect(emitted[2]?.text).toBe('');
  });

  it('preserves existing id on toggle (not regenerate)', () => {
    const value = makeTriple([
      undefined,
      undefined,
      { id: EXISTING_ID, text: 'three', done: false },
    ]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onToggleDone(2);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[2]?.id).toBe(EXISTING_ID);
  });

  it('preserves text when toggling', () => {
    const value = makeTriple([{ id: EXISTING_ID, text: 'preserve me', done: false }]);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePriorities(value, onChange));

    act(() => {
      result.current.onToggleDone(0);
    });

    const emitted = onChange.mock.calls[0]?.[0] as Priority[];
    expect(emitted[0]?.text).toBe('preserve me');
  });
});
