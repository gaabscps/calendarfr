/**
 * Public types for the daily-page feature.
 *
 * SaveStatus: the 4 states of the autosave indicator (per spec US-002, AC-012).
 * HttpError: re-exported from api/ for consumers that need to instanceof-check.
 *
 * DailyPageData and sub-types come from @calendarfr/shared — not duplicated here.
 */

export type { HttpError } from './api/dailyPageApi.js';

/**
 * The 4 states of the autosave cycle:
 * - saved: no pending changes, last save was successful
 * - dirty: user has unsaved changes; debounce timer is running
 * - saving: PUT request is in-flight
 * - error: PUT failed after all retries; retrySave() available
 *
 * Covers: AC-012.
 */
export type SaveStatus = 'saved' | 'dirty' | 'saving' | 'error';
