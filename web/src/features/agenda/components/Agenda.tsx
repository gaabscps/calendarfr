/**
 * Agenda — controlled container for the fixed 18-slot hourly timeline.
 *
 * Purely controlled: receives value + onChange, no internal async, no fetch.
 * Delegates slot-text update to useAgenda hook and normalises defensive input
 * via normalizeAgenda before mapping.
 *
 * Covers: AC-002, AC-009, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018,
 *         AC-019, AC-022, AC-027, NFR-001, NFR-002.
 */

import type { Energy } from '@calendarfr/shared';
import { useMemo } from 'react';

import type { RichTextEditorRef } from '@/features/rich-text-line';

import { useAgenda } from '../hooks/useAgenda.js';
import { useCurrentHour } from '../hooks/useCurrentHour.js';
import { normalizeAgenda } from '../lib/normalizeAgenda.js';
import { AGENDA_HOURS } from '../types.js';
import type { AgendaSlots } from '../types.js';

import styles from './Agenda.module.css';
import { AgendaSlot } from './AgendaSlot.js';

export interface AgendaProps {
  /** Current controlled agenda slots (18-tuple). */
  value: AgendaSlots;
  /** Emitted on every text edit with the updated AgendaSlots. */
  onChange: (next: AgendaSlots) => void;
  /**
   * @internal — used only for testability (jest/Storybook).
   * Overrides the initial "now" for current-hour computation.
   * Not exported from the feature barrel; consumers must NOT rely on this prop.
   */
  now?: Date;
}

/**
 * Renders exactly 18 AgendaSlot rows in hour order 6 → 23.
 *
 * Performance (NFR-002):
 *   `useAgenda` returns an `onChangeText` that is stable across `value`
 *   changes (it reads `value` via an internal ref). Per-slot wrappers are
 *   built once per `onChangeText` identity — so under typical usage they
 *   are permanently stable. AgendaSlot is `React.memo`'d, so editing one
 *   slot does not re-render the other 17 (verified by NFR-002 tests).
 *
 * Tab order (AC-014):
 *   DOM order is linear hour 6 → 23. No tabIndex hacks. The label <span> is
 *   aria-hidden so it is skipped; only the RichTextLine editors are tab stops.
 */
export function Agenda({ value, onChange, now }: AgendaProps) {
  const { onChangeText, onChangeEnergy } = useAgenda(value, onChange);

  // Normalise defensively — corrupted payloads (AC-008) still render 18 slots.
  const slots = useMemo(() => normalizeAgenda(value), [value]);

  // Current hour updates automatically within ≤1s of the hour change.
  const currentHour = useCurrentHour(now);

  // Per-hour onChange wrappers, keyed by hour. Rebuilt only when onChangeText
  // identity changes — which now only happens when the parent's onChange
  // changes (typically never). Result: stable handler refs feed React.memo.
  const slotHandlers = useMemo(() => {
    const map = new Map<number, (html: string) => void>();
    for (const hour of AGENDA_HOURS) {
      map.set(hour, (html: string) => onChangeText(hour, html));
    }
    return map;
  }, [onChangeText]);

  // Per-hour energy wrappers — same stable pattern as slotHandlers.
  // React.memo on AgendaSlot remains effective because onChangeEnergy
  // has permanent identity (useCallback with no deps).
  const slotEnergyHandlers = useMemo(() => {
    const map = new Map<number, (energy: Energy | null) => void>();
    for (const hour of AGENDA_HOURS) {
      map.set(hour, (energy) => onChangeEnergy(hour, energy));
    }
    return map;
  }, [onChangeEnergy]);

  // Stable refs map — created once (no deps). Each ref holds the Tiptap Editor
  // instance for that hour slot, populated by RichTextBlock via editorRef prop.
  // AC-009, AC-011.
  const editorRefs = useMemo(() => {
    const map = new Map<number, RichTextEditorRef>();
    for (const hour of AGENDA_HOURS) {
      map.set(hour, { current: null });
    }
    return map;
  }, []);

  // SHIFT+ENTER handlers — one per slot. Each handler focuses the next slot's
  // editor at the end of its content (circular: 23h → 06h).
  // AC-009: consumes event (handled by useRichTextBlock returning true).
  // AC-010: (i + 1) % AGENDA_HOURS.length ensures 23h wraps to 06h.
  // AC-011: editor.commands.focus('end') positions cursor at end.
  const slotShiftEnterHandlers = useMemo(() => {
    const map = new Map<number, () => void>();
    for (let i = 0; i < AGENDA_HOURS.length; i++) {
      const nextHour = AGENDA_HOURS[(i + 1) % AGENDA_HOURS.length]!;
      map.set(AGENDA_HOURS[i]!, () => {
        editorRefs.get(nextHour)?.current?.commands.focus('end');
      });
    }
    return map;
  }, [editorRefs]);

  return (
    <section className={styles.section} aria-label="Agenda do dia" data-onboarding-target="agenda">
      {slots.map((slot) => (
        <AgendaSlot
          key={slot.hour}
          slot={slot}
          // slotHandlers is keyed by AGENDA_HOURS, slots is normalised to the
          // same set, so .get is always defined. `!` is sound here.
          onChange={slotHandlers.get(slot.hour)!}
          onEnergyChange={slotEnergyHandlers.get(slot.hour)!}
          isCurrentHour={slot.hour === currentHour}
          onShiftEnter={slotShiftEnterHandlers.get(slot.hour)!}
          editorRef={editorRefs.get(slot.hour)!}
        />
      ))}
    </section>
  );
}
