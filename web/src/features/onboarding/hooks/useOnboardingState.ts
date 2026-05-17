import { useSyncExternalStore } from 'react';

import { readStorage, subscribeStorage, writeStorage } from '../lib/storage.js';
import type { MissionId, OnboardingState, OnboardingStatus } from '../types.js';

const MISSION_IDS: readonly MissionId[] = [
  'M-INTENTION',
  'M-MOOD',
  'M-PRIORITY',
  'M-FORMAT',
  'M-CHECK',
  'M-WRITE',
  'M-GRATITUDE',
  'M-NAVIGATE',
];

function getServerSnapshot(): OnboardingState {
  return {
    schemaVersion: 1,
    status: 'pending',
    missionsCompleted: {
      'M-INTENTION': null,
      'M-MOOD': null,
      'M-PRIORITY': null,
      'M-FORMAT': null,
      'M-CHECK': null,
      'M-WRITE': null,
      'M-GRATITUDE': null,
      'M-NAVIGATE': null,
    },
    completedAt: null,
    completedOnDate: null,
  };
}

export interface OnboardingActions {
  state: OnboardingState;
  setStatus: (status: OnboardingStatus) => void;
  markMission: (id: MissionId, completedAt?: string) => void;
  markAllMissionsCompleted: (date: string) => void;
  dismiss: () => void;
  reopen: () => void;
}

export function useOnboardingState(): OnboardingActions {
  const state = useSyncExternalStore(subscribeStorage, readStorage, getServerSnapshot);

  function setStatus(status: OnboardingStatus): void {
    const current = readStorage();
    writeStorage({ ...current, status });
  }

  function markMission(id: MissionId, completedAt?: string): void {
    const current = readStorage();
    if (current.missionsCompleted[id] !== null) return;
    const timestamp = completedAt ?? new Date().toISOString();
    const newStatus: OnboardingStatus =
      current.status === 'pending' ? 'in_progress' : current.status;
    writeStorage({
      ...current,
      status: newStatus,
      missionsCompleted: { ...current.missionsCompleted, [id]: timestamp },
    });
  }

  function markAllMissionsCompleted(date: string): void {
    const current = readStorage();
    const allDone = MISSION_IDS.every((id) => current.missionsCompleted[id] !== null);
    if (!allDone) return;
    writeStorage({
      ...current,
      status: 'completed',
      completedAt: new Date().toISOString(),
      completedOnDate: date,
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

  return { state, setStatus, markMission, markAllMissionsCompleted, dismiss, reopen };
}
