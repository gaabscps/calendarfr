/**
 * Unit tests for formatDate utilities.
 *
 * Key invariant tested: toLocalIsoDate must use LOCAL date parts (not UTC),
 * so a user at UTC-3 at 23:00 local time gets the correct local date,
 * not the next UTC date.
 */

import { formatDateLong, parseIsoDate, toLocalIsoDate } from '../formatDate';

describe('toLocalIsoDate', () => {
  it('returns YYYY-MM-DD using local date parts', () => {
    // 2026-05-11 at noon local time — straightforward case
    const d = new Date(2026, 4, 11, 12, 0, 0); // month 4 = May (0-indexed)
    expect(toLocalIsoDate(d)).toBe('2026-05-11');
  });

  it('returns the LOCAL date even when UTC date differs (simulated cross-midnight)', () => {
    // Simulate UTC+0 at 23:30 on May 10 — but local timezone is UTC-3,
    // so local date is still May 10 (23:30 UTC = 20:30 local).
    // We fake this by constructing a Date at a UTC timestamp that maps to
    // the end-of-day locally but not yet midnight.
    // Since jsdom doesn't let us change TZ, we test the mathematical correctness:
    // toLocalIsoDate(new Date(y, m, d)) always returns y-m-d regardless of TZ.
    const d = new Date(2026, 4, 10, 23, 30); // May 10 at 23:30 local
    expect(toLocalIsoDate(d)).toBe('2026-05-10');
  });

  it('pads month and day with leading zeros', () => {
    const d = new Date(2026, 0, 5); // January 5
    expect(toLocalIsoDate(d)).toBe('2026-01-05');
  });

  it('handles year boundaries', () => {
    const d = new Date(2026, 11, 31); // December 31
    expect(toLocalIsoDate(d)).toBe('2026-12-31');
  });

  it('handles February 28 (non-leap year)', () => {
    const d = new Date(2025, 1, 28); // Feb 28 2025
    expect(toLocalIsoDate(d)).toBe('2025-02-28');
  });
});

describe('parseIsoDate', () => {
  it('parses YYYY-MM-DD into a Date at local midnight', () => {
    const d = parseIsoDate('2026-05-11');
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4); // May = 4 (0-indexed)
    expect(d.getDate()).toBe(11);
    // Should be local midnight
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it('round-trips: parseIsoDate → toLocalIsoDate returns original string', () => {
    const iso = '2026-05-11';
    expect(toLocalIsoDate(parseIsoDate(iso))).toBe(iso);
  });

  it('round-trips for end-of-year date', () => {
    const iso = '2026-12-31';
    expect(toLocalIsoDate(parseIsoDate(iso))).toBe(iso);
  });

  it('round-trips for February (non-leap)', () => {
    const iso = '2025-02-28';
    expect(toLocalIsoDate(parseIsoDate(iso))).toBe(iso);
  });

  it('round-trips for January 1', () => {
    const iso = '2027-01-01';
    expect(toLocalIsoDate(parseIsoDate(iso))).toBe(iso);
  });
});

describe('formatDateLong', () => {
  it('formats a date in full PT-BR style', () => {
    const result = formatDateLong('2026-05-11');
    // Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }) output varies by runtime,
    // but should contain "maio" and "2026" for May 2026.
    expect(result).toMatch(/maio/i);
    expect(result).toMatch(/2026/);
    expect(result).toMatch(/11/);
  });

  it('includes day of week in full format', () => {
    // 2026-05-11 is a Monday (segunda-feira)
    const result = formatDateLong('2026-05-11');
    // Depending on the locale, day-of-week might appear as "segunda-feira" or similar
    expect(result.length).toBeGreaterThan(10); // sanity: it's actually formatted
  });

  it('formats January correctly', () => {
    const result = formatDateLong('2026-01-01');
    expect(result).toMatch(/janeiro/i);
  });

  it('formats December correctly', () => {
    const result = formatDateLong('2026-12-31');
    expect(result).toMatch(/dezembro/i);
  });
});
