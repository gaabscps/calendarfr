/**
 * DailyPage — Moleskine layout orchestrator.
 *
 * Composes the 4 domain features (priorities, mood, agenda, notes) in the
 * Moleskine layout via CSS Grid. Manages load/save via useDailyPage and
 * navigation via usePageNavigation.
 *
 * Layout (AC-004):
 *   - Desktop (≥ 1024px): 2-col grid, header full-width
 *     Col 1 (left): Agenda
 *     Col 2 (right): Notes
 *     Header row (full-width): date + nav + priorities + mood
 *   - Mobile (< 768px): 1-col stack
 *
 * Covers: AC-003 (4 features composed via barrel), AC-004 (Grid layout),
 *         AC-005 (PaperSheet wrapper), AC-034–AC-037 (DayLayer animation),
 *         AC-038–AC-042 (a11y).
 */

import type { DailyPageData } from '@calendarfr/shared';
import { useEffect, useRef } from 'react';

import { Agenda } from '@/features/agenda';
import type { AgendaSlots } from '@/features/agenda';
import { MoodPicker } from '@/features/mood';
import { Notes } from '@/features/notes';
import { Priorities } from '@/features/priorities';
import type { PrioritiesTuple } from '@/features/priorities';
import { PaperSheet } from '@/shared/components/PaperSheet';

import { useDailyPage } from '../hooks/useDailyPage.js';
import { usePageNavigation } from '../hooks/usePageNavigation.js';
import { useReducedMotion } from '../hooks/useReducedMotion.js';
import { toLocalIsoDate } from '../lib/formatDate.js';

import styles from './DailyPage.module.css';
import { DayLayer } from './DayLayer.js';
import { LoadErrorScreen } from './LoadErrorScreen.js';
import { LoadingSkeleton } from './LoadingSkeleton.js';
import { PageNavigator } from './PageNavigator.js';

/** AC-001: derive today's date from LOCAL date parts, not UTC */
function getTodayLocal(): string {
  return toLocalIsoDate(new Date());
}

/**
 * Narrow DailyPageData.priorities to PrioritiesTuple.
 * Validates length at runtime (L-MINOR-3: guard against corrupt server payload).
 * After the shared type update, DailyPageData.priorities is already
 * readonly [Priority, Priority, Priority] — structurally identical to PrioritiesTuple.
 */
function toPrioritiesTuple(data: DailyPageData): PrioritiesTuple {
  const p = data.priorities;
  if (p.length < 3) {
    throw new Error(`DailyPage: expected 3 priorities, got ${p.length}`);
  }
  return p;
}

/**
 * Extract DailyPageData.agenda as AgendaSlots.
 * Both are readonly 18-tuples of AgendaSlot — structurally identical.
 */
function toAgendaSlots(data: DailyPageData): AgendaSlots {
  return data.agenda;
}

export interface DailyPageProps {
  /**
   * Optional initial date in YYYY-MM-DD format. Defaults to today (local TZ).
   * Used for E2E test fixture isolation (e.g., 2099-12-31 in Playwright real specs).
   */
  initialDate?: string;
}

export function DailyPage({ initialDate }: DailyPageProps = {}) {
  const today = initialDate ?? getTodayLocal();
  const reducedMotion = useReducedMotion();

  // flushSavePending is captured via ref since it's defined AFTER usePageNavigation.
  // onBeforeChange must fire on EVERY nav path (buttons, keyboard, swipe) so the
  // snapshot-then-fire save lands on the OUTGOING date, not the incoming one.
  const flushSavePendingRef = useRef<(() => Promise<void>) | null>(null);

  const { date, direction, isAnimating, goToPrev, goToNext, swipeProps } = usePageNavigation({
    initialDate: today,
    onBeforeChange: () => flushSavePendingRef.current?.() ?? Promise.resolve(),
  });

  const {
    data,
    loadError,
    saveStatus,
    setPriorities,
    setMood,
    setAgenda,
    setNotes,
    retrySave,
    flushSavePending,
    reload,
  } = useDailyPage(date);

  useEffect(() => {
    flushSavePendingRef.current = flushSavePending;
  }, [flushSavePending]);

  const handlePrev = async () => {
    await goToPrev();
  };

  const handleNext = async () => {
    await goToNext();
  };

  return (
    <PaperSheet as="article" ariaLabel="Planner do dia">
      {/* AC-038: Header region with aria-label */}
      <PageNavigator
        date={date}
        saveStatus={saveStatus}
        isAnimating={isAnimating}
        goToPrev={handlePrev}
        goToNext={handleNext}
        onRetry={retrySave}
      />

      {/* AC-034–AC-037: DayLayer manages animation layers.
          L-MINOR-2: swipeProps on outer DayLayer wrapper so swipe works
          during load (data===null) and error states. */}
      <DayLayer
        date={date}
        direction={direction}
        isAnimating={isAnimating}
        reducedMotion={reducedMotion}
        swipeProps={swipeProps}
      >
        {loadError !== null ? (
          <LoadErrorScreen error={loadError} onReload={reload} />
        ) : data === null ? (
          <LoadingSkeleton />
        ) : (
          <div className={styles.grid}>
            {/* Header row: priorities + mood — full width on desktop, stacked on mobile */}
            <div className={styles.topRow}>
              {/* AC-003: Priorities via barrel only */}
              <div className={styles.prioritiesCol}>
                <h2 className={styles.sectionLabel}>Prioridades</h2>
                <Priorities value={toPrioritiesTuple(data)} onChange={setPriorities} />
              </div>
              {/* AC-003: MoodPicker via barrel only */}
              <MoodPicker value={data.mood} onChange={setMood} />
            </div>

            {/* Left column: Agenda */}
            <div className={styles.agendaCol}>
              {/* AC-023: visible section label */}
              <h2 className={styles.sectionLabel}>Agenda</h2>
              {/* AC-003: Agenda via barrel only */}
              <Agenda value={toAgendaSlots(data)} onChange={setAgenda} />
            </div>

            {/* Right column: Notes */}
            <div className={styles.notesCol}>
              {/* AC-024: visible section label */}
              <h2 className={styles.sectionLabel}>Notas</h2>
              {/* AC-003: Notes via barrel only */}
              <Notes value={data.notes} onChange={setNotes} />
            </div>
          </div>
        )}
      </DayLayer>
    </PaperSheet>
  );
}
