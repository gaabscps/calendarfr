/**
 * RichTextBlock — public controlled component for multi-paragraph rich text editing.
 *
 * Thin wrapper over useRichTextBlock: delegates all editor logic (Enter allowed,
 * sanitisation, controlled sync) to the hook. Renders FloatingToolbar and
 * EditorContent from @tiptap/react inside a wrapper div.
 *
 * Covers: AC-029 (exported from barrel), AC-030 (props interface), AC-036
 * (FloatingToolbar rendered), AC-038 (RichTextLine unchanged).
 */

import { EditorContent } from '@tiptap/react';
import { useEffect } from 'react';

import { useRichTextBlock } from '../hooks/useRichTextBlock.js';
import type { RichTextBlockProps } from '../types.js';

import { FloatingToolbar } from './FloatingToolbar.js';
import styles from './RichTextBlock.module.css';

/**
 * Multi-paragraph rich text editor component — controlled via value/onChange.
 *
 * Features:
 *  - Typing, bold/italic/underline/strike via keyboard shortcuts (Tiptap defaults).
 *  - Enter creates a new paragraph (not blocked — unlike RichTextLine).
 *  - Paste sanitised to 4 allowed tags (<b><i><u><s>) preserving paragraph structure.
 *  - Placeholder shown when empty, hidden when content is present.
 *  - External value changes reflected without cursor jump (normalised comparison).
 *  - autoFocus: calls editor.commands.focus() on mount.
 *  - disabled: editor rendered read-only.
 *  - aria-multiline="true" on the contenteditable element.
 */
export function RichTextBlock({
  value,
  onChange,
  placeholder,
  ariaLabel,
  autoFocus = false,
  disabled = false,
  className,
}: RichTextBlockProps) {
  const hookOptions: Parameters<typeof useRichTextBlock>[0] = { value, onChange, disabled };
  if (placeholder !== undefined) hookOptions.placeholder = placeholder;

  const editor = useRichTextBlock(hookOptions);

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
    <div className={[styles.wrapper, className].filter(Boolean).join(' ')}>
      {editor && <FloatingToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  );
}
