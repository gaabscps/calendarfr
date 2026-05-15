/**
 * Unit tests for normalizeAgenda.
 *
 * Covers: AC-008.
 *
 * Strategy: pure function — no React, no mocks required beyond console.warn spy.
 * Tests all edge cases: length 0/17/18/19/20, missing hours, out-of-order,
 * invalid text type, all-valid-no-warn, non-array, duplicate hours.
 */

import type { AgendaSlot } from '@calendarfr/shared';

import { EMPTY_AGENDA } from '../../types.js';
import { normalizeAgenda } from '../normalizeAgenda.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

/** Create a valid AgendaSlot. */
const slot = (hour: number, text = ''): AgendaSlot => ({ hour, text, energy: null });

/** Create a full valid 18-slot array in canonical order (hours 6..23). */
const makeValidAgenda = (textFn: (_h: number) => string = () => ''): AgendaSlot[] =>
  [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23].map((h) =>
    slot(h, textFn(h)),
  );

describe('normalizeAgenda', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // ── Valid 18-slot array passes through without warning ───────────────────
  describe('valid 18-slot array (happy path)', () => {
    it('returns input as-is when all 18 slots are valid and ordered', () => {
      const input = makeValidAgenda();
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      expect(result).toBe(input); // same reference — fast path
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('preserves text content for valid input', () => {
      const input = makeValidAgenda((h) => (h === 9 ? '<b>reunião</b>' : ''));
      const result = normalizeAgenda(input);
      expect(result[3]).toEqual(slot(9, '<b>reunião</b>')); // index 3 = hour 9
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('does not warn for a fully populated valid agenda', () => {
      const input = makeValidAgenda((h) => `text for ${String(h)}`);
      normalizeAgenda(input);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Empty array → padded to 18 ───────────────────────────────────────────
  describe('empty array (length 0)', () => {
    it('returns 18 slots with empty text', () => {
      const result = normalizeAgenda([]);
      expect(result).toHaveLength(18);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('fills all 18 hours 6..23 with empty text', () => {
      const result = normalizeAgenda([]);
      const hours = result.map((s) => s.hour);
      expect(hours).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
    });

    it('emits a single warn (not per missing slot)', () => {
      normalizeAgenda([]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Length 17 → fills missing hour ──────────────────────────────────────
  describe('array of length 17 (missing one hour)', () => {
    it('adds the missing hour with empty text', () => {
      // All hours except 14
      const input = makeValidAgenda().filter((s) => s.hour !== 14);
      expect(input).toHaveLength(17);

      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      const hour14Slot = result.find((s) => s.hour === 14);
      expect(hour14Slot).toEqual({ hour: 14, text: '', energy: null });
    });

    it('emits exactly one warn', () => {
      const input = makeValidAgenda().filter((s) => s.hour !== 10);
      normalizeAgenda(input);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Length 19 → truncates extra slot ────────────────────────────────────
  describe('array of length 19 (one extra slot)', () => {
    it('returns exactly 18 slots', () => {
      const input = [...makeValidAgenda(), slot(14, 'duplicate')]; // duplicate hour 14
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
    });

    it('emits exactly one warn', () => {
      const input = [...makeValidAgenda(), slot(9, 'dup')];
      normalizeAgenda(input);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('dedups duplicated hours into a single slot (last write wins via Map)', () => {
      // Two slots for hour 9 — Map.set keeps the most recently written entry,
      // so iteration order of the input determines the surviving text.
      const input = makeValidAgenda().map((s) => (s.hour === 9 ? { ...s, text: 'first' } : s));
      input.push(slot(9, 'second'));
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      const hour9 = result.find((s) => s.hour === 9);
      expect(hour9?.hour).toBe(9);
      expect(hour9?.text).toBe('second');
    });
  });

  // ── Length 20 → truncates to 18 ─────────────────────────────────────────
  describe('array of length 20', () => {
    it('returns exactly 18 slots', () => {
      const input = [...makeValidAgenda(), slot(8, 'extra1'), slot(9, 'extra2')];
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Out-of-order → sorts by hour ────────────────────────────────────────
  describe('out-of-order slots', () => {
    it('sorts slots to canonical order 6..23', () => {
      const input = [...makeValidAgenda()].reverse(); // 23..6
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      const hours = result.map((s) => s.hour);
      expect(hours).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('preserves text content after reordering', () => {
      const input = makeValidAgenda((h) => `text-${String(h)}`);
      const shuffled = [...input].sort(() => Math.random() - 0.5);
      const result = normalizeAgenda(shuffled);
      expect(result[0]).toEqual(slot(6, 'text-6'));
      expect(result[4]).toEqual(slot(10, 'text-10'));
      expect(result[17]).toEqual(slot(23, 'text-23'));
    });
  });

  // ── Items with invalid shape ─────────────────────────────────────────────
  describe('invalid item shapes', () => {
    it('drops items with non-number hour and fills with empty slot', () => {
      const input: unknown[] = [
        { hour: 'six', text: 'bad hour type' }, // invalid
        ...makeValidAgenda().slice(1), // hours 7..23 valid
      ];
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      // hour 6 should be filled with empty text (the string-hour item was dropped)
      expect(result[0]).toEqual(slot(6, ''));
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['number', 42],
      ['null', null],
      ['undefined', undefined],
      ['boolean', false],
    ])('drops items with text typed as %s and fills with empty text', (_label, badText) => {
      const badItem = { hour: 9, text: badText };
      const input: unknown[] = [...makeValidAgenda().filter((s) => s.hour !== 9), badItem];
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      const hour9 = result.find((s) => s.hour === 9);
      expect(hour9).toEqual(slot(9, ''));
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('drops items with non-string text and fills with empty text', () => {
      const badItem = { hour: 9, text: 42 }; // text is number
      const input: unknown[] = [...makeValidAgenda().filter((s) => s.hour !== 9), badItem];
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      const hour9 = result.find((s) => s.hour === 9);
      expect(hour9).toEqual(slot(9, ''));
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('drops null items', () => {
      const input: unknown[] = [null, ...makeValidAgenda().slice(1)]; // 17 valid + null
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      expect(result[0]).toEqual(slot(6, ''));
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('drops plain string items', () => {
      const input: unknown[] = ['not-a-slot', ...makeValidAgenda().slice(1)];
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('drops items with hour out of range (hour 25)', () => {
      const input: unknown[] = [
        { hour: 25, text: 'out of range' },
        ...makeValidAgenda().slice(1), // hours 7..23 valid
      ];
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      // hour 6 is missing → filled with empty
      expect(result[0]).toEqual(slot(6, ''));
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('drops items with hour 5 (below range)', () => {
      const input: unknown[] = [
        { hour: 5, text: 'too early' },
        ...makeValidAgenda(), // all 18 valid hours also present
      ];
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      // The hour 5 item is discarded; the valid 18 slots remain
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('drops items with non-integer hour', () => {
      const input: unknown[] = [
        { hour: 6.5, text: 'fractional' },
        ...makeValidAgenda().slice(1), // hours 7..23 valid
      ];
      const result = normalizeAgenda(input);
      expect(result).toHaveLength(18);
      expect(result[0]).toEqual(slot(6, ''));
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Non-array input ──────────────────────────────────────────────────────
  describe('non-array input', () => {
    it('handles null input — returns EMPTY_AGENDA', () => {
      const result = normalizeAgenda(null);
      expect(result).toBe(EMPTY_AGENDA);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('expected an array'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('handles undefined input', () => {
      const result = normalizeAgenda(undefined);
      expect(result).toBe(EMPTY_AGENDA);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('handles string input', () => {
      const result = normalizeAgenda('not-an-array');
      expect(result).toBe(EMPTY_AGENDA);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('handles object input', () => {
      const result = normalizeAgenda({ length: 18 });
      expect(result).toBe(EMPTY_AGENDA);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('handles number input', () => {
      const result = normalizeAgenda(42);
      expect(result).toBe(EMPTY_AGENDA);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Single warn — not per-item ───────────────────────────────────────────
  describe('single warn policy', () => {
    it('emits exactly one warn for multiple invalid items', () => {
      const input: unknown[] = [null, null, null, ...makeValidAgenda().slice(3)];
      normalizeAgenda(input);
      // 3 invalid items → only 1 warn total
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('does not warn for a fully valid input', () => {
      normalizeAgenda(makeValidAgenda());
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Correct hour ordering in result ─────────────────────────────────────
  describe('result ordering', () => {
    it('always produces hours [6..23] in ascending order', () => {
      const expected = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
      const result = normalizeAgenda([]);
      expect(result.map((s) => s.hour)).toEqual(expected);
    });
  });

  // ── energy field ─────────────────────────────────────────────────────────
  describe('energy field', () => {
    it('preserva energy válido', () => {
      const input = Array.from({ length: 18 }, (_, i) => ({
        hour: 6 + i,
        text: '',
        energy: i === 0 ? { emoji: '🔥' } : null,
      }));
      const out = normalizeAgenda(input);
      expect(out[0]?.energy).toEqual({ emoji: '🔥' });
      expect(out[1]?.energy).toBeNull();
    });

    it('default energy = null quando ausente', () => {
      const input = Array.from({ length: 18 }, (_, i) => ({
        hour: 6 + i,
        text: '',
      }));
      const out = normalizeAgenda(input);
      out.forEach((slot) => expect(slot.energy).toBeNull());
    });

    it('substitui energy inválido por null', () => {
      const input = Array.from({ length: 18 }, (_, i) => ({
        hour: 6 + i,
        text: '',
        energy: i === 0 ? { wrong: 'shape' } : null,
      }));
      const out = normalizeAgenda(input);
      expect(out[0]?.energy).toBeNull();
    });

    it('preserva text quando energy está ausente (legacy data)', () => {
      const input = Array.from({ length: 18 }, (_, i) => ({
        hour: 6 + i,
        text: `slot ${6 + i} content`,
      }));
      const out = normalizeAgenda(input);
      out.forEach((s, i) => {
        expect(s.text).toBe(`slot ${6 + i} content`);
        expect(s.energy).toBeNull();
      });
    });
  });
});
