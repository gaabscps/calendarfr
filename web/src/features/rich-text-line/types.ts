/**
 * Public types for the rich-text-line feature.
 *
 * RichTextValue is the HTML string contract: restricted to {<b>,<i>,<u>,<s>}
 * and plain text. Compatible with Priority.text, Note.text, AgendaSlot.text
 * (all `string`) — no conversion needed in consuming flows.
 */

/** HTML string restricted to the allowed tag set: <b>, <i>, <u>, <s>. */
export type RichTextValue = string;

/** Props for the RichTextLine controlled component. */
export interface RichTextLineProps {
  /** Current HTML value — controlled. */
  value: RichTextValue;
  /** Called with normalised HTML on every editor change. */
  onChange: (html: RichTextValue) => void;
  /** Optional placeholder shown when editor is empty. */
  placeholder?: string;
  /** Called (no args) when the user presses Enter. Default: no-op. */
  onEnter?: () => void;
  /** aria-label applied to the contenteditable element. */
  ariaLabel?: string;
  /** Whether to focus the editor on mount. Default: false. */
  autoFocus?: boolean;
  /** When true the editor is read-only. Default: false. */
  disabled?: boolean;
  /** CSS class forwarded to the wrapper element. */
  className?: string;
}
