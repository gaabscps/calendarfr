/**
 * HTML normaliser for the rich-text-line feature.
 *
 * Converts Tiptap's internal empty representations to the canonical empty
 * string so that consumers can rely on `value === ""` ⟺ editor is empty
 * (AC-023) and so that the external-value sync comparison works correctly for
 * semantically equivalent documents (AC-026, AC-028).
 *
 * Key invariant (AC-028): normalizeHtml('texto') === normalizeHtml('<p>texto</p>')
 * because Tiptap internally wraps content in a <p> but consumers may pass plain
 * HTML without the wrapper. Stripping the outer <p> makes both representations
 * equal so the controlled-mode comparison does not trigger a spurious setContent
 * (which would cause cursor jump).
 */

/**
 * Regex matching an outer <p> wrapper with optional attributes (e.g.
 * class="is-editor-empty" added by Tiptap Placeholder extension).
 * The `s` flag lets `.` match newlines inside the paragraph content.
 */
const OUTER_P_RE = /^<p[^>]*>(.*)<\/p>$/s;

/**
 * Inner content that counts as "empty" (AC-023): nothing, only whitespace, or
 * just a <br> with any attributes (e.g. class="ProseMirror-trailingBreak")
 * added by Tiptap extensions.
 */
const EMPTY_INNER_RE = /^\s*(<br[^>]*\/?>)?\s*$/;

/**
 * Normalise an HTML string for stable comparison and emission:
 *
 * 1. Trim surrounding whitespace.
 * 2. If the trimmed value is the empty string, return "".
 * 3. If the value is wrapped in a single outer <p …>…</p>:
 *    a. Extract the inner content.
 *    b. If the inner content is empty/whitespace/<br>, return "" (AC-023).
 *    c. Otherwise return the inner content (strips the <p> wrapper so that
 *       "texto" and "<p>texto</p>" normalise to the same value — AC-028).
 * 4. For anything else, return trimmed as-is.
 */
export function normalizeHtml(html: string): string {
  const trimmed = html.trim();

  if (trimmed === '') {
    return '';
  }

  const pMatch = OUTER_P_RE.exec(trimmed);
  if (pMatch) {
    const inner = pMatch[1] ?? '';
    if (EMPTY_INNER_RE.test(inner)) {
      return '';
    }
    return inner;
  }

  return trimmed;
}
