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

export function DailyPage() {
  const today = getTodayLocal();
  const reducedMotion = useReducedMotion();

  // Navigation state (date, direction, isAnimating, goTo*, swipeProps)
  const { date, direction, isAnimating, goToPrev, goToNext, swipeProps } = usePageNavigation({
    initialDate: today,
    // flushSavePending is wired as onBeforeChange after useDailyPage is called below
  });

  // Load/save state for current date
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

  // Wire flushSavePending into navigation (usePageNavigation onBeforeChange is a ref,
  // so we can't pass it directly at construction. We call it via the goTo* wrappers
  // by using the swipeProps pattern — but the hook already manages this via useEffect.
  // For the nav buttons, we wrap the handlers to flush before navigating.)

  const handlePrev = async () => {
    await flushSavePending();
    await goToPrev();
  };

  const handleNext = async () => {
    await flushSavePending();
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
              <Priorities value={toPrioritiesTuple(data)} onChange={setPriorities} />
              {/* AC-003: MoodPicker via barrel only */}
              <MoodPicker value={data.mood} onChange={setMood} />
            </div>

            {/* Left column: Agenda */}
            <div className={styles.agendaCol}>
              {/* AC-003: Agenda via barrel only */}
              <Agenda value={toAgendaSlots(data)} onChange={setAgenda} />
            </div>

            {/* Right column: Notes */}
            <div className={styles.notesCol}>
              {/* AC-003: Notes via barrel only */}
              <Notes value={data.notes} onChange={setNotes} />
            </div>
          </div>
        )}
      </DayLayer>
    </PaperSheet>
  );
}
