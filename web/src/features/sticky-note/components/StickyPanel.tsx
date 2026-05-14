/**
 * StickyPanel — floating post-it panel with drag handle and close button.
 *
 * Covers:
 *  AC-001: width 220px, min-height 220px, max-height 400px
 *  AC-002: overflow-y auto for internal scroll
 *  AC-003: border-radius 4px + box-shadow
 *  AC-004: position fixed, left/top from position prop
 *  AC-005: opacity+scale animation (open/closed CSS classes)
 *  AC-019: drag handle barra with grab cursor
 *  AC-020: dragHandleProps onMouseDown starts drag
 *  AC-021: isDragging → grabbing cursor on handle
 *  AC-022: viewport clamp handled by useDrag (prop passed through)
 *  AC-023: position persisted by useDrag on mouseup
 *  AC-024: position restored from localStorage by useDrag
 *  AC-033: close button (×) shown only when onClose is defined
 *  AC-036: Yellow has no close button (onClose=undefined)
 */

import { useCallback, useEffect, useRef } from 'react';

import { NoteItem } from '@/features/notes';
import type { Note, UseNotesReturn } from '@/features/notes';
import type { RichTextEditorRef } from '@/features/rich-text-line';
import { ConfirmDeleteButton } from '@/features/undo-delete';

import type { StickyColor } from '../types.js';
import { STICKY_COLOR_HEX } from '../types.js';

import styles from './StickyPanel.module.css';

export interface StickyPanelProps {
  /** Controls visibility via opacity+scale animation (AC-005). */
  isOpen: boolean;
  /** Post-it color — drives background and close button visibility. */
  color: StickyColor;
  /** Current note items (minimum 1 enforced by useStickyNote). */
  items: Note[];
  /** Notes API from useNotes — provides onAdd, onRemove, onChangeText, etc. */
  notesApi: UseNotesReturn;
  /** Ref attached to the panel root for click-away detection. */
  panelRef: React.RefObject<HTMLDivElement | null>;
  /** Position in viewport (AC-004, AC-020, AC-024). */
  position: { x: number; y: number };
  /** z-index for bring-to-front stacking (D-006). */
  zIndex: number;
  /** True while dragging — changes drag handle cursor to grabbing (AC-021). */
  isDragging: boolean;
  /** Spread onto drag handle element to bind mousedown (AC-020). */
  dragHandleProps: { onMouseDown: (e: React.MouseEvent) => void };
  /**
   * Called when the × button is clicked (AC-033).
   * Undefined for Yellow — hides the button (AC-036).
   */
  onClose?: () => void;
  /** Called on panel mousedown to bring it to front (AC-011, D-006). */
  onBringToFront: () => void;
}

/**
 * Factory helper — creates a stable RichTextEditorRef on demand.
 */
function getOrCreate(map: Map<string, RichTextEditorRef>, id: string): RichTextEditorRef {
  let ref = map.get(id);
  if (!ref) {
    ref = { current: null };
    map.set(id, ref);
  }
  return ref;
}

export function StickyPanel({
  isOpen,
  color,
  items,
  notesApi,
  panelRef,
  position,
  zIndex,
  isDragging,
  dragHandleProps,
  onClose,
  onBringToFront,
}: StickyPanelProps) {
  const { onAdd, onRemove, onChangeText, onCyclePrefix, justAddedIdRef } = notesApi;

  // Map of per-id editor refs (stable across renders, same pattern as Notes.tsx).
  const editorRefsRef = useRef<Map<string, RichTextEditorRef>>(new Map());

  // Track focus target after a remove, analogous to Notes.tsx focusAfterRemoveRef.
  const focusAfterRemoveRef = useRef<string | null>(null);
  useEffect(() => {
    const id = focusAfterRemoveRef.current;
    if (id === null) return;
    focusAfterRemoveRef.current = null;
    editorRefsRef.current.get(id)?.current?.commands.focus('end');
  });

  // Stable ref to items so onBackspaceById closure is stable.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  });

  // Clear justAddedIdRef after each render.
  useEffect(() => {
    if (justAddedIdRef.current !== null) justAddedIdRef.current = null;
  });

  const onBackspaceById = useCallback(
    (noteId: string) => {
      const list = itemsRef.current;
      const idx = list.findIndex((n) => n.id === noteId);
      if (idx === -1) return;
      focusAfterRemoveRef.current = list[idx - 1]?.id ?? list[idx + 1]?.id ?? null;
      onRemove(noteId);
    },
    [onRemove],
  );

  // AC-021: update document.body cursor during drag
  useEffect(() => {
    document.body.style.cursor = isDragging ? 'grabbing' : '';
    return () => {
      // Only clear if this effect set the cursor to grabbing (AC-021).
      // Prevents a non-dragging panel unmount from clearing another panel's cursor.
      if (isDragging) document.body.style.cursor = '';
    };
  }, [isDragging]);

  // AC-005: drive open/closed CSS class
  const panelClass = [styles.panel, isOpen ? styles.open : styles.closed].join(' ');

  // AC-019/021: drag handle class — grabbing when dragging
  const dragHandleClass = [styles.dragHandle, isDragging ? styles.dragging : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={panelRef}
      className={panelClass}
      aria-label="Painel de anotações globais"
      onMouseDown={onBringToFront}
      style={{
        left: position.x,
        top: position.y,
        zIndex,
        background: STICKY_COLOR_HEX[color],
      }}
    >
      {/* AC-019: drag handle — AC-020: dragHandleProps binds mousedown */}
      <div className={dragHandleClass} {...dragHandleProps}>
        <div className={styles.dragIndicator} />
        {/* AC-033/036: close button only when onClose is defined (non-Yellow).
         *  FEAT-022 AC-010/AC-011: inline 2-click confirm — sem toast/undo queue. */}
        {onClose !== undefined && (
          <ConfirmDeleteButton
            onConfirm={onClose}
            idleAriaLabel="Fechar post-it"
            confirmingAriaLabel="Confirmar fechamento do post-it"
            confirmingLabel="Confirmar?"
            {...(styles.closeButton !== undefined ? { className: styles.closeButton } : {})}
          >
            ✕
          </ConfirmDeleteButton>
        )}
      </div>

      {/* AC-002: list scrolls inside max-height via overflow-y: auto */}
      <div className={styles.list}>
        {items.map((note, index) => (
          <NoteItem
            key={note.id}
            note={note}
            index={index}
            total={items.length}
            onChangeText={onChangeText}
            onCyclePrefix={onCyclePrefix}
            onRemove={onRemove}
            autoFocus={note.id === justAddedIdRef.current}
            onEnter={onAdd}
            onBackspaceById={onBackspaceById}
            editorRef={getOrCreate(editorRefsRef.current, note.id)}
          />
        ))}
      </div>

      {/* Add note button */}
      <button type="button" className={styles.addButton} onClick={onAdd}>
        + Adicionar anotação
      </button>
    </div>
  );
}
