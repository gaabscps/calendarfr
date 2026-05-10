/**
 * currentHour — agenda-aware hour detection.
 *
 * Covers: AC-010, AC-011, AC-012.
 *
 * Pure function — no side effects, no React dependencies.
 */

import type { AgendaHour } from '../types.js';

/** Minimum agenda hour (inclusive). */
const AGENDA_HOUR_MIN = 6;

/** Maximum agenda hour (inclusive). */
const AGENDA_HOUR_MAX = 23;

/**
 * Returns the current hour if it falls within the agenda range [6, 23],
 * otherwise returns null.
 *
 * Computed once at call-site — callers are responsible for deciding when to
 * call (e.g. once on mount, per AC-012).
 *
 * @param now - Optional Date to use as "now". Defaults to `new Date()`.
 *   Accepting a `Date` param makes this testable via jest.setSystemTime or
 *   by passing a fixed Date directly (used in BATCH-B for the `now` prop).
 *
 * Covers AC-010: returns hour within [6..23].
 * Covers AC-011: returns null when hour is outside [6..23].
 * Covers AC-012: no polling — single call at mount.
 */
export function getCurrentAgendaHour(now: Date = new Date()): AgendaHour | null {
  const hour = now.getHours();
  if (hour >= AGENDA_HOUR_MIN && hour <= AGENDA_HOUR_MAX) {
    return hour as AgendaHour;
  }
  return null;
}
