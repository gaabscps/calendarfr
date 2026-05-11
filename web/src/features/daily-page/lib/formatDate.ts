/**
 * Date formatting utilities for daily-page.
 *
 * Key invariant: toLocalIsoDate derives YYYY-MM-DD from LOCAL date parts,
 * NOT UTC. This avoids the timezone trap where new Date().toISOString()
 * returns the UTC date, which may differ from the user's local date.
 *
 * Covers: AC-001 (local date for API), AC-019 (DST-safe), US-009.
 */

/**
 * Derives YYYY-MM-DD string from a Date object using LOCAL date parts.
 * Example: date = 2026-05-11T23:00:00-03:00 → "2026-05-11" (not "2026-05-12").
 */
export function toLocalIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD ISO string and returns a Date object at midnight LOCAL time.
 * Uses Date.UTC internally but offsets to local midnight to ensure the date
 * parts round-trip correctly through toLocalIsoDate.
 */
export function parseIsoDate(iso: string): Date {
  // Parse the YYYY-MM-DD components explicitly to avoid ambiguous parsing.
  // new Date('YYYY-MM-DD') parses as UTC midnight, which differs from local midnight.
  const [yearStr, monthStr, dayStr] = iso.split('-');
  const year = parseInt(yearStr ?? '0', 10);
  const month = parseInt(monthStr ?? '0', 10) - 1; // 0-indexed
  const day = parseInt(dayStr ?? '0', 10);
  return new Date(year, month, day); // local midnight
}

/**
 * Formats a YYYY-MM-DD ISO string as a full PT-BR date string.
 * Example: "2026-05-11" → "segunda-feira, 11 de maio de 2026"
 */
export function formatDateLong(iso: string): string {
  const date = parseIsoDate(iso);
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full' }).format(date);
}
