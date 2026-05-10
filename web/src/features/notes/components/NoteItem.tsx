/**
 * NoteItem — single note row: prefix button + RichTextLine editor + remove button.
 *
 * Wrapped in React.memo with default shallow comparator (NFR-002).
 * Receives stable unbound handlers (onChangeText/onCyclePrefix/onRemove accept `id`)
 * from the parent Notes component — these are stable across all NoteItems.
 *
 * Internal per-id binding is done via useMemo keyed on [note.id, handler] so each
 * NoteItem has its own bound handler that doesn't change unless the unbound handler
 * changes (which doesn't happen because useNotes returns stable refs).
 *
 * DOM order: prefix → editor → remove (Tab order per AC-017).
 *
 * Covers: AC-003, AC-006, AC-010, AC-012, AC-014, AC-017, AC-018, AC-019, NFR-002.
 */

import React, { useCallback } from 'react';

import { RichTextLine } from '@/features/rich-text-line';

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
}

function NoteItemBase({
  note,
  index,
  total,
  onChangeText,
  onCyclePrefix,
  onRemove,
  autoFocus,
}: NoteItemProps) {
  const slotNumber = index + 1;

  // Per-id bound handlers — stable unless the unbound handler or note.id changes.
  // This preserves React.memo effectiveness when the parent re-renders with new
  // inline functions (useNotes returns stable handlers, so these rarely change).
  const handleChangeText = useCallback(
    (html: string) => onChangeText(note.id, html),
    [note.id, onChangeText],
  );

  const handleCyclePrefix = useCallback(() => onCyclePrefix(note.id), [note.id, onCyclePrefix]);

  const handleRemove = useCallback(() => onRemove(note.id), [note.id, onRemove]);

  const prefixAriaLabel = `Prefixo da nota ${String(slotNumber)}: ${note.prefix}; clique para alterar`;
  const editorAriaLabel = `Nota ${String(slotNumber)} de ${String(total)}`;

  return (
    <div className={styles.note}>
      {/* Tab order: prefix first (AC-017) */}
      <button
        type="button"
        className={styles.prefixButton}
        aria-label={prefixAriaLabel}
        onClick={handleCyclePrefix}
      >
        {note.prefix}
      </button>

      {/* Editor fills remaining width */}
      <div className={styles.editor}>
        <RichTextLine
          value={note.text}
          onChange={handleChangeText}
          ariaLabel={editorAriaLabel}
          autoFocus={autoFocus}
        />
      </div>

      {/* Remove button — revealed via CSS on hover/focus-within (AC-012) */}
      <button
        type="button"
        className={styles.removeButton}
        aria-label="Remover nota"
        onClick={handleRemove}
      >
        ×
      </button>
    </div>
  );
}

export const NoteItem = React.memo(NoteItemBase);
NoteItem.displayName = 'NoteItem';
