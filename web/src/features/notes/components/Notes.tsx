/**
 * Notes — controlled container for the dynamic notes list.
 *
 * Purely controlled: receives value + onChange, no internal async, no fetch.
 * Delegates state management to useNotes hook (ULID id, add/remove/edit/cyclePrefix,
 * justAddedIdRef for autoFocus after add).
 *
 * The useEffect below clears justAddedIdRef after the render in which autoFocus
 * fired — RichTextLine only fires autoFocus on mount, so subsequent renders
 * with autoFocus=false don't re-trigger focus.
 *
 * Covers: AC-003, AC-004, AC-015, AC-016, AC-017, AC-026, NFR-001, NFR-002.
 */

import { useEffect } from 'react';

import { Button } from '@/shared/components/Button';

import { useNotes } from '../hooks/useNotes.js';
import type { Note } from '../types.js';

import { NoteItem } from './NoteItem.js';
import styles from './Notes.module.css';

export interface NotesProps {
  /** Current list of notes — controlled. */
  value: Note[];
  /** Emitted on every add, remove, text edit, or prefix cycle. */
  onChange: (next: Note[]) => void;
}

/**
 * Renders zero-to-many NoteItem rows followed by a "+ Adicionar nota" button.
 *
 * Tab order is natural DOM order per AC-017:
 * [prefix(0) | editor(0) | remove(0)] … [prefix(N-1) | editor(N-1) | remove(N-1)] [+]
 *
 * React.key per note = note.id (ULID stable across re-renders — AC-013).
 * NoteItem is memoised; onChangeText/onCyclePrefix/onRemove are permanently
 * stable handlers from useNotes (valueRef + onChangeRef pattern — NFR-002).
 */
export function Notes({ value, onChange }: NotesProps) {
  const { onAdd, onRemove, onChangeText, onCyclePrefix, justAddedIdRef } = useNotes(
    value,
    onChange,
  );

  // Clear justAddedIdRef after each render so subsequent renders don't
  // incorrectly apply autoFocus. RichTextLine fires focus only on mount,
  // so clearing here (after paint) is safe — the focus already ran.
  useEffect(() => {
    if (justAddedIdRef.current !== null) {
      justAddedIdRef.current = null;
    }
  });

  return (
    <div className={styles.list}>
      {value.map((note, index) => (
        <NoteItem
          key={note.id}
          note={note}
          index={index}
          total={value.length}
          onChangeText={onChangeText}
          onCyclePrefix={onCyclePrefix}
          onRemove={onRemove}
          autoFocus={note.id === justAddedIdRef.current}
        />
      ))}

      {/* AC-004: always visible; AC-015: PT-BR label */}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Adicionar nota"
        onClick={onAdd}
        className={styles.addButton}
      >
        + Adicionar nota
      </Button>
    </div>
  );
}
