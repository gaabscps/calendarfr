/**
 * Pure helpers for useDailyPage — no React imports, no side effects.
 */

import type { DailyPageData } from '@calendarfr/shared';

export const LIFE_RAFT_KEY_PREFIX = 'calendarfr:dailypage:'; // AC-028

/**
 * Cross-browser abort detection.
 * Chrome/FF throw DOMException("AbortError"); Safari throws TypeError("Load failed").
 * If the controller signal is aborted, any error from that fetch is the abort.
 */
export function isAbortError(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted === true) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  return false;
}

/** Write life-raft data to localStorage (AC-028). Swallows quota errors. */
export function writeLifeRaft(date: string, body: DailyPageData): void {
  try {
    localStorage.setItem(`${LIFE_RAFT_KEY_PREFIX}${date}`, JSON.stringify(body));
  } catch {
    /* quota */
  }
}

/** Remove life-raft entry from localStorage (AC-028). */
export function clearLifeRaft(date: string): void {
  try {
    localStorage.removeItem(`${LIFE_RAFT_KEY_PREFIX}${date}`);
  } catch {
    /* swallow */
  }
}
