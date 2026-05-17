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
import { Gratitude } from '@/features/gratitude';
import { IntentionChip } from '@/features/intention';
import { MoodPopover } from '@/features/mood';
import { Notes } from '@/features/notes';
import { CompletionStampContainer, MissionSealSlot, OnboardingQuest } from '@/features/onboarding';
import { Priorities } from '@/features/priorities';
import { StickyNote } from '@/features/sticky-note';
import { UndoQueueProvider, UndoToastHost, useUndoQueueContext } from '@/features/undo-delete';
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

/**
 * Top-level DailyPage — owns the UndoQueueProvider so children (and the
 * UndoToastHost sibling) share a single undo queue instance. FEAT-022 T-008.
 */
export function DailyPage(props: DailyPageProps = {}) {
  return (
    <UndoQueueProvider>
      <DailyPageInner {...props} />
      {/* AC-014: UndoToastHost mounted at the end of the tree so position:fixed
          stack overlays viewport regardless of PaperSheet/grid layout. */}
      <UndoToastHost />
    </UndoQueueProvider>
  );
}

/**
 * DailyPageInner — consumes the undo queue context to gate autosave while
 * undo toasts are pending and to flush the queue on date change / unmount.
 */
function DailyPageInner({ initialDate }: DailyPageProps = {}) {
  const today = initialDate ?? getTodayLocal();
  const reducedMotion = useReducedMotion();

  // FEAT-022 AC-014/AC-015: Gate autosave while undo toasts are pending,
  // and flush the queue when the date changes or the component unmounts.
  const { queue, flushAll } = useUndoQueueContext();
  const gateOpen = queue.length === 0;

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
    setIntention,
    setGratitude,
    retrySave,
    flushSavePending,
    reload,
  } = useDailyPage(date, { gateOpen });

  useEffect(() => {
    flushSavePendingRef.current = flushSavePending;
  }, [flushSavePending]);

  // AC-015: flush pending undo entries when date changes or component unmounts.
  // flushAll commits (does NOT call undoFn), so the post-flush state is what gets
  // autosaved by the existing autosave loop on the OUTGOING date.
  useEffect(() => {
    return () => {
      flushAll();
    };
  }, [date, flushAll]);

  const handlePrev = async () => {
    await goToPrev();
  };

  const handleNext = async () => {
    await goToNext();
  };

  return (
    <>
      <PaperSheet as="article" ariaLabel="Planner do dia">
        {/* AC-038: Header region with aria-label.
            MoodPopover renderizado como moodSlot — substitui o MoodPicker
            grande da topRow por chip compacto ao lado da data. */}
        <PageNavigator
          date={date}
          saveStatus={saveStatus}
          isAnimating={isAnimating}
          goToPrev={handlePrev}
          goToNext={handleNext}
          onRetry={retrySave}
          moodSlot={data !== null ? <MoodPopover value={data.mood} onChange={setMood} /> : null}
          intentionSlot={
            data !== null ? <IntentionChip value={data.intention} onChange={setIntention} /> : null
          }
          sealSlot={<MissionSealSlot date={date} data={data} />}
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
            <>
              <div className={styles.grid}>
                {/* Header row: Priorities (manhã) + Gratitude (noite) lado a lado.
                  Mood + Intention vivem no PageNavigator. */}
                <div className={styles.topRow}>
                  {/* AC-003: Priorities via barrel only */}
                  <div className={styles.prioritiesCol}>
                    <h2 className={styles.sectionLabel}>Prioridades</h2>
                    <Priorities value={data.priorities} onChange={setPriorities} />
                  </div>
                  <div className={styles.gratitudeCol}>
                    <h2 className={styles.sectionLabel}>Gratidão</h2>
                    <Gratitude value={data.gratitude} onChange={setGratitude} />
                  </div>
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
            </>
          )}
        </DayLayer>
        <CompletionStampContainer date={date} />
        {/* StickyNote tabs anchored INSIDE PaperSheet (absolute, right edge,
            poke out ~10px) — fazem parte da página. Panels seguem position:fixed
            por causa do drag persistido. */}
        <StickyNote />
        <OnboardingQuest data={data} date={date} saveStatus={saveStatus} />
      </PaperSheet>
    </>
  );
}
