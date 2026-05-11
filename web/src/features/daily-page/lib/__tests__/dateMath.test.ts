/**
 * Unit tests for dateMath utilities.
 *
 * Critical invariant: addDays must use UTC arithmetic to avoid DST bugs.
 * A naive implementation using local Date + setDate() can produce wrong
 * results when crossing a DST boundary (clocks spring forward/back).
 */

import { addDays } from '../dateMath';

describe('addDays', () => {
  describe('basic cases', () => {
    it('adds 1 day', () => {
      expect(addDays('2026-05-10', 1)).toBe('2026-05-11');
    });

    it('subtracts 1 day', () => {
      expect(addDays('2026-05-11', -1)).toBe('2026-05-10');
    });

    it('adds 0 days (identity)', () => {
      expect(addDays('2026-05-11', 0)).toBe('2026-05-11');
    });

    it('adds multiple days', () => {
      expect(addDays('2026-05-01', 10)).toBe('2026-05-11');
    });

    it('subtracts multiple days', () => {
      expect(addDays('2026-05-11', -10)).toBe('2026-05-01');
    });
  });

  describe('month boundary crossing', () => {
    it('crosses month forward: 2026-05-31 + 1 = 2026-06-01', () => {
      expect(addDays('2026-05-31', 1)).toBe('2026-06-01');
    });

    it('crosses month backward: 2026-06-01 - 1 = 2026-05-31', () => {
      expect(addDays('2026-06-01', -1)).toBe('2026-05-31');
    });

    it('crosses month backward from March 1 in non-leap year', () => {
      expect(addDays('2025-03-01', -1)).toBe('2025-02-28');
    });

    it('crosses month backward from March 1 in leap year', () => {
      expect(addDays('2024-03-01', -1)).toBe('2024-02-29');
    });
  });

  describe('year boundary crossing', () => {
    it('crosses year forward: 2026-12-31 + 1 = 2027-01-01', () => {
      expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    });

    it('crosses year backward: 2027-01-01 - 1 = 2026-12-31', () => {
      expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    });
  });

  describe('DST boundary safety', () => {
    // US DST spring-forward in 2026: March 8 (clocks go 2:00 AM → 3:00 AM).
    // A naive implementation using local Date.setDate() might skip a day
    // or produce wrong results. UTC arithmetic must produce the correct result.
    it('crosses US spring-forward DST: 2026-03-07 + 1 = 2026-03-08', () => {
      expect(addDays('2026-03-07', 1)).toBe('2026-03-08');
    });

    it('crosses US spring-forward DST: 2026-03-08 + 1 = 2026-03-09', () => {
      expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
    });

    // US DST fall-back in 2026: November 1 (clocks go 2:00 AM → 1:00 AM).
    it('crosses US fall-back DST: 2026-11-01 + 1 = 2026-11-02', () => {
      expect(addDays('2026-11-01', 1)).toBe('2026-11-02');
    });

    it('crosses US fall-back DST: 2026-10-31 + 1 = 2026-11-01', () => {
      expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    });

    // European DST spring-forward in 2026: March 29.
    it('crosses European spring-forward DST: 2026-03-29 + 1 = 2026-03-30', () => {
      expect(addDays('2026-03-29', 1)).toBe('2026-03-30');
    });

    // European DST fall-back in 2026: October 25.
    it('crosses European fall-back DST: 2026-10-25 + 1 = 2026-10-26', () => {
      expect(addDays('2026-10-25', 1)).toBe('2026-10-26');
    });
  });

  describe('output format', () => {
    it('always pads month to 2 digits', () => {
      expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    });

    it('always pads day to 2 digits', () => {
      expect(addDays('2026-01-08', 1)).toBe('2026-01-09');
    });
  });
});
