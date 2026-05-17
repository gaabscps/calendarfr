import { act, renderHook } from '@testing-library/react';

import { STORAGE_KEY } from '../../lib/constants.js';
import type { OnboardingState } from '../../types.js';
import { useOnboardingState } from '../useOnboardingState.js';

const DATE = '2026-05-17';

function makeV2State(overrides: Partial<OnboardingState> = {}): OnboardingState {
  return {
    schemaVersion: 2,
    progressByDate: {},
    completedAt: null,
    completedOnDate: null,
    status: 'pending',
    ...overrides,
  };
}

function setStorageState(state: Partial<OnboardingState>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(makeV2State(state)));
}

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('useOnboardingState — status transitions', () => {
  it('returns initial v2 state with status pending and empty progressByDate', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.state.status).toBe('pending');
    expect(result.current.state.schemaVersion).toBe(2);
    expect(result.current.state.progressByDate).toEqual({});
  });

  it('markMission sets timestamp in progressByDate[date][missionId]', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', DATE, '2026-05-17T10:00:00.000Z');
    });
    expect(result.current.state.progressByDate[DATE]?.['M-INTENTION']).toBe(
      '2026-05-17T10:00:00.000Z',
    );
  });

  it('setStatus changes status', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.setStatus('in_progress');
    });
    expect(result.current.state.status).toBe('in_progress');
  });

  it('dismiss transitions in_progress to dismissed and preserves progressByDate', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', DATE, '2026-05-17T10:00:00.000Z');
    });
    const pbdAfterMark = { ...result.current.state.progressByDate };
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.state.status).toBe('dismissed');
    expect(result.current.state.progressByDate).toEqual(pbdAfterMark);
  });

  it('reopen from dismissed transitions to in_progress', () => {
    setStorageState({ status: 'dismissed' });
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.reopen();
    });
    expect(result.current.state.status).toBe('in_progress');
  });

  it('reopen from pending transitions to in_progress', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.state.status).toBe('pending');
    act(() => {
      result.current.reopen();
    });
    expect(result.current.state.status).toBe('in_progress');
  });

  it('reopen is no-op when already in_progress', () => {
    setStorageState({ status: 'in_progress' });
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.reopen();
    });
    expect(result.current.state.status).toBe('in_progress');
  });

  it('reopen is no-op when completed', () => {
    setStorageState({
      status: 'completed',
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.reopen();
    });
    expect(result.current.state.status).toBe('completed');
  });

  it('markMission does not auto-promote status from dismissed even when all 7 missions are marked', () => {
    setStorageState({ status: 'dismissed', progressByDate: {} });
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      const ts = '2026-05-17T10:00:00.000Z';
      result.current.markMission('M-INTENTION', DATE, ts);
      result.current.markMission('M-MOOD', DATE, ts);
      result.current.markMission('M-PRIORITY', DATE, ts);
      result.current.markMission('M-FORMAT', DATE, ts);
      result.current.markMission('M-CHECK', DATE, ts);
      result.current.markMission('M-WRITE', DATE, ts);
      result.current.markMission('M-GRATITUDE', DATE, ts);
    });
    expect(result.current.state.status).toBe('dismissed');
    expect(result.current.state.completedAt).toBeNull();
    expect(result.current.state.completedOnDate).toBeNull();
  });

  it('does not crash and console stays silent when setItem throws QuotaExceededError', () => {
    const errorSpy = jest.spyOn(console, 'error');
    const warnSpy = jest.spyOn(console, 'warn');

    jest.spyOn(globalThis.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new globalThis.DOMException('QuotaExceededError');
    });

    const { result } = renderHook(() => useOnboardingState());
    expect(() => {
      act(() => {
        result.current.markMission('M-INTENTION', DATE, '2026-05-17T10:00:00.000Z');
      });
    }).not.toThrow();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
