/**
 * Unit tests for useAgenda hook.
 *
 * Covers: AC-001, AC-003, AC-004, AC-021, AC-026, NFR-002.
 *
 * Strategy: renderHook from @testing-library/react. No Tiptap or DOM involved.
 * Captures onChange spy to verify emitted AgendaSlots.
 */

import type { AgendaSlot } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { EMPTY_AGENDA, type AgendaSlots } from '../../types.js';
import { useAgenda } from '../useAgenda.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

/** Helper: build a 18-slot AgendaSlots with optional text overrides. */
const makeSlots = (overrides: Partial<Record<number, string>> = {}): AgendaSlots => {
  const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23] as const;
  return hours.map((h) => ({
    hour: h,
    text: overrides[h] ?? '',
  })) as unknown as AgendaSlots;
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('useAgenda', () => {
  // ── onChange NOT called on mount ────────────────────────────────────────
  describe('mount behaviour', () => {
    it('does not call onChange on mount', () => {
      const onChange = jest.fn();
      renderHook(() => useAgenda(EMPTY_AGENDA, onChange));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ── onChangeText — basic text update ───────────────────────────────────
  describe('onChangeText', () => {
    it('emits onChange with updated text for the target hour', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(EMPTY_AGENDA, onChange));

      act(() => {
        result.current.onChangeText(9, '<b>reunião</b>');
      });

      expect(onChange).toHaveBeenCalledTimes(1);
      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;
      const slot9 = emitted.find((s: AgendaSlot) => s.hour === 9);
      expect(slot9?.text).toBe('<b>reunião</b>');
    });

    it('preserves hour when updating text (AC-004)', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(EMPTY_AGENDA, onChange));

      act(() => {
        result.current.onChangeText(14, 'meeting notes');
      });

      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;
      const slot14 = emitted.find((s: AgendaSlot) => s.hour === 14);
      expect(slot14?.hour).toBe(14); // hour is immutable
      expect(slot14?.text).toBe('meeting notes');
    });

    it('emits text: "" when text is cleared but preserves hour (AC-003)', () => {
      const value = makeSlots({ 8: 'morning standup' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(value, onChange));

      act(() => {
        result.current.onChangeText(8, '');
      });

      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;
      const slot8 = emitted.find((s: AgendaSlot) => s.hour === 8);
      expect(slot8?.text).toBe('');
      expect(slot8?.hour).toBe(8); // hour preserved
    });

    it('emits a new array reference', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(EMPTY_AGENDA, onChange));

      act(() => {
        result.current.onChangeText(6, 'wake up');
      });

      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;
      expect(emitted).not.toBe(EMPTY_AGENDA);
    });

    it('emitted array has length 18', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(EMPTY_AGENDA, onChange));

      act(() => {
        result.current.onChangeText(12, 'lunch');
      });

      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;
      expect(emitted).toHaveLength(18);
    });
  });

  // ── NFR-002 — referential preservation of untouched slots ───────────────
  describe('referential preservation of untouched slots (NFR-002)', () => {
    it('the 17 untouched slots are Object.is === same as input slots', () => {
      const value = makeSlots({ 9: 'original text' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(value, onChange));

      act(() => {
        result.current.onChangeText(9, 'updated text');
      });

      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;

      // All slots except hour=9 must be the same reference
      value.forEach((inputSlot: AgendaSlot, i: number) => {
        const outputSlot = emitted[i];
        if (inputSlot.hour !== 9) {
          expect(Object.is(inputSlot, outputSlot)).toBe(true);
        } else {
          // The changed slot must be a new reference
          expect(Object.is(inputSlot, outputSlot)).toBe(false);
        }
      });
    });

    it('editing hour 6 preserves identity of all 17 other slots', () => {
      const value = EMPTY_AGENDA;
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(value, onChange));

      act(() => {
        result.current.onChangeText(6, 'early morning');
      });

      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;
      // Slots at index 1..17 (hours 7..23) must be same references
      for (let i = 1; i < 18; i++) {
        expect(Object.is(value[i], emitted[i])).toBe(true);
      }
      // Slot at index 0 (hour 6) is a new reference
      expect(Object.is(value[0], emitted[0])).toBe(false);
    });

    it('editing hour 23 preserves identity of all 17 other slots', () => {
      const value = EMPTY_AGENDA;
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(value, onChange));

      act(() => {
        result.current.onChangeText(23, 'late night');
      });

      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;
      // Slots at index 0..16 (hours 6..22) must be same references
      for (let i = 0; i < 17; i++) {
        expect(Object.is(value[i], emitted[i])).toBe(true);
      }
      // Slot at index 17 (hour 23) is a new reference
      expect(Object.is(value[17], emitted[17])).toBe(false);
    });

    it('editing a middle hour (14) preserves all surrounding slots', () => {
      const value = makeSlots({ 10: 'morning meeting', 14: 'original lunch', 20: 'dinner' });
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(value, onChange));

      act(() => {
        result.current.onChangeText(14, 'new lunch plan');
      });

      const emitted = onChange.mock.calls[0]?.[0] as AgendaSlots;
      // Hour 14 is at index 8 (14 - 6 = 8)
      value.forEach((inputSlot: AgendaSlot, i: number) => {
        if (i !== 8) {
          // index 8 = hour 14
          expect(Object.is(value[i], emitted[i])).toBe(true);
        }
      });
      expect(Object.is(value[8], emitted[8])).toBe(false); // hour 14 changed
      expect(emitted[8]?.text).toBe('new lunch plan');
    });
  });

  // ── Handler stability across re-renders ─────────────────────────────────
  describe('handler stability (useCallback)', () => {
    it('onChangeText is stable across re-renders with same props', () => {
      const onChange = jest.fn();
      const { result, rerender } = renderHook(
        ({ v, cb }: { v: AgendaSlots; cb: (_next: AgendaSlots) => void }) => useAgenda(v, cb),
        { initialProps: { v: EMPTY_AGENDA, cb: onChange } },
      );

      const firstRef = result.current.onChangeText;
      rerender({ v: EMPTY_AGENDA, cb: onChange });
      // Same value reference + same onChange reference → same callback
      expect(result.current.onChangeText).toBe(firstRef);
    });

    it('onChangeText is stable across value changes (valueRef pattern, no race)', () => {
      // Stale-closure safety: onChangeText must remain referentially stable
      // when only `value` changes (deps = [onChange] only). The hook reads
      // the latest value via a ref, so a sequential second edit always sees
      // the freshest value — no batched-update race. See useAgenda.ts JSDoc.
      const onChange = jest.fn();
      const { result, rerender } = renderHook(
        ({ v, cb }: { v: AgendaSlots; cb: (_next: AgendaSlots) => void }) => useAgenda(v, cb),
        { initialProps: { v: EMPTY_AGENDA, cb: onChange } },
      );

      const firstRef = result.current.onChangeText;

      act(() => {
        result.current.onChangeText(9, 'meeting');
      });
      const newValue = onChange.mock.calls[0]?.[0] as AgendaSlots;
      rerender({ v: newValue, cb: onChange });

      // Same onChange ref + value-via-ref → same callback ref.
      expect(result.current.onChangeText).toBe(firstRef);
    });

    it('onChangeText is stable when onChange callback changes (onChangeRef pattern)', () => {
      // Hardening: onChange is read via a ref too, so the handler identity is
      // permanent — robust against parents that pass inline callbacks.
      const cb1 = jest.fn();
      const cb2 = jest.fn();
      const { result, rerender } = renderHook(
        ({ v, cb }: { v: AgendaSlots; cb: (_next: AgendaSlots) => void }) => useAgenda(v, cb),
        { initialProps: { v: EMPTY_AGENDA, cb: cb1 } },
      );

      const firstRef = result.current.onChangeText;
      rerender({ v: EMPTY_AGENDA, cb: cb2 });

      // Handler identity preserved.
      expect(result.current.onChangeText).toBe(firstRef);

      // But the LATEST onChange is the one invoked.
      act(() => {
        result.current.onChangeText(9, 'meeting');
      });
      expect(cb1).not.toHaveBeenCalled();
      expect(cb2).toHaveBeenCalledTimes(1);
    });

    it('reads the latest value at call-time (race safety on sequential edits)', () => {
      // The exact stale-closure scenario logic-reviewer flagged: edit slot 9,
      // parent commits new value, edit slot 14 — the second emission MUST
      // contain slot 9's new text (proves the handler reads fresh value).
      const onChange = jest.fn();
      const { result, rerender } = renderHook(
        ({ v, cb }: { v: AgendaSlots; cb: (_next: AgendaSlots) => void }) => useAgenda(v, cb),
        { initialProps: { v: EMPTY_AGENDA, cb: onChange } },
      );

      act(() => {
        result.current.onChangeText(9, 'meeting');
      });
      const afterFirst = onChange.mock.calls[0]?.[0] as AgendaSlots;
      rerender({ v: afterFirst, cb: onChange });

      act(() => {
        result.current.onChangeText(14, 'lunch');
      });
      const afterSecond = onChange.mock.calls[1]?.[0] as AgendaSlots;

      // Slot 9 must still hold its first edit's text in the second emission.
      const slot9 = afterSecond.find((s) => s.hour === 9);
      const slot14 = afterSecond.find((s) => s.hour === 14);
      expect(slot9?.text).toBe('meeting');
      expect(slot14?.text).toBe('lunch');
    });
  });

  // ── Multiple sequential changes ──────────────────────────────────────────
  describe('multiple changes', () => {
    it('handles sequential calls on different hours', () => {
      const onChange = jest.fn();
      const { result } = renderHook(() => useAgenda(EMPTY_AGENDA, onChange));

      act(() => {
        result.current.onChangeText(8, 'standup');
      });
      act(() => {
        result.current.onChangeText(12, 'lunch');
      });

      expect(onChange).toHaveBeenCalledTimes(2);
    });
  });

  // ── Guard: hour outside [6..23] is a silent no-op ──────────────────────
  describe('out-of-range hour', () => {
    it.each([0, 5, 24, 99, -1])(
      'does not call onChange when hour=%i (no slot matches)',
      (badHour) => {
        const onChange = jest.fn();
        const { result } = renderHook(() => useAgenda(EMPTY_AGENDA, onChange));

        act(() => {
          result.current.onChangeText(badHour, 'will be ignored');
        });

        expect(onChange).not.toHaveBeenCalled();
      },
    );
  });

  // ── EMPTY_AGENDA constant sanity ─────────────────────────────────────────
  describe('EMPTY_AGENDA', () => {
    it('has 18 slots', () => {
      expect(EMPTY_AGENDA).toHaveLength(18);
    });

    it('has hours [6..23] in order', () => {
      const hours = EMPTY_AGENDA.map((s: AgendaSlot) => s.hour);
      expect(hours).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
    });

    it('has all text: ""', () => {
      expect(EMPTY_AGENDA.every((s: AgendaSlot) => s.text === '')).toBe(true);
    });
  });
});
