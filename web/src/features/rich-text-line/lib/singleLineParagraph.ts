/**
 * SingleLineParagraph — Tiptap Paragraph extension that blocks Enter and
 * Shift+Enter so the editor never produces a second paragraph or a <br>.
 *
 * Intercepting at the extension level (addKeyboardShortcuts) is the primary
 * defence: Tiptap processes extension keyboard shortcuts BEFORE the
 * handleKeyDown editorProp, so even programmatic commands that bypass the DOM
 * event are caught here.
 *
 * The handleKeyDown in useRichTextLine is a secondary, belt-and-suspenders
 * guard (defence in depth — AC-012, AC-014, Plan A5).
 */

import Paragraph from '@tiptap/extension-paragraph';

/**
 * Paragraph extension that prevents all line-break insertions.
 * Returning `true` from a keyboard shortcut handler tells Tiptap "handled,
 * stop processing" — no default action (new paragraph) is executed.
 */
export const SingleLineParagraph = Paragraph.extend({
  addKeyboardShortcuts() {
    return {
      Enter: () => true,
      'Shift-Enter': () => true,
    };
  },
});
