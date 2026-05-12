/**
 * PriorityItem — single priority slot: Checkbox atom + RichTextBlock + IconButton delete.
 *
 * Wrapped in React.memo with default shallow comparator.
 * Props are primitives + stable callbacks — no expensive re-renders.
 *
 * Covers: AC-012, AC-013, AC-014, AC-015, AC-028.
 */

import React from 'react';

import { RichTextBlock } from '@/features/rich-text-line';
import { Checkbox } from '@/shared/components/Checkbox';
import { IconButton } from '@/shared/components/IconButton';

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
 * Single priority row: Checkbox atom + rich text editor + optional IconButton delete.
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

  return (
    <div className={styles.item}>
      {/* Checkbox atom — AC-028 (FEAT-016) + AC-026 (FEAT-017): no extra wrapper.
          Checkbox atom is already a 24×24 inline hit-area aligned with the row. */}
      <Checkbox
        checked={value.done}
        onChange={() => onToggleDone()}
        aria-label={checkboxAriaLabel}
      />

      {/* Editor — AC-010: placeholder per slot, AC-016: aria-label per slot.
          data-done propagates done-state to RichTextBlock for strikethrough
          without piercing the Tiptap abstraction (CLAUDE.md rule 3). */}
      <div className={styles.editor} data-done={value.done ? 'true' : undefined}>
        <RichTextBlock
          value={value.text}
          onChange={onChangeText}
          placeholder={placeholderForIndex(index)}
          ariaLabel={editorAriaLabel}
          {...(autoFocus !== undefined ? { autoFocus } : {})}
        />
      </div>

      {/* Delete IconButton — AC-004, AC-009: only rendered when onDelete is provided */}
      {onDelete && (
        <IconButton
          variant="danger"
          size="sm"
          onClick={onDelete}
          aria-label={`Excluir prioridade ${String(slotNumber)}`}
          className={styles.deleteButton}
        >
          ×
        </IconButton>
      )}
    </div>
  );
}

export const PriorityItem = React.memo(PriorityItemBase);
PriorityItem.displayName = 'PriorityItem';
