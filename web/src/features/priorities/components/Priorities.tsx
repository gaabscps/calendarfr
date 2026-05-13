/**
 * Priorities — controlled container for the dynamic priority list (1–10 items).
 *
 * Purely controlled: receives value + onChange, no internal async, no fetch.
 * Delegates state management to usePriorities hook (id stability, toggle, edit,
 * add, remove).
 *
 * Covers: AC-008, AC-010, AC-011, AC-014 (T-009), AC-007, AC-025 (T-010).
 */

import { useEffect, useRef } from 'react';

import { Button } from '@/shared/components/Button';

import { usePriorities } from '../hooks/usePriorities.js';
import type { Priority } from '../types.js';

import styles from './Priorities.module.css';
import { PriorityItem } from './PriorityItem.js';

export interface PrioritiesProps {
  /** Current list of priorities — controlled. */
  value: Priority[];
  /** Emitted on every text edit, checkbox toggle, add, or remove with the updated array. */
  onChange: (next: Priority[]) => void;
}

/**
 * Renders all PriorityItem slots dynamically from items[] (1–10 items).
 *
 * Add button appears below the list when items.length < 10 (AC-010).
 * Delete button on each item is hidden when only 1 item remains (AC-011).
 * The last added item receives autoFocus via prevLengthRef tracking (AC-014).
 */
export function Priorities({ value, onChange }: PrioritiesProps) {
  const { items, onChangeText, onToggleDone, addPriority, removePriority } = usePriorities(
    value,
    onChange,
  );

  // Track previous length to detect when a new item is appended (AC-014).
  const prevLengthRef = useRef(items.length);
  useEffect(() => {
    prevLengthRef.current = items.length;
  });

  return (
    <section className={styles.section} aria-label="Prioridades do dia">
      {items.map((item, index) => {
        const canDelete = items.length > 1;
        // AC-001: when below the 10-item limit, ENTER calls addPriority via onEnter.
        // AC-002: when at the limit, onEnter is undefined → ENTER falls through to Tiptap default.
        const enterHandler = items.length < 10 ? addPriority : undefined;
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
          />
        );
      })}

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
