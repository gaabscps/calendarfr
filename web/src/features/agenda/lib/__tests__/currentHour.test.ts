/**
 * Unit tests for getCurrentAgendaHour.
 *
 * Covers: AC-010, AC-011, AC-012.
 *
 * Strategy: use jest.useFakeTimers() + jest.setSystemTime() for deterministic
 * results. Also tests explicit Date argument path.
 */

import { getCurrentAgendaHour } from '../currentHour.js';

describe('getCurrentAgendaHour', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Hours within agenda range [6..23] ────────────────────────────────────
  describe('hours within agenda range', () => {
    it('returns 6 at 06:00 (lower boundary inclusive)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T06:00:00'));
      expect(getCurrentAgendaHour()).toBe(6);
    });

    it('returns 23 at 23:00 (upper boundary inclusive)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T23:00:00'));
      expect(getCurrentAgendaHour()).toBe(23);
    });

    it('returns 23 at 23:59 (still within range)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T23:59:59'));
      expect(getCurrentAgendaHour()).toBe(23);
    });

    it('returns 14 at 14:30', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T14:30:00'));
      expect(getCurrentAgendaHour()).toBe(14);
    });

    it('returns 12 at noon', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T12:00:00'));
      expect(getCurrentAgendaHour()).toBe(12);
    });

    it('returns 8 at 08:45', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T08:45:30'));
      expect(getCurrentAgendaHour()).toBe(8);
    });
  });

  // ── Hours outside agenda range → null ───────────────────────────────────
  describe('hours outside agenda range', () => {
    it('returns null at midnight (hour 0)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T00:00:00'));
      expect(getCurrentAgendaHour()).toBeNull();
    });

    it('returns null at 03:00', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T03:00:00'));
      expect(getCurrentAgendaHour()).toBeNull();
    });

    it('returns null at 05:59 (one minute before lower boundary)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T05:59:59'));
      expect(getCurrentAgendaHour()).toBeNull();
    });

    it('returns null at 01:00', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-10T01:00:00'));
      expect(getCurrentAgendaHour()).toBeNull();
    });
  });

  // ── Explicit Date argument ───────────────────────────────────────────────
  describe('explicit Date argument', () => {
    it('uses provided Date instead of new Date()', () => {
      const specificDate = new Date('2026-05-10T14:30:00');
      expect(getCurrentAgendaHour(specificDate)).toBe(14);
    });

    it('returns null when explicit Date is outside range', () => {
      const nightDate = new Date('2026-05-10T02:00:00');
      expect(getCurrentAgendaHour(nightDate)).toBeNull();
    });

    it('returns 6 for explicit Date at lower boundary', () => {
      expect(getCurrentAgendaHour(new Date('2026-05-10T06:00:00'))).toBe(6);
    });

    it('returns 23 for explicit Date at upper boundary', () => {
      expect(getCurrentAgendaHour(new Date('2026-05-10T23:00:00'))).toBe(23);
    });
  });

  // ── All 18 valid hours are accepted ──────────────────────────────────────
  describe('all 18 valid agenda hours', () => {
    it('returns non-null for every hour in [6..23]', () => {
      for (let h = 6; h <= 23; h++) {
        const d = new Date(`2026-05-10T${String(h).padStart(2, '0')}:00:00`);
        expect(getCurrentAgendaHour(d)).toBe(h);
      }
    });
  });

  // ── All invalid hours return null ────────────────────────────────────────
  describe('invalid hours (0-5)', () => {
    it('returns null for all hours outside range [0..5]', () => {
      for (let h = 0; h <= 5; h++) {
        const d = new Date(`2026-05-10T${String(h).padStart(2, '0')}:00:00`);
        expect(getCurrentAgendaHour(d)).toBeNull();
      }
    });
  });
});
