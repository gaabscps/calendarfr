import type { DailyPageData } from '@calendarfr/shared';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useNavigationTracker } from '../hooks/useNavigationTracker.js';
import { useOnboardingState } from '../hooks/useOnboardingState.js';
import { deriveMissionProgress } from '../lib/deriveMissionProgress.js';
import { MISSIONS } from '../lib/missions.js';
import {
  getReadonlyVisible,
  setReadonlyVisible,
  subscribeReadonlyVisible,
} from '../lib/readonlyController.js';
import type { MissionId } from '../types.js';

import { QuestList } from './QuestList.js';
import { QuestSticky } from './QuestSticky.js';

export interface OnboardingQuestProps {
  data: DailyPageData | null;
  date: string;
}

const MISSION_IDS: readonly MissionId[] = MISSIONS.map((m) => m.id);

export function OnboardingQuest({ data, date }: OnboardingQuestProps) {
  const { state, setStatus, markMission, markAllMissionsCompleted, dismiss } = useOnboardingState();
  const navOccurred = useNavigationTracker(date);
  const showCompletedReadonly = useSyncExternalStore(subscribeReadonlyVisible, getReadonlyVisible);
  const [ariaLiveMessage, setAriaLiveMessage] = useState('');
  const ariaTimeoutRef = useRef<number | null>(null);
  const completionDateRef = useRef<string | null>(null);
  const markAllCalledRef = useRef(false);

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
    if (data === null) return;
    const next = deriveMissionProgress(data, state.missionsCompleted, navOccurred);
    let newlyMarked = 0;
    for (const id of MISSION_IDS) {
      if (next[id] !== null && state.missionsCompleted[id] === null) {
        markMission(id, next[id] ?? undefined);
        newlyMarked++;
        const mission = MISSIONS.find((m) => m.id === id);
        const num = MISSIONS.findIndex((m) => m.id === id) + 1;
        if (mission) {
          announceAriaMessage(`Missão ${num} de 8 concluída: ${mission.label}`);
        }
      }
    }
    if (newlyMarked > 0) {
      const pendingAfter = MISSION_IDS.filter(
        (id) => state.missionsCompleted[id] === null && next[id] === null,
      );
      if (pendingAfter.length === 0) {
        completionDateRef.current = date;
      }
    }
  }, [data, state.missionsCompleted, navOccurred, markMission, announceAriaMessage, date]);

  useEffect(() => {
    if (state.status !== 'in_progress') return;
    const allDone = MISSION_IDS.every((id) => state.missionsCompleted[id] !== null);
    if (allDone && !markAllCalledRef.current) {
      markAllCalledRef.current = true;
      markAllMissionsCompleted(completionDateRef.current ?? date);
      announceAriaMessage(
        'Todas as 8 missões concluídas. Você ganhou o carimbo de Planner Iniciado!',
      );
    }
  }, [state.status, state.missionsCompleted, date, markAllMissionsCompleted, announceAriaMessage]);

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

  const countCompleted = MISSION_IDS.filter((id) => state.missionsCompleted[id] !== null).length;
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
      ariaLabel={`Roteiro do diário, ${countCompleted} de 8 missões`}
      headerLabel={headerLabel}
      onDismiss={handleDismiss}
    >
      <QuestList missionsCompleted={state.missionsCompleted} ariaLiveMessage={ariaLiveMessage} />
    </QuestSticky>
  );
}
