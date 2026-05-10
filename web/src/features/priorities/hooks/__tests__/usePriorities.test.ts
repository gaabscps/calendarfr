/**
 * Unit tests for usePriorities hook.
 *
 * Covers: AC-001 (ULID generated once on first edit), AC-002 (id preserved on
 * subsequent edits), AC-004 (text cleared, id preserved), AC-007 (toggle on
 * empty slot generates ULID), AC-020 (hook signature), AC-024.
 *
 * Strategy: renderHook from @testing-library/react. No Tiptap or DOM involved.
 * Taps onChange spy to capture emitted tuples.
 */

import type { Priority } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { EMPTY_PRIORITY, type PrioritiesTuple } from '../../types.js';
import { usePriorities } from '../usePriorities.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const makeTriple = (overrides?: (Partial<Priority> | undefined)[]): PrioritiesTuple => [
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

describe('usePriorities', () => {
  // ── onChange NOT called on mount ────────────────────────────────────────
  describe('mount behaviour', () => {
    it('does not call onChange on mount', () => {
      const onChange = jest.fn();
      renderHook(() => usePriorities(makeTriple(), onChange));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ── items are exposed ───────────────────────────────────────────────────
  describe('items', () => {
    it('returns items as a normalised tuple of length 3', () => {
      const value = makeTriple();
      const { result } = renderHook(() => usePriorities(value, jest.fn()));
      expect(result.current.items).toHaveLength(3);
    });
  });

  // ── onChangeText — id stability ─────────────────────────────────────────
  describe('onChangeText', () => {
    it('generates a ULID on first edit when id is empty', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

      act(() => {
        result.current.onChangeText(0, 'hello');
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(isUlid(emitted[0]?.id ?? '')).toBe(true);
    });

    it('emits updated text with generated ULID', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

      act(() => {
        result.current.onChangeText(1, '<b>world</b>');
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[1]?.text).toBe('<b>world</b>');
    });

    it('preserves existing id on subsequent edit (AC-002)', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'old', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeText(0, 'new text');
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.id).toBe(EXISTING_ID);
    });

    it('preserves done state when changing text', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: true }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeText(0, 'updated');
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.done).toBe(true);
    });

    it('emits text: "" when text is cleared but preserves id (AC-004)', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'some text', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeText(0, '');
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.text).toBe('');
      expect(emitted[0]?.id).toBe(EXISTING_ID);
    });

    it('generates ULID once — second edit from parent re-render preserves it', () => {
      const onChange = jest.fn();
      let value = makeTriple();

      const { result, rerender } = renderHook(
        ({ v, cb }: { v: PrioritiesTuple; cb: (_n: PrioritiesTuple) => void }) =>
          usePriorities(v, cb),
        { initialProps: { v: value, cb: onChange } },
      );

      // First edit — ULID generated
      act(() => {
        result.current.onChangeText(0, 'first');
      });

      const firstEmit = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      const generatedId = firstEmit[0]?.id ?? '';
      expect(isUlid(generatedId)).toBe(true);

      // Simulate parent updating value with the emitted result (ULID now set)
      value = firstEmit;
      rerender({ v: value, cb: onChange });

      // Second edit — should preserve the id
      act(() => {
        result.current.onChangeText(0, 'second');
      });

      const secondEmit = onChange.mock.calls[1]?.[0] as PrioritiesTuple;
      expect(secondEmit[0]?.id).toBe(generatedId);
    });
  });

  // ── onToggleDone ─────────────────────────────────────────────────────────
  describe('onToggleDone', () => {
    it('toggles done from false to true on an existing slot', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onToggleDone(0);
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
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

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.done).toBe(false);
    });

    it('generates ULID when toggling an empty slot (AC-007)', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(makeTriple(), onChange));

      act(() => {
        result.current.onToggleDone(2);
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
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

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[2]?.id).toBe(EXISTING_ID);
    });

    it('preserves text when toggling', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'preserve me', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onToggleDone(0);
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.text).toBe('preserve me');
    });
  });

  // ── Immutability ─────────────────────────────────────────────────────────
  describe('immutability', () => {
    it('emitted array is a new reference', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeText(0, 'new text');
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted).not.toBe(value);
    });

    it('emitted slot is a new object reference', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeText(0, 'new text');
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]).not.toBe(value[0]);
    });
  });

  // ── Other slots untouched ────────────────────────────────────────────────
  describe('other slots untouched', () => {
    it('onChangeText on slot 0 preserves slots 1 and 2', () => {
      const s1: Priority = { id: 'id1', text: 'slot1', done: false };
      const s2: Priority = { id: 'id2', text: 'slot2', done: true };
      const value: PrioritiesTuple = [{ id: EXISTING_ID, text: 'original', done: false }, s1, s2];
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeText(0, 'updated');
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[1]).toEqual(s1);
      expect(emitted[2]).toEqual(s2);
    });

    it('onToggleDone on slot 1 preserves slots 0 and 2', () => {
      const s0: Priority = { id: 'id0', text: 'zero', done: false };
      const s2: Priority = { id: 'id2', text: 'two', done: false };
      const value: PrioritiesTuple = [s0, { id: 'id1', text: 'one', done: false }, s2];
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onToggleDone(1);
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]).toEqual(s0);
      expect(emitted[2]).toEqual(s2);
    });
  });

  // ── onChangeItem (generic) ───────────────────────────────────────────────
  describe('onChangeItem', () => {
    it('applies partial update and preserves other fields', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'original', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeItem(0, { text: 'patched' });
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
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

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(isUlid(emitted[0]?.id ?? '')).toBe(true);
    });

    it('uses partial.id when provided (overrides resolveId path)', () => {
      const value = makeTriple([{ id: '', text: '', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeItem(0, { id: EXISTING_ID });
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.id).toBe(EXISTING_ID);
    });

    it('preserves existing slot.id when partial.id is "" (AC-002 invariant)', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'original', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        // Caller explicitly passes id:"" — should NOT regenerate the ULID,
        // existing id is immutable per AC-002.
        result.current.onChangeItem(0, { id: '', text: 'updated' });
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.id).toBe(EXISTING_ID);
      expect(emitted[0]?.text).toBe('updated');
    });

    it('preserves existing slot.id when partial omits id and slot has id', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'original', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        result.current.onChangeItem(0, { text: 'patched' });
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.id).toBe(EXISTING_ID);
    });

    it('uses slot.text when partial.text is undefined', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'original', done: false }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        // Only update done — text should be preserved from slot
        result.current.onChangeItem(0, { done: true });
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.text).toBe('original');
    });

    it('uses slot.done when partial.done is undefined', () => {
      const value = makeTriple([{ id: EXISTING_ID, text: 'task', done: true }]);
      const onChange = jest.fn();
      const { result } = renderHook(() => usePriorities(value, onChange));

      act(() => {
        // Only update text — done should be preserved from slot
        result.current.onChangeItem(0, { text: 'updated' });
      });

      const emitted = onChange.mock.calls[0]?.[0] as PrioritiesTuple;
      expect(emitted[0]?.done).toBe(true);
    });
  });

  // ── EMPTY_PRIORITY constant sanity ───────────────────────────────────────
  describe('EMPTY_PRIORITY', () => {
    it('has expected shape', () => {
      expect(EMPTY_PRIORITY).toEqual({ id: '', text: '', done: false });
    });
  });

  // ── Out-of-bounds index defensive branches ───────────────────────────────
  // These cover the `?? { id: '', text: '', done: false }` fallback guards
  // required by noUncheckedIndexedAccess on PrioritiesTuple indexed access.
  describe('out-of-bounds index (defensive branches)', () => {
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
});
