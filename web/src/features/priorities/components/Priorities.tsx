/**
 * Priorities — controlled container for the fixed 3-slot priority list.
 *
 * Purely controlled: receives value + onChange, no internal async, no fetch.
 * Delegates state management to usePriorities hook (id stability, toggle, edit).
 *
 * Covers: AC-003, AC-005, AC-006, AC-008, AC-009, AC-010, AC-013, AC-014,
 *         AC-015, AC-016, AC-017, AC-018, AC-025.
 */

import { useCallback } from 'react';

import { usePriorities } from '../hooks/usePriorities.js';
import type { PrioritiesTuple } from '../types.js';

import styles from './Priorities.module.css';
import { PriorityItem } from './PriorityItem.js';

export interface PrioritiesProps {
  /** Current 3-tuple of priorities — controlled. */
  value: PrioritiesTuple;
  /** Emitted on every text edit or checkbox toggle with the updated tuple. */
  onChange: (next: PrioritiesTuple) => void;
}

/**
 * Renders exactly 3 PriorityItem slots in a <section> with ARIA label.
 *
 * Fixed indices 0/1/2 — no add/remove UI (AC-013, US-003 out-of-scope note).
 * Tab order is natural DOM order: checkbox 0 → editor 0 → … (AC-014).
 *
 * Stable per-slot callbacks (useCallback) so React.memo on PriorityItem
 * is not defeated by new function refs when only one slot changes.
 */
export function Priorities({ value, onChange }: PrioritiesProps) {
  const { items, onChangeText, onToggleDone } = usePriorities(value, onChange);

  const handleChangeText0 = useCallback((html: string) => onChangeText(0, html), [onChangeText]);
  const handleChangeText1 = useCallback((html: string) => onChangeText(1, html), [onChangeText]);
  const handleChangeText2 = useCallback((html: string) => onChangeText(2, html), [onChangeText]);

  const handleToggle0 = useCallback(() => onToggleDone(0), [onToggleDone]);
  const handleToggle1 = useCallback(() => onToggleDone(1), [onToggleDone]);
  const handleToggle2 = useCallback(() => onToggleDone(2), [onToggleDone]);

  return (
    <section className={styles.section} aria-label="Prioridades do dia">
      <PriorityItem
        value={items[0]}
        index={0}
        onChangeText={handleChangeText0}
        onToggleDone={handleToggle0}
      />
      <PriorityItem
        value={items[1]}
        index={1}
        onChangeText={handleChangeText1}
        onToggleDone={handleToggle1}
      />
      <PriorityItem
        value={items[2]}
        index={2}
        onChangeText={handleChangeText2}
        onToggleDone={handleToggle2}
      />
    </section>
  );
}
