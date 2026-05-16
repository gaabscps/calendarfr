/**
 * HTML sanitization for DailyPageData text fields.
 *
 * Only <b>, <i>, <u>, <s>, <p>, <br> are allowed. All attributes stripped.
 * Applied after zod validation, before persist (defense-in-depth).
 *
 * <p> and <br> are needed because RichTextBlock (Tiptap) emits paragraph-
 * wrapped HTML (<p>line1</p><p>line2</p>). Stripping them collapses paragraph
 * breaks on PUT roundtrip. Also benefits Notes (FEAT-011).
 *
 * Covers: AC-018, AC-019, AC-020, AC-021.
 */
import type { DailyPageData } from '@calendarfr/shared';
import DOMPurify from 'isomorphic-dompurify';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const ALLOWED_TAGS = ['b', 'i', 'u', 's', 'p', 'br'];
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
 * Strip ALL HTML — usado em campos plain-text (ex: intention).
 * Mantém o texto, descarta qualquer tag.
 */
export const stripHtml = (raw: string): string =>
  DOMPurify.sanitize(raw, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] as string[] });

/**
 * Sanitize all text fields in a DailyPageData object.
 * Returns a new object — does not mutate input.
 * mood and timestamps are not text-rich; they are left untouched.
 */
export function sanitizeDayHtml(day: DailyPageData): DailyPageData {
  return {
    ...day,
    // .map() returns a mutable array; cast back to tuple (zod already validated length).
    priorities: day.priorities.map((p) => ({
      ...p,
      text: sanitizeText(p.text),
    })),
    agenda: day.agenda.map((s) => ({
      ...s,
      text: sanitizeText(s.text),
    })) as unknown as DailyPageData['agenda'],
    notes: day.notes.map((n) => ({ ...n, text: sanitizeText(n.text) })),
    // intention é plain-text — strip todo HTML
    intention: day.intention === null ? null : stripHtml(day.intention),
    // gratitude permite as mesmas tags rich do resto
    gratitude: day.gratitude.map((g) => ({ ...g, text: sanitizeText(g.text) })),
  };
}
