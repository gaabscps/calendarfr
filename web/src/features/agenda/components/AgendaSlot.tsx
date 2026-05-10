/**
 * AgendaSlot — single timeline row: hour label + RichTextLine.
 *
 * Wrapped in React.memo with default shallow comparator.
 * Props are primitives + a stable callback — memo prevents re-renders of the
 * 17 other slots when only one changes (NFR-002).
 *
 * Covers: AC-002, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, NFR-002.
 */

import React from 'react';

import { RichTextLine } from '@/features/rich-text-line';

import { formatHourAriaLabel, formatHourLabel } from '../lib/formatHour.js';
import type { AgendaSlot as AgendaSlotType } from '../types.js';

import styles from './AgendaSlot.module.css';

export interface AgendaSlotProps {
  /** The current slot value — { hour, text }. */
  slot: AgendaSlotType;
  /**
   * Called with the new HTML string when the editor content changes.
   * Must be referentially stable across parent re-renders so React.memo works.
   */
  onChange: (text: string) => void;
  /**
   * True when this slot's hour matches the current system hour.
   * Drives the visual highlight and aria-current="time".
   * Covers AC-018.
   */
  isCurrentHour: boolean;
}

/**
 * Single agenda timeline row.
 *
 * DOM structure per slot:
 *   <div [slot wrapper]>
 *     <span aria-hidden="true">06</span>    ← decorative hour label
 *     <div [editor area]>
 *       <RichTextLine ariaLabel="Agenda das 6 horas" ... />
 *     </div>
 *   </div>
 *
 * Tab order: only the RichTextLine editor is focusable — the label is
 * aria-hidden and pointer-events:none. Tab order is natural DOM order (AC-014).
 *
 * Placeholder: empty string (no visual noise for 18 lines — spec open question
 * resolved to "no placeholder" to avoid cluttering the timeline).
 */
function AgendaSlotBase({ slot, onChange, isCurrentHour }: AgendaSlotProps) {
  const slotClassName = [styles.slot, isCurrentHour ? styles.currentHour : '']
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={slotClassName}
      data-current-hour={isCurrentHour ? 'true' : undefined}
      aria-current={isCurrentHour ? 'time' : undefined}
      data-testid={`slot-${String(slot.hour)}`}
    >
      {/* Decorative hour label — aria-hidden so screen readers use the
          editor's ariaLabel instead (AC-016: no duplicate announcement). */}
      <span aria-hidden="true" className={styles.label}>
        {formatHourLabel(slot.hour)}
      </span>

      {/* Editor — fills remaining width. ariaLabel provides full PT-BR
          accessibility label ("Agenda das N horas") per AC-015. */}
      <div className={styles.editor}>
        <RichTextLine
          value={slot.text}
          onChange={onChange}
          placeholder=""
          ariaLabel={formatHourAriaLabel(slot.hour)}
        />
      </div>
    </div>
  );
}

export const AgendaSlot = React.memo(AgendaSlotBase);
AgendaSlot.displayName = 'AgendaSlot';
