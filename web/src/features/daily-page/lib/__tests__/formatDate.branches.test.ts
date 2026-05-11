/**
 * Branch coverage tests for formatDate.ts.
 *
 * Covers uncovered branches:
 *   - Lines 31-33: yearStr/monthStr/dayStr undefined fallback paths in parseIsoDate
 *     (the `?? '0'` fallbacks when split produces fewer than 3 parts)
 */

import { parseIsoDate } from '../formatDate.js';

describe('parseIsoDate — malformed input fallback branches (lines 31-33)', () => {
  it('handles empty string input (all parts fall back to "0")', () => {
    // ''.split('-') → [''] — month and day parts are undefined, fall back to '0'
    // Covers yearStr ?? '0', monthStr ?? '0', dayStr ?? '0'
    expect(() => parseIsoDate('')).not.toThrow();
    const result = parseIsoDate('');
    // Result is a Date (may be invalid, but no throw)
    expect(result).toBeInstanceOf(Date);
  });

  it('handles single-part string (monthStr and dayStr fall back to "0")', () => {
    // 'notadate'.split('-') → ['notadate'] — both month and day parts undefined
    expect(() => parseIsoDate('notadate')).not.toThrow();
    expect(parseIsoDate('notadate')).toBeInstanceOf(Date);
  });

  it('handles two-part string (dayStr falls back to "0")', () => {
    // '2026-05'.split('-') → ['2026', '05'] — dayStr is undefined
    expect(() => parseIsoDate('2026-05')).not.toThrow();
    expect(parseIsoDate('2026-05')).toBeInstanceOf(Date);
  });

  it('handles three-part numeric string correctly (normal path)', () => {
    // Sanity: normal input still works fine (no regression)
    const result = parseIsoDate('2026-05-11');
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(4); // May = 4 (0-indexed)
    expect(result.getDate()).toBe(11);
  });
});
