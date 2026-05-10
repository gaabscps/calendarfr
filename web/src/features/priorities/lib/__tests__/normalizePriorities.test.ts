/**
 * Unit tests for normalizePriorities.
 *
 * Covers: AC-012, AC-024.
 *
 * Strategy: pure function — no React, no mocks required beyond console.warn spy.
 */

import type { Priority } from '@calendarfr/shared';

import { EMPTY_PRIORITY } from '../../types.js';
import { normalizePriorities } from '../normalizePriorities.js';

const validItem = (overrides?: Partial<Priority>): Priority => ({
  id: 'test-id',
  text: 'hello',
  done: false,
  ...overrides,
});

describe('normalizePriorities', () => {
  let warnSpy: jest.SpyInstance;

  beforeEach(() => {
    warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  // ── Valid tuple passes through without warning ───────────────────────────
  describe('valid 3-tuple', () => {
    it('returns the same tuple reference when all items are valid', () => {
      const input: [Priority, Priority, Priority] = [
        validItem({ id: 'a' }),
        validItem({ id: 'b' }),
        validItem({ id: 'c' }),
      ];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(input[0]);
      expect(result[1]).toBe(input[1]);
      expect(result[2]).toBe(input[2]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('handles all items with done: true', () => {
      const input: [Priority, Priority, Priority] = [
        validItem({ done: true }),
        validItem({ done: true }),
        validItem({ done: true }),
      ];

      const result = normalizePriorities(input);

      expect(result[0]?.done).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Array of 2 → padded to 3 with warning ───────────────────────────────
  describe('array of length 2', () => {
    it('pads to 3 with EMPTY_PRIORITY and emits warn', () => {
      const input = [validItem({ id: 'x' }), validItem({ id: 'y' })];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(validItem({ id: 'x' }));
      expect(result[1]).toEqual(validItem({ id: 'y' }));
      expect(result[2]).toEqual(EMPTY_PRIORITY);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('length 3'));
    });
  });

  // ── Array of 4 → truncated to 3 with warning ────────────────────────────
  describe('array of length 4', () => {
    it('truncates to 3 and emits warn', () => {
      const input = [
        validItem({ id: 'a' }),
        validItem({ id: 'b' }),
        validItem({ id: 'c' }),
        validItem({ id: 'd' }),
      ];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe('a');
      expect(result[1]?.id).toBe('b');
      expect(result[2]?.id).toBe('c');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Item with wrong shape (id: 123) → fallback to EMPTY_PRIORITY + warn ─
  describe('item with invalid shape', () => {
    it('replaces item with id: number with EMPTY_PRIORITY and warns', () => {
      const badItem = { id: 123, text: 'hello', done: false };
      const input = [validItem({ id: 'a' }), badItem, validItem({ id: 'c' })];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBe('a');
      expect(result[1]).toEqual(EMPTY_PRIORITY);
      expect(result[2]?.id).toBe('c');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid shape'), badItem);
    });

    it('replaces item with missing done field with EMPTY_PRIORITY', () => {
      const badItem = { id: 'x', text: 'hello' }; // missing done
      const input = [badItem, validItem({ id: 'b' }), validItem({ id: 'c' })];

      const result = normalizePriorities(input);

      expect(result[0]).toEqual(EMPTY_PRIORITY);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('replaces null item with EMPTY_PRIORITY', () => {
      const input = [null, validItem({ id: 'b' }), validItem({ id: 'c' })];

      const result = normalizePriorities(input);

      expect(result[0]).toEqual(EMPTY_PRIORITY);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Non-array input → returns 3 EMPTY_PRIORITY + warn ───────────────────
  describe('non-array input', () => {
    it('handles null input', () => {
      const result = normalizePriorities(null);

      expect(result).toHaveLength(3);
      expect(result[0]).toBe(EMPTY_PRIORITY);
      expect(result[1]).toBe(EMPTY_PRIORITY);
      expect(result[2]).toBe(EMPTY_PRIORITY);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('expected an array'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('handles undefined input', () => {
      const result = normalizePriorities(undefined);

      expect(result).toHaveLength(3);
      expect(result.every((p) => p === EMPTY_PRIORITY)).toBe(true);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('handles string input', () => {
      const result = normalizePriorities('not-an-array');

      expect(result).toHaveLength(3);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('handles object input', () => {
      const result = normalizePriorities({ length: 3 });

      expect(result).toHaveLength(3);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Empty array ──────────────────────────────────────────────────────────
  describe('empty array', () => {
    it('pads empty array to 3 EMPTY_PRIORITY slots', () => {
      const result = normalizePriorities([]);

      expect(result).toHaveLength(3);
      expect(result.every((p) => p === EMPTY_PRIORITY)).toBe(true);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });
});
