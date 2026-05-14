/**
 * RichTextLine — public controlled component for single-line rich text editing.
 *
 * Thin wrapper over useRichTextLine: delegates all editor logic (Enter blocking,
 * sanitisation, controlled sync) to the hook. Renders EditorContent from
 * @tiptap/react inside a wrapper div that forwards className and aria-label.
 *
 * Covers: AC-002..AC-004, AC-013, AC-020, AC-021..AC-025, AC-027, AC-034.
 */

import { EditorContent } from '@tiptap/react';
import { useEffect } from 'react';

import { useRichTextLine } from '../hooks/useRichTextLine.js';
import type { RichTextLineProps } from '../types.js';

import { FloatingToolbar } from './FloatingToolbar.js';
import styles from './RichTextLine.module.css';

/**
 * Single-line rich text editor component — controlled via value/onChange.
 *
 * Features:
 *  - Typing, bold/italic/underline/strike via keyboard shortcuts (Tiptap defaults).
 *  - Enter blocked (no <br>, no second <p>); optional onEnter callback.
 *  - Paste sanitised to 4 allowed tags (<b><i><u><s>) before insertion.
 *  - Placeholder shown when empty, hidden when content is present.
 *  - External value changes reflected without cursor jump (normalised comparison).
 *  - autoFocus: calls editor.commands.focus() on mount.
 *  - disabled: editor rendered read-only.
 */
export function RichTextLine({
  value,
  onChange,
  placeholder,
  onEnter,
  ariaLabel,
  autoFocus = false,
  disabled = false,
  className,
}: RichTextLineProps) {
  const hookOptions: Parameters<typeof useRichTextLine>[0] = { value, onChange, disabled };
  if (placeholder !== undefined) hookOptions.placeholder = placeholder;
  if (onEnter !== undefined) hookOptions.onEnter = onEnter;

  const editor = useRichTextLine(hookOptions);

  // autoFocus: programmatically focus the editor after it initialises.
  // Using useEffect so we don't call commands on a null editor.
  useEffect(() => {
    if (autoFocus && editor) {
      editor.commands.focus();
    }
    // Only run once on mount (editor settles after first render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  // Apply aria-label to the inner contenteditable element that Tiptap renders.
  // EditorContent renders a div wrapper; the contenteditable is inside it.
  // We pass it via editor.setOptions after editor is ready.
  useEffect(() => {
    if (!editor) return;
    if (ariaLabel !== undefined) {
      editor.setOptions({
        editorProps: {
          ...editor.options.editorProps,
          attributes: {
            ...editor.options.editorProps?.attributes,
            'aria-label': ariaLabel,
          },
        },
      });
    }
  }, [editor, ariaLabel]);

  return (
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')} data-tiptap-editor="">
      {editor && <FloatingToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
