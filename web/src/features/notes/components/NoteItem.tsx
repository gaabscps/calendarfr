/**
 * NoteItem — single note row: prefix button + RichTextBlock editor + remove button.
 *
 * Wrapped in React.memo with default shallow comparator (NFR-002).
 * Receives stable unbound handlers (onChangeText/onCyclePrefix/onRemove accept `id`)
 * from the parent Notes component — these are stable across all NoteItems.
 *
 * Internal per-id binding is done via useMemo keyed on [note.id, handler] so each
 * NoteItem has its own bound handler that doesn't change unless the unbound handler
 * changes (which doesn't happen because useNotes returns stable refs).
 *
 * DOM order: drag handle (optional) → prefix → editor → remove (Tab order per AC-017).
 *
 * Covers: AC-003, AC-006, AC-010, AC-012, AC-013, AC-014, AC-017, AC-018, AC-019,
 *         AC-020, AC-022, NFR-002.
 */

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import React, { useCallback } from 'react';

import { RichTextBlock } from '@/features/rich-text-line';
import type { RichTextEditorRef } from '@/features/rich-text-line';
import { IconButton } from '@/shared/components/IconButton';

import type { Note } from '../types.js';

import styles from './NoteItem.module.css';

export interface NoteItemProps {
  /** The note to render. */
  note: Note;
  /** 0-based index of this note in the list (for aria-labels). */
  index: number;
  /** Total number of notes (for "Nota N de Total" aria-label). */
  total: number;
  /** Called with (noteId, newHtml) when text changes. Stable reference. */
  onChangeText: (id: string, html: string) => void;
  /** Called with (noteId) when prefix button is clicked. Stable reference. */
  onCyclePrefix: (id: string) => void;
  /** Called with (noteId) when remove button is clicked. Stable reference. */
  onRemove: (id: string) => void;
  /** Whether the editor should receive focus on mount (for newly-added notes). */
  autoFocus: boolean;
  /** Called when ENTER is pressed (no modifier) — triggers note creation. */
  onEnter?: () => void;
  /**
   * Called with (noteId) when BACKSPACE is pressed while the editor is empty.
   * Stable reference (analogous to onRemove). The component binds the id
   * internally via useCallback so the RichTextBlock prop stays stable across
   * renders — preserves React.memo effectiveness (NFR-002).
   */
  onBackspaceById?: (id: string) => void;
  /** Optional ref forwarded to the underlying Tiptap Editor instance. */
  editorRef?: RichTextEditorRef;
  /** Whether drag reorder is active (length > 1). Shows drag handle when true. */
  canReorder?: boolean;
  /** Called when Alt+↑ is pressed on the drag handle (AC-020). */
  onMoveUp?: () => void;
  /** Called when Alt+↓ is pressed on the drag handle (AC-020). */
  onMoveDown?: () => void;
  /** Ref forwarded to the drag handle button (for focus-after-reorder). */
  dragHandleRef?: React.RefObject<HTMLButtonElement | null>;
}

function NoteItemBase({
  note,
  index,
  total,
  onChangeText,
  onCyclePrefix,
  onRemove,
  autoFocus,
  onEnter,
  onBackspaceById,
  editorRef,
  canReorder,
  onMoveUp,
  onMoveDown,
  dragHandleRef,
}: NoteItemProps) {
  const slotNumber = index + 1;

  // useSortable — integrates DnD context (AC-018).
  // roleDescription overridden to PT-BR per AC-025.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    attributes: { roleDescription: 'reordenável' },
  });

  const sortableStyle: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition ?? undefined,
  };

  // Per-id bound handlers — stable unless the unbound handler or note.id changes.
  const handleChangeText = useCallback(
    (html: string) => onChangeText(note.id, html),
    [note.id, onChangeText],
  );

  const handleCyclePrefix = useCallback(() => onCyclePrefix(note.id), [note.id, onCyclePrefix]);

  const handleRemove = useCallback(() => onRemove(note.id), [note.id, onRemove]);

  const handleBackspaceEmpty = useCallback(
    () => onBackspaceById?.(note.id),
    [note.id, onBackspaceById],
  );

  // Alt+↑/↓ keyboard reorder handler (AC-020).
  // Non-Alt keys are delegated to dnd-kit's KeyboardSensor (Space/Enter/Escape)
  // so that the built-in keyboard drag flow is not clobbered (AC-018).
  const handleDragHandleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
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
    },
    [onMoveUp, onMoveDown, listeners],
  );

  const prefixAriaLabel = `Prefixo da nota ${String(slotNumber)}: ${note.prefix}; clique para alterar`;
  const editorAriaLabel = `Nota ${String(slotNumber)} de ${String(total)}`;

  const wrapperClassName = [styles.note, isDragging ? styles.lifted : ''].filter(Boolean).join(' ');

  return (
    <div ref={setNodeRef} style={sortableStyle} className={wrapperClassName}>
      {/* Drag handle — shown only when canReorder is truthy (AC-013, AC-022) */}
      {canReorder && (
        <button
          type="button"
          ref={dragHandleRef}
          {...attributes}
          {...listeners}
          aria-label={`Arrastar nota ${String(slotNumber)}`}
          className={styles.dragHandle}
          onKeyDown={handleDragHandleKeyDown}
        >
          ⠿
        </button>
      )}

      {/* Tab order: prefix first (AC-017) */}
      <IconButton
        variant="ghost"
        size="sm"
        aria-label={prefixAriaLabel}
        onClick={handleCyclePrefix}
        className={styles.prefixButton}
      >
        {note.prefix}
      </IconButton>

      {/* Editor fills remaining width */}
      <div className={styles.editor}>
        <RichTextBlock
          value={note.text}
          onChange={handleChangeText}
          ariaLabel={editorAriaLabel}
          autoFocus={autoFocus}
          {...(onEnter !== undefined ? { onEnter } : {})}
          {...(onBackspaceById !== undefined ? { onBackspaceEmpty: handleBackspaceEmpty } : {})}
          {...(editorRef !== undefined ? { editorRef } : {})}
        />
      </div>

      {/* Remove button — revealed via CSS on hover/focus-within (AC-012) */}
      <IconButton
        variant="danger"
        size="sm"
        aria-label="Remover nota"
        onClick={handleRemove}
        className={styles.removeButton}
      >
        ×
      </IconButton>
    </div>
  );
}

export const NoteItem = React.memo(NoteItemBase);
NoteItem.displayName = 'NoteItem';
