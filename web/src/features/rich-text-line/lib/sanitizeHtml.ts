/**
 * HTML sanitiser for the rich-text-line feature.
 *
 * Wraps isomorphic-dompurify with a config restricted to the 4 allowed
 * inline tags (<b>, <i>, <u>, <s>), no attributes, KEEP_CONTENT so that text
 * inside removed tags survives.
 *
 * When collapseToSingleLine is true the output is flattened to a single line:
 * block boundaries (<p>, <div>, <br>) are replaced with a single space before
 * DOMPurify runs, and then duplicate whitespace is collapsed.
 */

import DOMPurify from 'isomorphic-dompurify';

/** Options for sanitizeHtml. */
export interface SanitizeHtmlOptions {
  /**
   * When true, block-level boundaries are joined with a space so that the
   * result fits on a single line (paste invariant — AC-017).
   */
  collapseToSingleLine?: boolean;
  /**
   * When true, <p> and <br> tags are added to the allowed list so that
   * paragraph structure is preserved on paste (AC-033).
   */
  allowParagraphs?: boolean;
}

const ALLOWED_TAGS = ['b', 'i', 'u', 's'] as const;

/**
 * Sanitise an HTML string, keeping only the 4 allowed tags with no
 * attributes. Idempotent: sanitizeHtml(sanitizeHtml(x)) === sanitizeHtml(x).
 */
export function sanitizeHtml(input: string, opts: SanitizeHtmlOptions = {}): string {
  let html = input;

  if (opts.collapseToSingleLine) {
    // Replace block boundaries with a space BEFORE DOMPurify so they do not
    // produce extra whitespace artifacts in the raw DOM text.
    html = html
      .replace(/<\/p>\s*<p[^>]*>/gi, ' ')
      .replace(/<\/div>\s*<div[^>]*>/gi, ' ')
      .replace(/<br\s*\/?>/gi, ' ');
  }

  const allowedTags: string[] = [...ALLOWED_TAGS];
  if (opts.allowParagraphs) {
    allowedTags.push('p', 'br');
  }

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: allowedTags,
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  if (opts.collapseToSingleLine) {
    // Collapse multiple consecutive whitespace characters to one.
    return clean.replace(/\s{2,}/g, ' ').trim();
  }

  return clean;
}
