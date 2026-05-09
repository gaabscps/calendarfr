/**
 * useRichTextLine — controlled Tiptap editor hook for the rich-text-line
 * feature.
 *
 * Covers: AC-001 (onChange), AC-012/014 (Enter blocked), AC-015 (no <br>),
 * AC-016..AC-020 (paste sanitisation via transformPastedHTML), AC-023
 * (normalised empty string), AC-025..AC-028 (external value sync without
 * cursor jump), AC-032 (testable lifecycle).
 */

import { useEditor } from '@tiptap/react';
import { useEffect, useRef } from 'react';

import { buildExtensions } from '../lib/extensions.js';
import { normalizeHtml } from '../lib/normalizeHtml.js';
import { sanitizeHtml } from '../lib/sanitizeHtml.js';

/** Options accepted by useRichTextLine. */
export interface UseRichTextLineOptions {
  /** Controlled HTML value. */
  value: string;
  /** Called with normalised HTML on every editor content change. */
  onChange: (html: string) => void;
  /** Optional placeholder text. */
  placeholder?: string;
  /** Called (no args) when the user presses Enter. */
  onEnter?: () => void;
  /** When true, the editor is read-only. */
  disabled?: boolean;
}

/**
 * Wraps Tiptap's useEditor with:
 *   - The fixed 9-extension set (via buildExtensions).
 *   - transformPastedHTML that sanitises and collapses to single line.
 *   - handleKeyDown that blocks Enter (with IME guard) as a belt-and-suspenders
 *     guard and calls the latest onEnter via ref (stale-closure fix — AC-012).
 *   - onUpdate that emits normalised HTML (empty Tiptap doc → "") via the latest
 *     onChange ref (stale-closure fix — AC-032).
 *   - A useEffect that syncs external `value` changes into the editor
 *     without triggering onChange (false flag) and only when the normalised
 *     value actually differs (prevents cursor jump — AC-026).
 */
export function useRichTextLine(opts: UseRichTextLineOptions) {
  const { value, onChange, placeholder, onEnter, disabled } = opts;

  // Refs that always hold the latest callbacks — prevents stale closures inside
  // useEditor callbacks which are captured only on initial creation (AC-012,
  // AC-032).
  const onEnterRef = useRef<(() => void) | undefined>(onEnter);
  const onChangeRef = useRef<(html: string) => void>(onChange);

  // Keep refs in sync on every render (cheap assignment, no re-render triggered).
  useEffect(() => {
    onEnterRef.current = onEnter;
    onChangeRef.current = onChange;
  });

  const editor = useEditor({
    extensions: buildExtensions(placeholder !== undefined ? { placeholder } : {}),
    content: value || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        'aria-multiline': 'false',
        role: 'textbox',
        spellcheck: 'true',
      },
      transformPastedHTML: (html: string) => sanitizeHtml(html, { collapseToSingleLine: true }),
      handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
        // IME guard: CJK (and other IME) composition sends a synthetic Enter
        // (keyCode 229) to confirm the composition — we must NOT intercept it
        // or the character will never be committed (AC-012).
        if (event.isComposing || event.keyCode === 229) {
          return false;
        }
        if (event.key === 'Enter') {
          event.preventDefault();
          // AC-014: Shift+Enter applies the same line-break prevention as Enter,
          // but does NOT trigger onEnter callback — it is not a user "commit".
          // Only plain Enter (no shift modifier) calls onEnter.
          if (!event.shiftKey) {
            onEnterRef.current?.();
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: ed }) => {
      // Strip the outer <p> wrapper that Tiptap always emits so that the
      // emitted value is a clean single-line HTML string (AC-015, AC-023).
      const html = normalizeHtml(ed.getHTML());
      onChangeRef.current(html);
    },
  });

  // External value sync — only call setContent when the normalised external
  // value differs from what the editor already holds, preventing cursor jump
  // on every parent re-render (AC-025, AC-026, AC-028).
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
