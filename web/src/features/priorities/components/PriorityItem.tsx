/**
 * PriorityItem — single priority slot: Checkbox atom + RichTextBlock + IconButton delete.
 *
 * Wrapped in React.memo with default shallow comparator.
 * Props are primitives + stable callbacks — no expensive re-renders.
 *
 * Covers: AC-012, AC-013, AC-014, AC-015, AC-028 (FEAT-008/FEAT-018).
 * FEAT-019: AC-001, AC-006, AC-007, AC-008, AC-010 — drag handle + useSortable + Alt+↑/↓.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React from 'react';

import { RichTextBlock } from '@/features/rich-text-line';
import type { RichTextEditorRef } from '@/features/rich-text-line';
import { ConfirmDeleteButton } from '@/features/undo-delete';
import { Checkbox } from '@/shared/components/Checkbox';

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
  /**
   * Optional: called when ENTER is pressed (without Shift).
   * When provided, the event is consumed and this callback is invoked instead
   * of the Tiptap default (new paragraph).
   * When absent, ENTER behaves as Tiptap default — new paragraph within item.
   */
  onEnter?: () => void;
  /**
   * Optional: called when BACKSPACE is pressed while the editor is empty.
   * Consumers wire this to remove the surrounding priority (bullet UX).
   */
  onBackspaceEmpty?: () => void;
  /**
   * Optional: ref forwarded to the underlying Tiptap Editor instance so the
   * parent container can call `editor.commands.focus('end')` after removals.
   */
  editorRef?: RichTextEditorRef;
  /** FEAT-019: when true, renders the drag handle (⠿) as first child. */
  canReorder?: boolean;
  /** FEAT-019: called when Alt+↑ is pressed on the drag handle. */
  onMoveUp?: () => void;
  /** FEAT-019: called when Alt+↓ is pressed on the drag handle. */
  onMoveDown?: () => void;
  /** FEAT-019: ref forwarded to the drag handle button for post-reorder focus. */
  dragHandleRef?: React.RefObject<HTMLButtonElement | null>;
}

/**
 * Single priority row: [drag handle?] [checkbox] [editor] [delete?]
 *
 * DOM order per slot: drag handle is first so focus order is logical.
 * No tabIndex hacks needed: the native <input> and contenteditable are
 * tab-focusable in DOM order by default.
 */
function PriorityItemBase({
  value,
  index,
  onChangeText,
  onToggleDone,
  onDelete,
  autoFocus,
  onEnter,
  onBackspaceEmpty,
  editorRef,
  canReorder,
  onMoveUp,
  onMoveDown,
  dragHandleRef,
}: PriorityItemProps) {
  const slotNumber = index + 1;

  const checkboxAriaLabel = value.done
    ? `Desmarcar prioridade ${String(slotNumber)} concluída`
    : `Marcar prioridade ${String(slotNumber)} como concluída`;

  const editorAriaLabel = `Prioridade ${String(slotNumber)} do dia`;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: value.id,
    attributes: { roleDescription: 'reordenável' },
  });

  const wrapperStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  };

  function handleDragHandleKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      onMoveUp?.();
    } else if (event.altKey && event.key === 'ArrowDown') {
      event.preventDefault();
      onMoveDown?.();
    } else {
      // Delegate non-Alt keys to @dnd-kit's keyboard handler (space/enter/escape).
      listeners?.onKeyDown?.(event);
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={wrapperStyle}
      className={`${styles.item}${isDragging ? ` ${styles.lifted}` : ''}`}
    >
      {/* Drag handle — AC-001, AC-007, AC-010: only rendered when canReorder=true */}
      {canReorder && (
        <button
          type="button"
          ref={dragHandleRef}
          className={styles.dragHandle}
          aria-label={`Arrastar prioridade ${String(slotNumber)}`}
          {...attributes}
          {...listeners}
          onKeyDown={handleDragHandleKeyDown}
        >
          ⠿
        </button>
      )}

      {/* Checkbox atom — AC-028 (FEAT-016) + AC-026 (FEAT-017): no extra wrapper.
          Checkbox atom is already a 24×24 inline hit-area aligned with the row. */}
      <Checkbox
        checked={value.done}
        onChange={() => onToggleDone()}
        aria-label={checkboxAriaLabel}
      />

      {/* Editor — AC-010: placeholder per slot, AC-016: aria-label per slot.
          data-done propagates done-state to RichTextBlock for strikethrough
          without piercing the Tiptap abstraction (CLAUDE.md rule 3).
          onEnter: when provided, ENTER creates a new priority (AC-001).
          onShiftEnter NOT passed — SHIFT+ENTER uses Tiptap default hard break (AC-004). */}
      <div className={styles.editor} data-done={value.done ? 'true' : undefined}>
        <RichTextBlock
          value={value.text}
          onChange={onChangeText}
          placeholder={placeholderForIndex(index)}
          ariaLabel={editorAriaLabel}
          {...(autoFocus !== undefined ? { autoFocus } : {})}
          {...(onEnter !== undefined ? { onEnter } : {})}
          {...(onBackspaceEmpty !== undefined ? { onBackspaceEmpty } : {})}
          {...(editorRef !== undefined ? { editorRef } : {})}
        />
      </div>

      {/* Delete button — FEAT-022 T-012: ConfirmDeleteButton substitui IconButton X.
          Idle visual mantém o X icon (children); confirming mostra "Confirmar?".
          AC-006, AC-007, AC-008, AC-009 (FEAT-022). Mantém AC-004, AC-009 (FEAT-008). */}
      {onDelete && (
        <ConfirmDeleteButton
          onConfirm={onDelete}
          idleAriaLabel={`Excluir prioridade ${String(slotNumber)}`}
          confirmingAriaLabel={`Confirmar exclusão da prioridade ${String(slotNumber)}`}
          confirmingLabel="Confirmar?"
          className={styles.deleteButton}
        >
          ×
        </ConfirmDeleteButton>
      )}
    </div>
  );
}

export const PriorityItem = React.memo(PriorityItemBase);
PriorityItem.displayName = 'PriorityItem';
