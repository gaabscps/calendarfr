/**
 * PriorityItem — single priority slot: checkbox + RichTextBlock + delete button.
 *
 * Wrapped in React.memo with default shallow comparator.
 * Props are primitives + stable callbacks — no expensive re-renders.
 *
 * Covers: AC-012, AC-013, AC-014, AC-015.
 */

import React from 'react';

import { RichTextBlock } from '@/features/rich-text-line';

import { placeholderForIndex } from '../lib/placeholders.js';
import type { Priority } from '../types.js';

import styles from './PriorityItem.module.css';

export interface PriorityItemProps {
  /** The current priority value for this slot. */
  value: Priority;
  /** 0-based index of this slot in the tuple. */
  index: number;
  /** Called with the new HTML string when the editor content changes. */
  onChangeText: (html: string) => void;
  /** Called when the checkbox is toggled. */
  onToggleDone: () => void;
  /** Optional: called when the delete button is clicked. Button hidden when absent. */
  onDelete?: () => void;
  /** Optional: whether the editor should auto-focus on mount. */
  autoFocus?: boolean;
}

/**
 * Single priority row: custom checkbox + rich text editor + optional delete button.
 *
 * DOM order per slot: [checkbox] [editor] [delete?] — matches AC-014 natural tab order.
 * No tabIndex hacks needed: the native <input> and contenteditable are both
 * tab-focusable in DOM order by default.
 */
function PriorityItemBase({
  value,
  index,
  onChangeText,
  onToggleDone,
  onDelete,
  autoFocus,
}: PriorityItemProps) {
  const slotNumber = index + 1;

  const checkboxAriaLabel = value.done
    ? `Desmarcar prioridade ${String(slotNumber)} concluída`
    : `Marcar prioridade ${String(slotNumber)} como concluída`;

  const editorAriaLabel = `Prioridade ${String(slotNumber)} do dia`;

  const itemClass = [styles.item, value.done ? styles.done : ''].filter(Boolean).join(' ');
  const checkboxClass = [styles.checkbox, value.done ? styles.checked : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div className={itemClass}>
      {/* Checkbox — AC-008: native <input type="checkbox">, aria-label PT-BR, reflects state */}
      <label className={checkboxClass}>
        <input
          type="checkbox"
          checked={value.done}
          onChange={onToggleDone}
          aria-label={checkboxAriaLabel}
        />
      </label>

      {/* Editor — AC-010: placeholder per slot, AC-016: aria-label per slot */}
      <div className={styles.editor}>
        <RichTextBlock
          value={value.text}
          onChange={onChangeText}
          placeholder={placeholderForIndex(index)}
          ariaLabel={editorAriaLabel}
          {...(autoFocus !== undefined ? { autoFocus } : {})}
        />
      </div>

      {/* Delete button — AC-004, AC-009: only rendered when onDelete is provided */}
      {onDelete && (
        <button
          type="button"
          onClick={onDelete}
          className={styles.deleteButton}
          aria-label={`Excluir prioridade ${String(slotNumber)}`}
        >
          ×
        </button>
      )}
    </div>
  );
}

export const PriorityItem = React.memo(PriorityItemBase);
PriorityItem.displayName = 'PriorityItem';
