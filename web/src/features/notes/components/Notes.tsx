/**
 * Notes — controlled container for the dynamic notes list.
 *
 * Purely controlled: receives value + onChange, no internal async, no fetch.
 * Delegates state management to useNotes hook (ULID id, add/remove/edit/cyclePrefix,
 * justAddedIdRef for autoFocus after add, reorder for DnD/keyboard swap).
 *
 * Covers: AC-003, AC-004, AC-014, AC-015, AC-016, AC-017, AC-021, AC-023,
 *         AC-024, AC-025, AC-026, NFR-001, NFR-002.
 */

import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCallback, useEffect, useMemo, useRef } from 'react';

import type { RichTextEditorRef } from '@/features/rich-text-line';
import { Button } from '@/shared/components/Button';

import { useNotes } from '../hooks/useNotes.js';
import type { Note } from '../types.js';

import { NoteItem } from './NoteItem.js';
import styles from './Notes.module.css';

export interface NotesProps {
  value: Note[];
  onChange: (next: Note[]) => void;
}

/** Sensor options — module-level so useSensor deps are stable (prevents NFR-002 regressions). */
const POINTER_OPTIONS = { activationConstraint: { distance: 5 } };
const KEYBOARD_OPTIONS = { coordinateGetter: sortableKeyboardCoordinates };

function makeRefMapGetter<T>(mapRef: React.RefObject<Map<string, T>>, factory: () => T) {
  return (id: string): T => {
    const map = mapRef.current;
    let entry = map.get(id);
    if (!entry) {
      entry = factory();
      map.set(id, entry);
    }
    return entry;
  };
}

export function Notes({ value, onChange }: NotesProps) {
  const { onAdd, onRemove, onChangeText, onCyclePrefix, reorder, justAddedIdRef } = useNotes(
    value,
    onChange,
  );

  // Clear justAddedIdRef after each render so autoFocus fires only on mount.
  useEffect(() => {
    if (justAddedIdRef.current !== null) justAddedIdRef.current = null;
  });

  const editorRefsRef = useRef<Map<string, RichTextEditorRef>>(new Map());
  const getEditorRef = makeRefMapGetter(editorRefsRef, () => ({ current: null }));

  const valueRef = useRef(value);
  useEffect(() => {
    valueRef.current = value;
  });

  const focusAfterRemoveRef = useRef<string | null>(null);
  useEffect(() => {
    const id = focusAfterRemoveRef.current;
    if (id === null) return;
    focusAfterRemoveRef.current = null;
    editorRefsRef.current.get(id)?.current?.commands.focus('end');
  });

  const onBackspaceById = useCallback(
    (noteId: string) => {
      const list = valueRef.current;
      const idx = list.findIndex((n) => n.id === noteId);
      if (idx === -1) return;
      focusAfterRemoveRef.current = list[idx - 1]?.id ?? list[idx + 1]?.id ?? null;
      onRemove(noteId);
    },
    [onRemove],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, POINTER_OPTIONS),
    useSensor(KeyboardSensor, KEYBOARD_OPTIONS),
  );

  /** PT-BR announcements for @dnd-kit screen reader support (AC-026).
   * useMemo on value so position computation can access the current note list. */
  const announcements = useMemo(
    () => ({
      onDragStart({ active }: { active: { id: string | number } }) {
        const pos = value.findIndex((n) => n.id === String(active.id)) + 1;
        const total = value.length;
        return `Item levantado. Posição atual ${pos} de ${total}. Use as setas para mover, espaço ou Enter para soltar, Escape para cancelar.`;
      },
      onDragOver({
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number } | null;
      }) {
        if (!over) return '';
        const pos = value.findIndex((n) => n.id === String(over.id)) + 1;
        const total = value.length;
        return `Item movido para posição ${pos} de ${total}.`;
      },
      onDragEnd({
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number } | null;
      }) {
        if (!over) return '';
        const pos = value.findIndex((n) => n.id === String(over.id)) + 1;
        return `Item solto em posição ${pos}.`;
      },
      onDragCancel() {
        return 'Reordenação cancelada.';
      },
    }),
    [value],
  );

  const dragHandleRefsRef = useRef<Map<string, React.RefObject<HTMLButtonElement | null>>>(
    new Map(),
  );
  const getDragHandleRef = makeRefMapGetter(dragHandleRefsRef, () => ({ current: null }));

  const focusAfterReorderRef = useRef<string | null>(null);
  useEffect(() => {
    const id = focusAfterReorderRef.current;
    if (id === null) return;
    focusAfterReorderRef.current = null;
    dragHandleRefsRef.current.get(id)?.current?.focus();
  });

  // Stable item-id list: only update when ids actually change (not when other note
  // fields change). Prevents SortableContext context updates on text edits, so
  // useSortable subscribers don't re-render unnecessarily (NFR-002).
  const sortableIdsRef = useRef<string[]>(value.map((n) => n.id));
  const newIds = value.map((n) => n.id);
  if (
    newIds.length !== sortableIdsRef.current.length ||
    newIds.some((id, i) => id !== sortableIdsRef.current[i])
  ) {
    sortableIdsRef.current = newIds;
  }
  const sortableIds = sortableIdsRef.current;

  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (over && active.id !== over.id) {
        const oldIndex = valueRef.current.findIndex((n) => n.id === active.id);
        const newIndex = valueRef.current.findIndex((n) => n.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          reorder(oldIndex, newIndex);
          focusAfterReorderRef.current = String(active.id);
        }
      }
    },
    [reorder],
  );

  // Stable keyboard-reorder callbacks keyed by id (NFR-002).
  // useCallback(fn, [reorder]) is stable because reorder from useNotes has deps:[].
  const moveUpCallbacksRef = useRef<Map<string, () => void>>(new Map());
  const moveDownCallbacksRef = useRef<Map<string, () => void>>(new Map());

  const onMoveUpById = useCallback(
    (id: string) => {
      const list = valueRef.current;
      const idx = list.findIndex((n) => n.id === id);
      if (idx > 0) {
        focusAfterReorderRef.current = id;
        reorder(idx, idx - 1);
      }
    },
    [reorder],
  );

  const onMoveDownById = useCallback(
    (id: string) => {
      const list = valueRef.current;
      const idx = list.findIndex((n) => n.id === id);
      if (idx !== -1 && idx < list.length - 1) {
        focusAfterReorderRef.current = id;
        reorder(idx, idx + 1);
      }
    },
    [reorder],
  );

  const getMoveUpCb = (id: string) => {
    let cb = moveUpCallbacksRef.current.get(id);
    if (!cb) {
      cb = () => onMoveUpById(id);
      moveUpCallbacksRef.current.set(id, cb);
    }
    return cb;
  };
  const getMoveDownCb = (id: string) => {
    let cb = moveDownCallbacksRef.current.get(id);
    if (!cb) {
      cb = () => onMoveDownById(id);
      moveDownCallbacksRef.current.set(id, cb);
    }
    return cb;
  };

  return (
    <div className={styles.list}>
      <DndContext sensors={sensors} accessibility={{ announcements }} onDragEnd={handleDragEnd}>
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
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
              onEnter={onAdd}
              onBackspaceById={onBackspaceById}
              editorRef={getEditorRef(note.id)}
              canReorder={value.length > 1}
              {...(index > 0 ? { onMoveUp: getMoveUpCb(note.id) } : {})}
              {...(index < value.length - 1 ? { onMoveDown: getMoveDownCb(note.id) } : {})}
              dragHandleRef={getDragHandleRef(note.id)}
            />
          ))}
        </SortableContext>
      </DndContext>

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
