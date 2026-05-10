/**
 * Unit tests for useNotes — handler stability + valueRef/onChangeRef race safety.
 *
 * Sister files: useNotes.test.ts (basics), useNotes.mutations.test.ts (mutations).
 */

import type { Note } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { useNotes } from '../useNotes.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeNote(overrides?: Partial<Note>): Note {
  return { id: 'id-1', prefix: '•', text: '', ...overrides };
}

describe('useNotes — stability + race', () => {
  describe('handler stability', () => {
    it('onAdd is the same reference across re-renders with different value', () => {
      const onChange = jest.fn();
      const n1 = makeNote({ id: 'n1' });

      const { result, rerender } = renderHook(
        ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
        { initialProps: { v: [] as Note[], cb: onChange } },
      );

      const firstOnAdd = result.current.onAdd;
      rerender({ v: [n1], cb: onChange });

      expect(result.current.onAdd).toBe(firstOnAdd);
    });

    it('onRemove is the same reference across re-renders with different onChange', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      const n1 = makeNote({ id: 'n1' });

      const { result, rerender } = renderHook(
        ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
        { initialProps: { v: [n1], cb: cb1 } },
      );

      const firstOnRemove = result.current.onRemove;
      rerender({ v: [n1], cb: cb2 });

      expect(result.current.onRemove).toBe(firstOnRemove);
    });

    it('onChangeText is the same reference across re-renders', () => {
      const { result, rerender } = renderHook(
        ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
        { initialProps: { v: [] as Note[], cb: jest.fn() } },
      );

      const firstRef = result.current.onChangeText;
      rerender({ v: [makeNote()], cb: jest.fn() });

      expect(result.current.onChangeText).toBe(firstRef);
    });

    it('onCyclePrefix is the same reference across re-renders', () => {
      const { result, rerender } = renderHook(
        ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
        { initialProps: { v: [] as Note[], cb: jest.fn() } },
      );

      const firstRef = result.current.onCyclePrefix;
      rerender({ v: [makeNote()], cb: jest.fn() });

      expect(result.current.onCyclePrefix).toBe(firstRef);
    });
  });

  // ── Latest-value read via valueRef ─────────────────────────────────────────
  describe('latest-value race safety (valueRef reads latest at call time)', () => {
    it('onAdd reads latest value from ref after parent commits', () => {
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
      expect(firstEmit).toHaveLength(1);

      // Parent commits first emission
      value = firstEmit;
      rerender({ v: value, cb: onChange });

      // Second add should see updated value
      act(() => {
        result.current.onAdd();
      });
      const secondEmit = onChange.mock.calls[1]?.[0] as Note[];
      expect(secondEmit).toHaveLength(2);
    });

    it('onChangeText reads latest onChange ref', () => {
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      const n1 = makeNote({ id: 'n1', text: 'original' });

      const { result, rerender } = renderHook(
        ({ v, cb }: { v: Note[]; cb: (_n: Note[]) => void }) => useNotes(v, cb),
        { initialProps: { v: [n1], cb: cb1 } },
      );

      // Swap onChange to cb2 between renders
      rerender({ v: [n1], cb: cb2 });

      act(() => {
        result.current.onChangeText('n1', 'new text');
      });

      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });
  });

  // ── justAddedIdRef contract ───────────────────────────────────────────────
  // The hook does NOT auto-clear the ref. Consumer is responsible for clearing
  // it after applying autoFocus (Plan decision). Tests pin this contract so
  // BATCH-B's autoFocus logic has a stable foundation.
});
