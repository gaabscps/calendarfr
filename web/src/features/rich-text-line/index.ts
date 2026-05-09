/**
 * Public surface of the rich-text-line feature.
 *
 * This is the ONLY import point for external consumers (regra inviolável #3).
 * No @tiptap/* imports should appear outside this directory — verified by SC-005.
 */

export { RichTextLine } from './components/RichTextLine.js';
export type { RichTextLineProps, RichTextValue } from './types.js';
