import { act, renderHook } from '@testing-library/react';

import { CUSTOM_EVENT_NAME, STORAGE_KEY } from '../../lib/constants.js';
import type { OnboardingState } from '../../types.js';
import { useOnboardingState } from '../useOnboardingState.js';

const MISSION_IDS = [
  'M-INTENTION',
  'M-MOOD',
  'M-PRIORITY',
  'M-FORMAT',
  'M-CHECK',
  'M-WRITE',
  'M-GRATITUDE',
  'M-NAVIGATE',
] as const;

function makeAllNull(): Record<string, null> {
  return Object.fromEntries(MISSION_IDS.map((id) => [id, null]));
}

function makeAllTimestamped(ts = '2026-05-17T10:00:00.000Z'): Record<string, string> {
  return Object.fromEntries(MISSION_IDS.map((id) => [id, ts]));
}

function setStorageState(state: Partial<OnboardingState>) {
  const full: OnboardingState = {
    schemaVersion: 1,
    status: 'pending',
    missionsCompleted: makeAllNull() as OnboardingState['missionsCompleted'],
    completedAt: null,
    completedOnDate: null,
    ...state,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
}

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('useOnboardingState — markMission latching', () => {
  it('markMission uses current ISO timestamp when completedAt not provided', () => {
    const before = Date.now();
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-MOOD');
    });
    const ts = result.current.state.missionsCompleted['M-MOOD'];
    expect(ts).not.toBeNull();
    const parsed = new Date(ts!).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(Date.now());
  });

  it('markMission latches — second call for same mission preserves first timestamp', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', '2026-05-17T10:00:00.000Z');
    });
    act(() => {
      result.current.markMission('M-INTENTION', '2026-05-17T12:00:00.000Z');
    });
    expect(result.current.state.missionsCompleted['M-INTENTION']).toBe('2026-05-17T10:00:00.000Z');
  });

  it('intra-tab mutations are serialized last-write-wins', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', '2026-05-17T10:00:00.000Z');
      result.current.markMission('M-MOOD', '2026-05-17T10:01:00.000Z');
    });
    expect(result.current.state.missionsCompleted['M-INTENTION']).toBe('2026-05-17T10:00:00.000Z');
    expect(result.current.state.missionsCompleted['M-MOOD']).toBe('2026-05-17T10:01:00.000Z');
  });
});

describe('useOnboardingState — markAllMissionsCompleted', () => {
  it('is a no-op when any mission is null', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.setStatus('in_progress');
    });
    const statusBefore = result.current.state.status;
    act(() => {
      result.current.markAllMissionsCompleted('2026-05-17');
    });
    expect(result.current.state.status).toBe(statusBefore);
    expect(result.current.state.completedAt).toBeNull();
    expect(result.current.state.completedOnDate).toBeNull();
  });

  it('flips status to completed when all 8 missions have timestamps', () => {
    setStorageState({
      status: 'in_progress',
      missionsCompleted: makeAllTimestamped() as OnboardingState['missionsCompleted'],
    });
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markAllMissionsCompleted('2026-05-17');
    });
    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.completedOnDate).toBe('2026-05-17');
    expect(result.current.state.completedAt).not.toBeNull();
  });

  it('flips status when all 8 missions set via markMission calls', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      MISSION_IDS.forEach((id, i) => {
        result.current.markMission(id, `2026-05-17T10:0${i}:00.000Z`);
      });
    });
    act(() => {
      result.current.markAllMissionsCompleted('2026-05-17');
    });
    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.completedOnDate).toBe('2026-05-17');
  });
});

describe('useOnboardingState — multi-tab sync', () => {
  it('syncs state via storage event from another tab', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.state.status).toBe('pending');

    const newState: OnboardingState = {
      schemaVersion: 1,
      status: 'in_progress',
      missionsCompleted: {
        'M-INTENTION': '2026-05-17T10:00:00.000Z',
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
    act(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      window.dispatchEvent(new globalThis.StorageEvent('storage', { key: STORAGE_KEY }));
    });

    expect(result.current.state.status).toBe('in_progress');
    expect(result.current.state.missionsCompleted['M-INTENTION']).toBe('2026-05-17T10:00:00.000Z');
  });

  it('syncs state via custom event (same-tab)', () => {
    const { result } = renderHook(() => useOnboardingState());

    const newState: OnboardingState = {
      schemaVersion: 1,
      status: 'dismissed',
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
    act(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
    });

    expect(result.current.state.status).toBe('dismissed');
  });
});
