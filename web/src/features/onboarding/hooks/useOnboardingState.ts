import { useSyncExternalStore } from 'react';

import { MISSION_IDS } from '../lib/missions.js';
import {
  buildEmptyMissionRecord,
  readStorage,
  subscribeStorage,
  writeStorage,
} from '../lib/storage.js';
import type { MissionId, OnboardingState, OnboardingStatus } from '../types.js';

function getServerSnapshot(): OnboardingState {
  return {
    schemaVersion: 2,
    progressByDate: {},
    completedAt: null,
    completedOnDate: null,
    status: 'pending',
  };
}

export interface OnboardingActions {
  state: OnboardingState;
  setStatus: (status: OnboardingStatus) => void;
  markMission: (id: MissionId, dateIso: string, completedAt?: string) => void;
  dismiss: () => void;
  reopen: () => void;
}

export function useOnboardingState(): OnboardingActions {
  const state = useSyncExternalStore(subscribeStorage, readStorage, getServerSnapshot);

  function setStatus(status: OnboardingStatus): void {
    const current = readStorage();
    writeStorage({ ...current, status });
  }

  function markMission(id: MissionId, dateIso: string, completedAt?: string): void {
    const current = readStorage();
    const existing = current.progressByDate[dateIso] ?? buildEmptyMissionRecord();
    if (existing[id] !== null && existing[id] !== undefined) return;
    const nowIso = new Date().toISOString();
    const timestamp = completedAt ?? nowIso;
    const updatedDay = { ...existing, [id]: timestamp };
    const updatedProgressByDate = { ...current.progressByDate, [dateIso]: updatedDay };
    let newStatus = current.status;
    let newCompletedAt = current.completedAt;
    let newCompletedOnDate = current.completedOnDate;
    const allDone = MISSION_IDS.every((mid) => updatedDay[mid] !== null);
    if (
      allDone &&
      (current.status === 'pending' || current.status === 'in_progress') &&
      current.completedOnDate === null
    ) {
      newStatus = 'completed';
      newCompletedAt = nowIso;
      newCompletedOnDate = dateIso;
    }
    writeStorage({
      ...current,
      progressByDate: updatedProgressByDate,
      status: newStatus,
      completedAt: newCompletedAt,
      completedOnDate: newCompletedOnDate,
    });
  }

  function dismiss(): void {
    const current = readStorage();
    writeStorage({ ...current, status: 'dismissed' });
  }

  function reopen(): void {
    const current = readStorage();
    if (current.status === 'dismissed' || current.status === 'pending') {
      writeStorage({ ...current, status: 'in_progress' });
    }
  }

  return { state, setStatus, markMission, dismiss, reopen };
}
