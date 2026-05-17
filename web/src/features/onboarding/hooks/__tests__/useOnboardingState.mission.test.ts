import { act, renderHook } from '@testing-library/react';

import { CUSTOM_EVENT_NAME, STORAGE_KEY } from '../../lib/constants.js';
import type { MissionId, OnboardingState } from '../../types.js';
import { useOnboardingState } from '../useOnboardingState.js';

const MISSION_IDS: readonly MissionId[] = [
  'M-INTENTION',
  'M-MOOD',
  'M-PRIORITY',
  'M-FORMAT',
  'M-CHECK',
  'M-WRITE',
  'M-GRATITUDE',
];

const DATE_A = '2026-05-17';
const DATE_B = '2026-05-18';

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('useOnboardingState — markMission latching', () => {
  it('markMission uses current ISO timestamp when completedAt not provided', () => {
    const before = Date.now();
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-MOOD', DATE_A);
    });
    const ts = result.current.state.progressByDate[DATE_A]?.['M-MOOD'];
    expect(ts).not.toBeNull();
    const parsed = new Date(ts!).getTime();
    expect(parsed).toBeGreaterThanOrEqual(before);
    expect(parsed).toBeLessThanOrEqual(Date.now());
  });

  it('markMission latches per-date — second call for same (date, mission) preserves first timestamp', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', DATE_A, '2026-05-17T10:00:00.000Z');
    });
    act(() => {
      result.current.markMission('M-INTENTION', DATE_A, '2026-05-17T12:00:00.000Z');
    });
    expect(result.current.state.progressByDate[DATE_A]?.['M-INTENTION']).toBe(
      '2026-05-17T10:00:00.000Z',
    );
  });

  it('markMission for same mission on different dates stores independently', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', DATE_A, '2026-05-17T10:00:00.000Z');
      result.current.markMission('M-INTENTION', DATE_B, '2026-05-18T10:00:00.000Z');
    });
    expect(result.current.state.progressByDate[DATE_A]?.['M-INTENTION']).toBe(
      '2026-05-17T10:00:00.000Z',
    );
    expect(result.current.state.progressByDate[DATE_B]?.['M-INTENTION']).toBe(
      '2026-05-18T10:00:00.000Z',
    );
  });

  it('intra-tab mutations are serialized last-write-wins', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', DATE_A, '2026-05-17T10:00:00.000Z');
      result.current.markMission('M-MOOD', DATE_A, '2026-05-17T10:01:00.000Z');
    });
    expect(result.current.state.progressByDate[DATE_A]?.['M-INTENTION']).toBe(
      '2026-05-17T10:00:00.000Z',
    );
    expect(result.current.state.progressByDate[DATE_A]?.['M-MOOD']).toBe(
      '2026-05-17T10:01:00.000Z',
    );
  });
});

describe('useOnboardingState — auto-promotion (AC-018)', () => {
  it('marking all 7 missions for dateA auto-flips status to completed with completedOnDate=dateA', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      MISSION_IDS.forEach((id, i) => {
        result.current.markMission(id, DATE_A, `2026-05-17T10:0${i}:00.000Z`);
      });
    });
    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.completedOnDate).toBe(DATE_A);
    expect(result.current.state.completedAt).not.toBeNull();
  });

  it('after completing dateA, marking all 7 missions for dateB keeps status completed (carimbo one-time)', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      MISSION_IDS.forEach((id, i) => {
        result.current.markMission(id, DATE_A, `2026-05-17T10:0${i}:00.000Z`);
      });
    });
    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.completedOnDate).toBe(DATE_A);
    act(() => {
      MISSION_IDS.forEach((id, i) => {
        result.current.markMission(id, DATE_B, `2026-05-18T10:0${i}:00.000Z`);
      });
    });
    expect(result.current.state.status).toBe('completed');
    expect(result.current.state.completedOnDate).toBe(DATE_A);
    expect(result.current.state.progressByDate[DATE_B]).toBeDefined();
    MISSION_IDS.forEach((id) => {
      expect(result.current.state.progressByDate[DATE_B]?.[id]).not.toBeNull();
    });
  });

  it('marking 6 of 7 missions does NOT auto-promote', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      MISSION_IDS.slice(0, 6).forEach((id, i) => {
        result.current.markMission(id, DATE_A, `2026-05-17T10:0${i}:00.000Z`);
      });
    });
    expect(result.current.state.status).not.toBe('completed');
    expect(result.current.state.completedOnDate).toBeNull();
  });
});

describe('useOnboardingState — multi-tab sync (AC-021)', () => {
  it('syncs v2 state via storage event from another tab', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.state.status).toBe('pending');

    const newState: OnboardingState = {
      schemaVersion: 2,
      progressByDate: {
        [DATE_A]: {
          'M-INTENTION': '2026-05-17T10:00:00.000Z',
          'M-MOOD': null,
          'M-PRIORITY': null,
          'M-FORMAT': null,
          'M-CHECK': null,
          'M-WRITE': null,
          'M-GRATITUDE': null,
        },
      },
      completedAt: null,
      completedOnDate: null,
      status: 'in_progress',
    };
    act(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      window.dispatchEvent(new globalThis.StorageEvent('storage', { key: STORAGE_KEY }));
    });

    expect(result.current.state.status).toBe('in_progress');
    expect(result.current.state.progressByDate[DATE_A]?.['M-INTENTION']).toBe(
      '2026-05-17T10:00:00.000Z',
    );
  });

  it('syncs v2 state via custom event (same-tab)', () => {
    const { result } = renderHook(() => useOnboardingState());

    const newState: OnboardingState = {
      schemaVersion: 2,
      progressByDate: {},
      completedAt: null,
      completedOnDate: null,
      status: 'dismissed',
    };
    act(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
    });

    expect(result.current.state.status).toBe('dismissed');
  });
});
