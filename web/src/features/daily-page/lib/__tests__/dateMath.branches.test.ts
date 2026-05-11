/**
 * Branch coverage tests for dateMath.ts.
 *
 * Covers uncovered branches:
 *   - Lines 25-27: yearStr/monthStr/dayStr undefined fallback paths
 *     (the `?? '0'` fallbacks when split produces fewer than 3 parts)
 */

import { addDays } from '../dateMath.js';

describe('addDays — malformed input fallback branches (lines 25-27)', () => {
  it('handles empty string input (all parts fall back to "0")', () => {
    // Covers yearStr ?? '0', monthStr ?? '0', dayStr ?? '0'
    // split('') on '' produces [''], all ?? '0' fallbacks fire
    // Result is arbitrary but must not throw
    expect(() => addDays('', 0)).not.toThrow();
  });

  it('handles single-part string (monthStr and dayStr fall back to "0")', () => {
    // 'notadate'.split('-') → ['notadate'] — monthStr and dayStr are undefined
    // Covers both ?? '0' fallbacks for monthStr and dayStr
    expect(() => addDays('notadate', 0)).not.toThrow();
  });

  it('handles two-part string (dayStr falls back to "0")', () => {
    // '2026-05'.split('-') → ['2026', '05'] — dayStr is undefined → ?? '0'
    expect(() => addDays('2026-05', 1)).not.toThrow();
  });

  it('handles non-numeric string parts gracefully (parseInt returns NaN → Date.UTC(NaN))', () => {
    // 'abc-xyz-qrs'.split('-') → ['abc', 'xyz', 'qrs'], parseInt each → NaN
    // Date.UTC(NaN, NaN, NaN) → NaN → setUTCDate(NaN) → invalid date
    // toUTCFullYear/Month/Date may return NaN — verify no throw
    expect(() => addDays('abc-xyz-qrs', 1)).not.toThrow();
  });
});
