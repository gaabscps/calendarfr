/**
 * AgendaSlot — single timeline row: EnergyButton + hour label + RichTextBlock.
 *
 * Wrapped in React.memo with default shallow comparator.
 * Props are primitives + stable callbacks — memo prevents re-renders of the
 * 17 other slots when only one changes (NFR-002).
 *
 * Covers: AC-002, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018, NFR-002.
 */

import React from 'react';

import { EnergyButton, useEnergySuggestion } from '@/features/energy';
import type { Energy } from '@/features/energy';
import { RichTextBlock } from '@/features/rich-text-line';
import type { RichTextEditorRef } from '@/features/rich-text-line';

import { formatHourAriaLabel, formatHourLabel } from '../lib/formatHour.js';
import type { AgendaSlot as AgendaSlotType } from '../types.js';

import styles from './AgendaSlot.module.css';

export interface AgendaSlotProps {
  /** The current slot value — { hour, text, energy }. */
  slot: AgendaSlotType;
  /**
   * Called with the new HTML string when the editor content changes.
   * Must be referentially stable across parent re-renders so React.memo works.
   */
  onChange: (text: string) => void;
  /**
   * Called with the new Energy (or null to clear) when the EnergyButton is used.
   * Must be referentially stable across parent re-renders so React.memo works.
   */
  onEnergyChange: (energy: Energy | null) => void;
  /**
   * True when this slot's hour matches the current system hour.
   * Drives the visual highlight and aria-current="time".
   * Covers AC-018.
   */
  isCurrentHour: boolean;
  /**
   * Called (no args) when the user presses SHIFT+ENTER in this slot.
   * Moves focus to the next slot (circular). AC-009.
   */
  onShiftEnter?: () => void;
  /**
   * Ref to the editor instance (set by RichTextBlock on mount) for this slot.
   * Used by parent (Agenda) to programmatically focus this editor. AC-009, AC-011.
   */
  editorRef?: RichTextEditorRef;
}

/**
 * Single agenda timeline row.
 *
 * DOM structure per slot:
 *   <div [slot wrapper]>
 *     <EnergyButton />                      ← energy emoji picker
 *     <span aria-hidden="true">06</span>    ← decorative hour label
 *     <div [editor area]>
 *       <RichTextBlock ariaLabel="Agenda das 6 horas" ... />
 *     </div>
 *   </div>
 *
 * Tab order: only the RichTextBlock editor and EnergyButton are focusable —
 * the label is aria-hidden and pointer-events:none. Tab order is natural DOM
 * order (AC-014).
 *
 * Placeholder: empty string (no visual noise for 18 lines — spec open question
 * resolved to "no placeholder" to avoid cluttering the timeline).
 */
function AgendaSlotBase({
  slot,
  onChange,
  onEnergyChange,
  isCurrentHour,
  onShiftEnter,
  editorRef,
}: AgendaSlotProps) {
  const slotClassName = [styles.slot, isCurrentHour ? styles.currentHour : '']
    .filter(Boolean)
    .join(' ');

  const suggestion = useEnergySuggestion(slot.text);

  return (
    <div
      className={slotClassName}
      data-current-hour={isCurrentHour ? 'true' : undefined}
      aria-current={isCurrentHour ? 'time' : undefined}
      data-testid={`slot-${String(slot.hour)}`}
    >
      {/* Energy emoji picker — positioned before hour label (left-most).
          Normalize undefined → null (shared type allows undefined for wire compat). */}
      <EnergyButton
        energy={slot.energy ?? null}
        suggestion={suggestion}
        onChange={onEnergyChange}
        hour={slot.hour}
      />

      {/* Decorative hour label — aria-hidden so screen readers use the
          editor's ariaLabel instead (AC-016: no duplicate announcement). */}
      <span aria-hidden="true" className={styles.label}>
        {formatHourLabel(slot.hour)}
      </span>

      {/* Editor — fills remaining width. ariaLabel provides full PT-BR
          accessibility label ("Agenda das N horas") per AC-015. */}
      <div className={styles.editor}>
        <RichTextBlock
          value={slot.text}
          onChange={onChange}
          placeholder=""
          ariaLabel={formatHourAriaLabel(slot.hour)}
          {...(onShiftEnter !== undefined ? { onShiftEnter } : {})}
          {...(editorRef !== undefined ? { editorRef } : {})}
        />
      </div>
    </div>
  );
}

export const AgendaSlot = React.memo(AgendaSlotBase);
AgendaSlot.displayName = 'AgendaSlot';
