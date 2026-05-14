/**
 * Priorities — controlled container for the dynamic priority list (1–10 items).
 *
 * Purely controlled: receives value + onChange, no internal async, no fetch.
 * Delegates state management to usePriorities hook (id stability, toggle, edit,
 * add, remove, reorder).
 *
 * Covers: AC-002, AC-003, AC-005, AC-008, AC-009, AC-010, AC-011, AC-012,
 *         AC-014 (T-009), AC-007, AC-025, AC-026 (T-010).
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
import { useUndoQueueContext } from '@/features/undo-delete';
import { Button } from '@/shared/components/Button';

import { usePriorities } from '../hooks/usePriorities.js';
import type { Priority } from '../types.js';

import styles from './Priorities.module.css';
import { PriorityItem } from './PriorityItem.js';

export interface PrioritiesProps {
  /** Current list of priorities — controlled. */
  value: Priority[];
  /** Emitted on every text edit, checkbox toggle, add, remove, or reorder. */
  onChange: (next: Priority[]) => void;
}

/**
 * Renders all PriorityItem slots dynamically from items[] (1–10 items).
 *
 * Add button appears below the list when items.length < 10 (AC-010).
 * Delete button on each item is hidden when only 1 item remains (AC-011).
 * The last added item receives autoFocus via prevLengthRef tracking (AC-014).
 * DndContext + SortableContext enable drag-and-drop reorder (AC-002, AC-003).
 */
