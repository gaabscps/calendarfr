/**
 * Factory function for the lazy-creation skeleton returned by
 * GET /api/days/:date when the file does not exist on disk.
 *
 * No I/O — pure function. Caller (route handler) decides whether to write.
 * AC-002: GET returning this must NOT write a file to disk.
 *
 * Covers: AC-001, AC-017.
 */
import { newId, type DailyPageData } from '@calendarfr/shared';

// 18 hours: 6 (06:00) .. 23 (23:00)
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // [6, 7, ..., 23]

/**
 * Create an empty DailyPageData skeleton for the given ISO date string.
 * Each priority gets a fresh ULID id.
 */
export function createEmptyDay(date: string): DailyPageData {
  return {
    schemaVersion: 1,
    date,
    mood: null,
    priorities: [
      { id: newId(), text: '', done: false },
      { id: newId(), text: '', done: false },
      { id: newId(), text: '', done: false },
    ],
    agenda: HOURS.map((hour) => ({ hour, text: '' })) as unknown as DailyPageData['agenda'],
    notes: [],
    createdAt: null,
    updatedAt: null,
  };
}
