/**
 * formatHour — display helpers for agenda hour labels.
 *
 * Covers: AC-006.
 *
 * Pure functions — no side effects, no React dependencies.
 */

/**
 * Formats an agenda hour as a zero-padded two-digit string.
 * E.g. formatHourLabel(6) → "06", formatHourLabel(23) → "23".
 *
 * This is the canonical format for the visual label in the agenda timeline.
 * Covers AC-006.
 */
export function formatHourLabel(hour: number): string {
  return String(hour).padStart(2, '0');
}

/**
 * Formats an agenda hour as a PT-BR accessible label.
 * E.g. formatHourAriaLabel(8) → "Agenda das 8 horas".
 *
 * The hour is NOT zero-padded in the aria label — spoken numbers do not
 * require leading zeros ("oito horas", not "zero oito horas").
 * Covers AC-006, AC-015 (consumed by AgendaSlot component in BATCH-B).
 */
export function formatHourAriaLabel(hour: number): string {
  return `Agenda das ${hour} horas`;
}