export function Priorities({ value, onChange }: PrioritiesProps) {
  const { items, onChangeText, onToggleDone, addPriority, removePriority, reorder } = usePriorities(
    value,
    onChange,
  );
  const { enqueueUndo } = useUndoQueueContext();

  // ---- BACKSPACE-empty undo (FEAT-022 T-010, AC-001/002/004/005) ----
  // Captura snapshot do array completo ANTES de mutar e enfileira undo de 10s.
  // A remoção em si é feita pelo fluxo normal (removePriority) após o enqueue.
  // Click em "Desfazer" → undoFn re-emite o snapshot via onChange, restaurando
  // o item EXATAMENTE na mesma posição com o mesmo conteúdo. TTL expirado →
  // entrada removida sem chamar undoFn (commit implícito).
  const enqueuePriorityUndo = useCallback(
    (index: number) => {
      if (index < 0 || index >= items.length) return;
      const preRemoval = items;
      enqueueUndo({
        kind: 'priority',
        label: 'Prioridade removida',
        ttlMs: 10_000,
        undoFn: () => {
          onChange(preRemoval);
        },
      });
    },
    [items, enqueueUndo, onChange],
  );

  // ---- DnD sensors (AC-009, AC-025) ----
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ---- Announcements PT-BR (AC-025, AC-026) ----
  const announcements = useMemo(
    () => ({
      onDragStart({ active }: { active: { id: string | number } }) {
        const pos = items.findIndex((i) => i.id === active.id) + 1;
        const total = items.length;
        return `Item levantado. Posição atual ${pos} de ${total}. Use as setas para mover, espaço ou Enter para soltar, Escape para cancelar.`;
      },
      onDragOver({
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number } | null;
      }) {
        if (!over) return '';
        const pos = items.findIndex((i) => i.id === over.id) + 1;
        return `Item movido para posição ${pos} de ${items.length}.`;
      },
      onDragEnd({
        over,
      }: {
        active: { id: string | number };
        over: { id: string | number } | null;
      }) {
        if (!over) return '';
        const pos = items.findIndex((i) => i.id === over.id) + 1;
        return `Item solto em posição ${pos}.`;
      },
      onDragCancel() {
        return 'Reordenação cancelada.';
      },
    }),
    [items],
  );

  // ---- handleDragEnd (AC-002, AC-003, AC-005) ----
  const handleDragEnd = useCallback(
    ({ active, over }: DragEndEvent) => {
      if (over && active.id !== over.id) {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        if (oldIndex !== -1 && newIndex !== -1) {
          reorder(oldIndex, newIndex);
          focusAfterReorderRef.current = String(active.id);
        }
      }
    },
    [items, reorder],
  );

  // ---- Drag handle refs (AC-011, AC-012) ----
  const dragHandleRefsRef = useRef<Map<string, React.RefObject<HTMLButtonElement | null>>>(
    new Map(),
  );
  const getDragHandleRef = useCallback((id: string): React.RefObject<HTMLButtonElement | null> => {
    if (!dragHandleRefsRef.current.has(id)) {
      dragHandleRefsRef.current.set(id, { current: null });
    }
    return dragHandleRefsRef.current.get(id)!;
  }, []);

  // ---- Focus tracking after reorder (AC-011, AC-012) ----
  const focusAfterReorderRef = useRef<string | null>(null);
  useEffect(() => {
    const id = focusAfterReorderRef.current;
    if (id) {
      focusAfterReorderRef.current = null;
      dragHandleRefsRef.current.get(id)?.current?.focus();
    }
  });

  // ---- Auto-focus after add (AC-014) ----
  const prevLengthRef = useRef(items.length);
  useEffect(() => {
    prevLengthRef.current = items.length;
  });

  // ---- Editor refs for Backspace-to-delete focus restore ----
  const editorRefsRef = useRef<Map<string, RichTextEditorRef>>(new Map());
  function getEditorRef(id: string): RichTextEditorRef {
    let ref = editorRefsRef.current.get(id);
    if (!ref) {
      ref = { current: null };
      editorRefsRef.current.set(id, ref);
    }
    return ref;
  }

  const focusAfterRemoveRef = useRef<string | null>(null);
  useEffect(() => {
    const targetId = focusAfterRemoveRef.current;
    if (targetId === null) return;
    focusAfterRemoveRef.current = null;
    editorRefsRef.current.get(targetId)?.current?.commands.focus('end');
  });

  return (
    <section className={styles.section} aria-label="Prioridades do dia">
      <DndContext sensors={sensors} accessibility={{ announcements }} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, index) => {
            const canDelete = items.length > 1;
            const enterHandler = items.length < 10 ? addPriority : undefined;
            const backspaceHandler = canDelete
              ? () => {
                  const prevId = items[index - 1]?.id ?? items[index + 1]?.id ?? null;
                  focusAfterRemoveRef.current = prevId;
                  // FEAT-022 T-010: snapshot ANTES da mutação para que o undo
                  // restaure o item na mesma posição com o mesmo conteúdo.
                  enqueuePriorityUndo(index);
                  removePriority(index);
                }
              : undefined;
            const moveUpHandler =
              index > 0
                ? () => {
                    focusAfterReorderRef.current = item.id;
                    reorder(index, index - 1);
                  }
                : undefined;
            const moveDownHandler =
              index < items.length - 1
                ? () => {
                    focusAfterReorderRef.current = item.id;
                    reorder(index, index + 1);
                  }
                : undefined;
            return (
              <PriorityItem
                key={item.id}
                value={item}
                index={index}
                onChangeText={(html: string) => onChangeText(index, html)}
                onToggleDone={() => onToggleDone(index)}
                {...(canDelete ? { onDelete: () => removePriority(index) } : {})}
                autoFocus={index === items.length - 1 && items.length > prevLengthRef.current}
                {...(enterHandler !== undefined ? { onEnter: enterHandler } : {})}
                {...(backspaceHandler !== undefined ? { onBackspaceEmpty: backspaceHandler } : {})}
                editorRef={getEditorRef(item.id)}
                canReorder={items.length > 1}
                {...(moveUpHandler !== undefined ? { onMoveUp: moveUpHandler } : {})}
                {...(moveDownHandler !== undefined ? { onMoveDown: moveDownHandler } : {})}
                dragHandleRef={getDragHandleRef(item.id)}
              />
            );
          })}
        </SortableContext>
      </DndContext>

      {items.length < 10 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={addPriority}
          className={styles.addButton}
          aria-label="Adicionar prioridade"
        >
          + adicionar
        </Button>
      )}
    </section>
  );
}
