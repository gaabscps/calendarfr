/**
 * Date arithmetic utilities for daily-page navigation.
 *
 * Uses UTC arithmetic throughout to avoid DST bugs when crossing
 * daylight saving time boundaries. The local calendar date (YYYY-MM-DD)
 * is what we care about — UTC arithmetic on the date parts is safe
 * because Date.UTC(y, m, d) always gives a stable baseline.
 *
 * Covers: AC-019 (UTC-safe arithmetic for navigation).
 */

/**
 * Adds `delta` days to an ISO date string and returns the resulting YYYY-MM-DD.
 *
 * Example: addDays('2026-05-31', 1) → '2026-06-01'
 *          addDays('2026-12-31', 1) → '2027-01-01'
 *          addDays('2026-05-11', -1) → '2026-05-10'
 *
 * Implementation: parse YYYY-MM-DD into UTC midnight, add delta via
 * setUTCDate, reformat. This avoids DST bugs entirely because we never
 * involve local timezone in the arithmetic.
 */
export function addDays(iso: string, delta: number): string {
  const [yearStr, monthStr, dayStr] = iso.split('-');
  const year = parseInt(yearStr ?? '0', 10);
  const month = parseInt(monthStr ?? '0', 10) - 1; // 0-indexed
  const day = parseInt(dayStr ?? '0', 10);

  // Create a UTC midnight date for arithmetic — no DST interference.
  const d = new Date(Date.UTC(year, month, day));
  d.setUTCDate(d.getUTCDate() + delta);

  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dt = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dt}`;
}
