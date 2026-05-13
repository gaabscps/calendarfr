/**
 * Tiptap extension factory for the rich-text-line feature.
 *
 * Returns the minimal set of extensions required by the spec (AC-001..AC-005,
 * AC-012..AC-015, Plan A1). No StarterKit — only the 9 extensions we actually
 * need, keeping the bundle lean (NFR-003).
 *
 * Bold and Italic are extended to render <b> and <i> respectively (AC-005):
 * Tiptap's defaults emit <strong>/<em>; spec strictly forbids any tags outside
 * the 4-set {<b>,<i>,<u>,<s>}.
 */

import { mergeAttributes } from '@tiptap/core';
import type { Extensions } from '@tiptap/core';
import Bold from '@tiptap/extension-bold';
import Document from '@tiptap/extension-document';
import HardBreak from '@tiptap/extension-hard-break';
import History from '@tiptap/extension-history';
import Italic from '@tiptap/extension-italic';
import Paragraph from '@tiptap/extension-paragraph';
import Placeholder from '@tiptap/extension-placeholder';
import Strike from '@tiptap/extension-strike';
import Text from '@tiptap/extension-text';
import Underline from '@tiptap/extension-underline';

import { SingleLineParagraph } from './singleLineParagraph.js';

/** Options for the extensions array factory. */
export interface BuildExtensionsOptions {
  /** Placeholder text shown when the editor is empty. */
  placeholder?: string;
}

/**
 * Bold extension overridden to render <b> instead of Tiptap's default <strong>.
 * AC-005: only {<b>,<i>,<u>,<s>} may appear in onChange output.
 */
const BoldAsB = Bold.extend({
  renderHTML({ HTMLAttributes }) {
    return ['b', mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * Italic extension overridden to render <i> instead of Tiptap's default <em>.
 * AC-005: only {<b>,<i>,<u>,<s>} may appear in onChange output.
 */
const ItalicAsI = Italic.extend({
  renderHTML({ HTMLAttributes }) {
    return ['i', mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * Build the fixed extension array for a RichTextLine editor instance.
 * Always returns the same 9 extensions; Placeholder is configured with the
 * supplied string (or empty string when omitted — no visual effect).
 */
export function buildExtensions(opts: BuildExtensionsOptions = {}): Extensions {
  return [
    Document,
    SingleLineParagraph,
    Text,
    BoldAsB,
    ItalicAsI,
    Underline,
    Strike,
    History,
    Placeholder.configure({ placeholder: opts.placeholder ?? '' }),
  ];
}

/**
 * Build the fixed extension array for a RichTextBlock editor instance.
 * Identical to buildExtensions but uses the standard Paragraph (Enter allowed)
 * instead of SingleLineParagraph (AC-031).
 */
export function buildExtensionsBlock(opts: BuildExtensionsOptions = {}): Extensions {
  return [
    Document,
    Paragraph,
    Text,
    BoldAsB,
    ItalicAsI,
    Underline,
    Strike,
    HardBreak,
    History,
    Placeholder.configure({ placeholder: opts.placeholder ?? '' }),
  ];
}
