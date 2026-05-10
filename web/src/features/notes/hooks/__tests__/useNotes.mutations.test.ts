/**
 * Unit tests for useNotes — mutations: onRemove, onChangeText, onCyclePrefix.
 *
 * Sister files: useNotes.test.ts (basics), useNotes.stability.test.ts (race).
 */

import type { Note } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { useNotes } from '../useNotes.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeNote(overrides?: Partial<Note>): Note {
  return { id: 'id-1', prefix: '•', text: '', ...overrides };
}

describe('useNotes — mutations', () => {
  describe('onRemove', () => {
    it('filters out the note with the given id (AC-011)', () => {
      const n1 = makeNote({ id: 'n1', text: 'a' });
      const n2 = makeNote({ id: 'n2', text: 'b', prefix: '→' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1, n2], onChange));

      act(() => {
        result.current.onRemove('n1');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toBe(n2); // reference preserved
    });

    it('removes the only note — emits empty array', () => {
      const n1 = makeNote({ id: 'n1' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1], onChange));

      act(() => {
        result.current.onRemove('n1');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted).toHaveLength(0);
    });

    it('preserves other notes by reference (AC-005 referential preservation, AC-013 reconciliation key)', () => {
      const n1 = makeNote({ id: 'n1' });
      const n2 = makeNote({ id: 'n2', text: 'b' });
      const n3 = makeNote({ id: 'n3', text: 'c', prefix: '★' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1, n2, n3], onChange));

      act(() => {
        result.current.onRemove('n2');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted[0]).toBe(n1);
      expect(emitted[1]).toBe(n3);
    });

    it('no-op (emits same-length array) when id not found — always-emit contract', () => {
      const n1 = makeNote({ id: 'n1' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1], onChange));

      act(() => {
        result.current.onRemove('nonexistent');
      });

      // Contract: filter() always emits a new array reference, even when
      // no element matches the predicate. Pin the always-emit behavior.
      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted).toHaveLength(1);
      expect(emitted[0]).toBe(n1);
    });
  });

  // ── onChangeText ──────────────────────────────────────────────────────────
  describe('onChangeText', () => {
    it('updates only the matching note text (AC-005)', () => {
      const n1 = makeNote({ id: 'n1', text: 'old' });
      const n2 = makeNote({ id: 'n2', text: 'stays' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1, n2], onChange));

      act(() => {
        result.current.onChangeText('n1', '<b>new</b>');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted[0]!.text).toBe('<b>new</b>');
    });

    it('preserves id and prefix of the edited note (AC-007)', () => {
      const n1 = makeNote({ id: 'n1', prefix: '★', text: 'old' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1], onChange));

      act(() => {
        result.current.onChangeText('n1', 'updated');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted[0]!.id).toBe('n1');
      expect(emitted[0]!.prefix).toBe('★');
    });

    it('other notes are Object.is identical (referential preservation, AC-005)', () => {
      const n1 = makeNote({ id: 'n1' });
      const n2 = makeNote({ id: 'n2', text: 'unchanged' });
      const n3 = makeNote({ id: 'n3', text: 'also unchanged', prefix: '—' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1, n2, n3], onChange));

      act(() => {
        result.current.onChangeText('n1', 'new text');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(Object.is(emitted[1], n2)).toBe(true);
      expect(Object.is(emitted[2], n3)).toBe(true);
    });

    it('no-op when id not found — all notes preserved by reference', () => {
      const n1 = makeNote({ id: 'n1' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1], onChange));

      act(() => {
        result.current.onChangeText('missing', 'nope');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(Object.is(emitted[0], n1)).toBe(true);
    });
  });

  // ── onCyclePrefix ─────────────────────────────────────────────────────────
  describe('onCyclePrefix', () => {
    it('advances prefix of the matching note (AC-008)', () => {
      const n1 = makeNote({ id: 'n1', prefix: '•' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1], onChange));

      act(() => {
        result.current.onCyclePrefix('n1');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted[0]!.prefix).toBe('→');
    });

    it('wraps from ★ back to • (AC-008)', () => {
      const n1 = makeNote({ id: 'n1', prefix: '★' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1], onChange));

      act(() => {
        result.current.onCyclePrefix('n1');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted[0]!.prefix).toBe('•');
    });

    it('preserves id and text of the cycled note (AC-009)', () => {
      const n1 = makeNote({ id: 'n1', prefix: '→', text: 'keep me' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1], onChange));

      act(() => {
        result.current.onCyclePrefix('n1');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(emitted[0]!.id).toBe('n1');
      expect(emitted[0]!.text).toBe('keep me');
      expect(emitted[0]!.prefix).toBe('—');
    });

    it('other notes are Object.is identical', () => {
      const n1 = makeNote({ id: 'n1' });
      const n2 = makeNote({ id: 'n2', prefix: '★', text: 'untouched' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1, n2], onChange));

      act(() => {
        result.current.onCyclePrefix('n1');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(Object.is(emitted[1], n2)).toBe(true);
    });

    it('no-op when id not found — all notes preserved by reference', () => {
      const n1 = makeNote({ id: 'n1', prefix: '•' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useNotes([n1], onChange));

      act(() => {
        result.current.onCyclePrefix('nonexistent');
      });

      const emitted = onChange.mock.calls[0]?.[0] as Note[];
      expect(Object.is(emitted[0], n1)).toBe(true);
    });
  });

  // ── Handler stability (valueRef + onChangeRef pattern) ────────────────────
});
