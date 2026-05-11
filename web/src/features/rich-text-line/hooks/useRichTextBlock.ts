/**
 * useRichTextBlock — controlled Tiptap editor hook for multi-paragraph
 * (block) editing in the rich-text-line feature.
 *
 * Covers: AC-033 (paste preserves paragraphs), AC-034 (controlled / no cursor
 * jump), AC-035 (aria-multiline="true"), AC-039 (unit tests).
 *
 * Key differences from useRichTextLine:
 * - Uses buildExtensionsBlock (standard Paragraph — Enter allowed).
 * - transformPastedHTML does NOT collapse to single line.
 * - handleKeyDown does NOT block Enter.
 * - aria-multiline is "true".
 * - onUpdate emits normalizeBlockHtml (preserves <p> structure).
 * - No onEnter prop.
 */

import { useEditor } from '@tiptap/react';
import { useEffect, useRef } from 'react';

import { buildExtensionsBlock } from '../lib/extensions.js';
import { normalizeBlockHtml, normalizeHtml } from '../lib/normalizeHtml.js';
import { sanitizeHtml } from '../lib/sanitizeHtml.js';

/** Options accepted by useRichTextBlock. */
export interface UseRichTextBlockOptions {
  /** Controlled HTML value. */
  value: string;
  /** Called with normalised block HTML on every editor content change. */
  onChange: (html: string) => void;
  /** Optional placeholder text. */
  placeholder?: string;
  /** When true, the editor is read-only. */
  disabled?: boolean;
}

/**
 * Wraps Tiptap's useEditor with:
 *   - The block extension set (via buildExtensionsBlock — standard Paragraph).
 *   - transformPastedHTML that sanitises HTML preserving paragraph structure
 *     (no collapseToSingleLine — AC-033).
 *   - handleKeyDown that does NOT block Enter, allowing multi-paragraph editing
 *     (AC-031 / US-005).
 *   - onUpdate that emits normalised block HTML (empty Tiptap doc → "") via the
 *     latest onChange ref (stale-closure fix).
 *   - A useEffect that syncs external `value` changes into the editor without
 *     triggering onChange (false flag) and only when the normalised value actually
 *     differs (prevents cursor jump — AC-034).
 *     Note: comparison uses normalizeHtml (not normalizeBlockHtml) for backward
 *     compatibility with legacy values that omit <p> wrappers.
 */
export function useRichTextBlock(opts: UseRichTextBlockOptions) {
  const { value, onChange, placeholder, disabled } = opts;

  // Refs that always hold the latest callback — prevents stale closure inside
  // useEditor callbacks which are captured only on initial creation.
  const onChangeRef = useRef<(html: string) => void>(onChange);

  // Keep ref in sync on every render (cheap assignment, no re-render triggered).
  useEffect(() => {
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    extensions: buildExtensionsBlock(placeholder !== undefined ? { placeholder } : {}),
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        'aria-multiline': 'true',
        role: 'textbox',
        spellcheck: 'true',
      },
      // AC-033: paste sanitises allowed tags while preserving <p>/<br> structure.
      transformPastedHTML: (html: string) => sanitizeHtml(html, { allowParagraphs: true }),
    },
    onUpdate: ({ editor: ed }) => {
      // Emit normalised block HTML: empty Tiptap doc → ""; multi-paragraph
      // content preserves <p> structure (AC-032, AC-039-b).
      const html = normalizeBlockHtml(ed.getHTML());
      onChangeRef.current(html);
    },
  });

  // External value sync — only call setContent when the normalised external
  // value differs from what the editor already holds, preventing cursor jump
  // on every parent re-render (AC-034).
  // Comparison uses normalizeHtml (strips outer <p>) for backward compatibility
  // with legacy values that omit the <p> wrapper (AC-039-c).
  useEffect(() => {
    if (!editor) return;

    const current = normalizeHtml(editor.getHTML());
    const next = normalizeHtml(value);

    if (current !== next) {
      // false = do not emit an onUpdate / onChange for this programmatic change.
      editor.commands.setContent(value || '', false);
    }
  }, [editor, value]);

  return editor;
}
