import type { DailyPageData } from '@calendarfr/shared';
import { useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { SaveStatus } from '@/features/daily-page';

import { useOnboardingState } from '../hooks/useOnboardingState.js';
import { deriveMissionProgress } from '../lib/deriveMissionProgress.js';
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

  useEffect(() => {
    const isVisible =
      state.status === 'in_progress' || (state.status === 'completed' && showCompletedReadonly);
    if (!isVisible) return;

    function handler(e: KeyboardEvent): void {
      if (e.key !== 'Escape') return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return;
      const tag = target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (state.status === 'completed') {
        setReadonlyVisible(false);
      } else {
        dismiss();
      }
    }

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
    };
  }, [state.status, showCompletedReadonly, dismiss]);

  useEffect(() => {
    return () => {
      if (ariaTimeoutRef.current !== null) {
        window.clearTimeout(ariaTimeoutRef.current);
      }
    };
  }, []);

  const isMounted =
    state.status === 'in_progress' || (state.status === 'completed' && showCompletedReadonly);

  const dateSlice = state.progressByDate[date] ?? buildEmptyMissionRecord();
  const countCompleted = MISSION_IDS.filter((id) => dateSlice[id] !== null).length;
  const headerLabel = state.status === 'completed' ? 'Roteiro concluído ✓' : 'Roteiro do diário';

  function handleDismiss(): void {
    if (state.status === 'completed') {
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
      <QuestList
        missionsCompleted={dateSlice}
        ariaLiveMessage={ariaLiveMessage}
        onActionClick={handleActionClick}
      />
    </QuestSticky>
  );
}
