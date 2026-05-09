/**
 * HTML sanitization for DailyPageData text fields.
 *
 * Only <b>, <i>, <u>, <s> are allowed. All attributes stripped.
 * Applied after zod validation, before persist (defense-in-depth).
 *
 * Covers: AC-018, AC-019, AC-020, AC-021.
 */
import type { DailyPageData } from '@calendarfr/shared';
import DOMPurify from 'isomorphic-dompurify';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = ['b', 'i', 'u', 's'];
const SANITIZE_OPTS = { ALLOWED_TAGS, ALLOWED_ATTR: [] as string[] };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Sanitize a single text string.
 * Plain text passes through unchanged; disallowed HTML is stripped.
 */
export const sanitizeText = (raw: string): string => DOMPurify.sanitize(raw, SANITIZE_OPTS);

/**
 * Sanitize all text fields in a DailyPageData object.
 * Returns a new object — does not mutate input.
 * mood and timestamps are not text-rich; they are left untouched.
 */
export function sanitizeDayHtml(day: DailyPageData): DailyPageData {
  return {
    ...day,
    priorities: day.priorities.map((p) => ({ ...p, text: sanitizeText(p.text) })),
    agenda: day.agenda.map((s) => ({ ...s, text: sanitizeText(s.text) })),
    notes: day.notes.map((n) => ({ ...n, text: sanitizeText(n.text) })),
  };
}
