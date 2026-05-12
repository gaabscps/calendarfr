/**
 * Unit tests for normalizePriorities.
 *
 * Covers: AC-012, AC-015.
 *
 * Strategy: pure function — no React, no mocks required beyond console.warn spy.
 */

import type { Priority } from '@calendarfr/shared';

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

  // ── Valid array passes through without warning ───────────────────────────
  describe('valid array', () => {
    it('returns the same items when all 3 items are valid', () => {
      const input: Priority[] = [
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

    it('returns single valid item without warning', () => {
      const input: Priority[] = [validItem({ id: 'only' })];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(input[0]);
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('handles all items with done: true', () => {
      const input: Priority[] = [
        validItem({ done: true }),
        validItem({ done: true }),
        validItem({ done: true }),
      ];

      const result = normalizePriorities(input);

      expect(result[0]?.done).toBe(true);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Array of 2 → returned as-is (no padding) ────────────────────────────
  describe('array of length 2', () => {
    it('returns 2 items without padding and without warning', () => {
      const input = [validItem({ id: 'x' }), validItem({ id: 'y' })];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(validItem({ id: 'x' }));
      expect(result[1]).toEqual(validItem({ id: 'y' }));
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Array of 4 → returned as-is (no truncation to 3) ───────────────────
  describe('array of length 4', () => {
    it('returns all 4 items without warning', () => {
      const input = [
        validItem({ id: 'a' }),
        validItem({ id: 'b' }),
        validItem({ id: 'c' }),
        validItem({ id: 'd' }),
      ];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(4);
      expect(result[0]?.id).toBe('a');
      expect(result[1]?.id).toBe('b');
      expect(result[2]?.id).toBe('c');
      expect(result[3]?.id).toBe('d');
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  // ── Array of 11 items → clamped to 10 ───────────────────────────────────
  describe('array exceeding max (11 items)', () => {
    it('clamps to 10 items and emits warn', () => {
      const input = Array.from({ length: 11 }, (_, i) => validItem({ id: `item-${i}` }));

      const result = normalizePriorities(input);

      expect(result).toHaveLength(10);
      expect(result[0]?.id).toBe('item-0');
      expect(result[9]?.id).toBe('item-9');
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('truncating'));
    });
  });

  // ── Item with wrong shape → dropped with warn ────────────────────────────
  describe('item with invalid shape', () => {
    it('drops item with id: number and warns', () => {
      const badItem = { id: 123, text: 'hello', done: false };
      const input = [validItem({ id: 'a' }), badItem, validItem({ id: 'c' })];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('a');
      expect(result[1]?.id).toBe('c');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid shape'), badItem);
    });

    it('drops item with missing done field', () => {
      const badItem = { id: 'x', text: 'hello' }; // missing done
      const input = [badItem, validItem({ id: 'b' }), validItem({ id: 'c' })];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('b');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('drops null item', () => {
      const input = [null, validItem({ id: 'b' }), validItem({ id: 'c' })];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe('b');
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('returns single slot with non-empty id when all items are invalid', () => {
      const input = [{ id: 1 }, null, 'string'];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBeTruthy();
      expect(result[0]?.text).toBe('');
      expect(result[0]?.done).toBe(false);
    });
  });

  // ── Non-array input → returns single slot with non-empty id + warn ───────
  describe('non-array input', () => {
    it('handles null input', () => {
      const result = normalizePriorities(null);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBeTruthy();
      expect(result[0]?.text).toBe('');
      expect(result[0]?.done).toBe(false);
      expect(warnSpy).toHaveBeenCalledTimes(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('expected an array'),
        expect.anything(),
        expect.anything(),
      );
    });

    it('handles undefined input', () => {
      const result = normalizePriorities(undefined);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBeTruthy();
      expect(result[0]?.text).toBe('');
      expect(result[0]?.done).toBe(false);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('handles string input', () => {
      const result = normalizePriorities('not-an-array');

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBeTruthy();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });

    it('handles object input', () => {
      const result = normalizePriorities({ length: 3 });

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBeTruthy();
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── Empty array → returns single slot with non-empty id ─────────────────
  describe('empty array', () => {
    it('returns array of length 1 with non-empty id slot', () => {
      const result = normalizePriorities([]);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBeTruthy();
      expect(result[0]?.text).toBe('');
      expect(result[0]?.done).toBe(false);
      expect(warnSpy).toHaveBeenCalledTimes(1);
    });
  });

  // ── AC-014: all returned items must have non-empty id ───────────────────
  describe('AC-014: id stability', () => {
    it('assigns a non-empty id to items with id: ""', () => {
      const input = [
        { id: '', text: 'first', done: false },
        { id: 'existing', text: 'second', done: true },
        { id: '', text: 'third', done: false },
      ];

      const result = normalizePriorities(input);

      expect(result).toHaveLength(3);
      expect(result[0]?.id).toBeTruthy();
      expect(result[0]?.id).not.toBe('');
      // Item with existing id is preserved as-is (referential equality)
      expect(result[1]).toBe(input[1]);
      expect(result[2]?.id).toBeTruthy();
      expect(result[2]?.id).not.toBe('');
      expect(warnSpy).not.toHaveBeenCalled();
    });

    it('assigns distinct ids to multiple empty-id items', () => {
      const input = [
        { id: '', text: 'a', done: false },
        { id: '', text: 'b', done: false },
      ];

      const result = normalizePriorities(input);

      expect(result[0]?.id).not.toBe('');
      expect(result[1]?.id).not.toBe('');
      expect(result[0]?.id).not.toBe(result[1]?.id);
    });

    it('passes through valid items with non-empty id without warning', () => {
      const input = [{ id: 'abc', text: 'hello', done: false }];

      const result = normalizePriorities(input);

      expect(result[0]).toBe(input[0]);
      expect(warnSpy).not.toHaveBeenCalled();
    });
  });
});
