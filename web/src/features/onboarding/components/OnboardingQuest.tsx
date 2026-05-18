import type { DailyPageData } from '@calendarfr/shared';
import { useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { SaveStatus } from '@/features/daily-page';

import { useOnboardingState } from '../hooks/useOnboardingState.js';
import {
  deriveMissionProgress,
  selectVisibleMissionCompletion,
} from '../lib/deriveMissionProgress.js';
import { goToMission } from '../lib/goToMission.js';
import { MISSION_IDS, MISSIONS } from '../lib/missions.js';
import {
  getReadonlyVisible,
  setReadonlyVisible,
  subscribeReadonlyVisible,
} from '../lib/readonlyController.js';
import { buildEmptyMissionRecord } from '../lib/storage.js';
import type { MissionId } from '../types.js';

import { QuestList } from './QuestList.js';
import { QuestSticky } from './QuestSticky.js';

export interface OnboardingQuestProps {
  data: DailyPageData | null;
  date: string;
  saveStatus?: SaveStatus;
}

export function OnboardingQuest({ data, date, saveStatus = 'saved' }: OnboardingQuestProps) {
  const { state, setStatus, markMission, dismiss } = useOnboardingState();
  const showCompletedReadonly = useSyncExternalStore(subscribeReadonlyVisible, getReadonlyVisible);
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');
  const ariaTimeoutRef = useRef<number | null>(null);
  const lastReconciledDateRef = useRef<string | null>(null);
  const prevSaveStatusRef = useRef<SaveStatus | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const handleActionClick = useCallback(
    (missionId: MissionId) => goToMission(missionId, prefersReducedMotion ?? false),
    [prefersReducedMotion],
  );

  const announceAriaMessage = useCallback((msg: string) => {
    setAriaLiveMessage(msg);
    if (ariaTimeoutRef.current !== null) {
      window.clearTimeout(ariaTimeoutRef.current);
    }
    ariaTimeoutRef.current = window.setTimeout(() => {
      setAriaLiveMessage('');
      ariaTimeoutRef.current = null;
    }, 3000);
  }, []);

  useEffect(() => {
    if (state.status === 'pending') {
      setStatus('in_progress');
    }
  }, [state.status, setStatus]);

  useEffect(() => {
    if (data === null) {
      prevSaveStatusRef.current = saveStatus;
      return;
    }
    const dateSlice = state.progressByDate[date] ?? buildEmptyMissionRecord();
    let shouldDerive = false;
    if (lastReconciledDateRef.current !== date) {
      shouldDerive = true;
      lastReconciledDateRef.current = date;
    }
    if (prevSaveStatusRef.current === 'saving' && saveStatus === 'saved') {
      shouldDerive = true;
    }
    if (shouldDerive) {
      const next = deriveMissionProgress(data, dateSlice);
      for (const id of MISSION_IDS) {
        if (next[id] !== null && dateSlice[id] === null) {
          markMission(id, date, next[id] ?? undefined);
          const mission = MISSIONS.find((m) => m.id === id);
          const num = MISSIONS.findIndex((m) => m.id === id) + 1;
          if (mission) {
            announceAriaMessage(`Missão ${num} de 7 concluída: ${mission.label}`);
          }
        }
      }
    }
    prevSaveStatusRef.current = saveStatus;
  }, [data, saveStatus, date, state.progressByDate, markMission, announceAriaMessage]);

  const dateSlice = state.progressByDate[date] ?? buildEmptyMissionRecord();
  // Visible (per-mission) completion = persisted timestamp AND current content still satisfies
  // the mission condition. Storage stays append-only (AC-017); this is a read-side projection
  // so the sticky reflects real content state — e.g. if the user deletes their gratitude
  // entry, M-GRATITUDE flips back to pending in the UI.
  const visibleSlice = selectVisibleMissionCompletion(data, dateSlice);
  const currentDayComplete = MISSION_IDS.every((id) => visibleSlice[id] !== null);
  const countCompleted = MISSION_IDS.filter((id) => visibleSlice[id] !== null).length;

  // Per-day visibility: sticky auto-shows whenever today is not 7/7, regardless of the global
  // `status` flag (which latches to 'completed' on the user's first 7/7 day and never reverts).
  // Hidden when: user explicitly dismissed, OR today is fully complete (unless reopened readonly).
  const isMounted = state.status !== 'dismissed' && (!currentDayComplete || showCompletedReadonly);

  useEffect(() => {
    if (!isMounted) return;

    function handler(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (showCompletedReadonly) {
        setReadonlyVisible(false);
      } else if (currentDayComplete) {
        // safety net: should not happen since hidden when complete + !readonly
        return;
      } else {
        dismiss();
      }
    }

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [isMounted, showCompletedReadonly, currentDayComplete, dismiss]);

  useEffect(() => {
    return () => {
      if (ariaTimeoutRef.current !== null) {
        window.clearTimeout(ariaTimeoutRef.current);
      }
    };
  }, []);

  const headerLabel = currentDayComplete ? 'Roteiro concluído ✓' : 'Roteiro do diário';

  function handleDismiss(): void {
    if (showCompletedReadonly) {
      setReadonlyVisible(false);
    } else {
      dismiss();
    }
  }

  return (
    <QuestSticky
      visible={isMounted}
      ariaLabel={`Roteiro do diário, ${countCompleted} de 7 missões`}
      headerLabel={headerLabel}
      onDismiss={handleDismiss}
    >
      {/* key={date} força QuestList + descendentes (QuestSeal etc) a remontar
          quando o usuário navega entre dias. Sem isso, os refs internos do
          QuestSeal (wasCompletedOnMount, previousCompletedRef) capturam o
          estado do PRIMEIRO dia montado e nunca resetam, silenciando
          mission-complete em todos os dias seguintes. */}
      <QuestList
        key={date}
        missionsCompleted={visibleSlice}
        ariaLiveMessage={ariaLiveMessage}
        onActionClick={handleActionClick}
      />
    </QuestSticky>
  );
}
