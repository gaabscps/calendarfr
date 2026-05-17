import { act, renderHook } from '@testing-library/react';

import { STORAGE_KEY } from '../../lib/constants.js';
import type { OnboardingState } from '../../types.js';
import { useOnboardingState } from '../useOnboardingState.js';

function makeAllNull(): Record<string, null> {
  return {
    'M-INTENTION': null,
    'M-MOOD': null,
    'M-PRIORITY': null,
    'M-FORMAT': null,
    'M-CHECK': null,
    'M-WRITE': null,
    'M-GRATITUDE': null,
    'M-NAVIGATE': null,
  };
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

describe('useOnboardingState — status transitions', () => {
  it('returns initial state with status pending and all missions null', () => {
    const { result } = renderHook(() => useOnboardingState());
    expect(result.current.state.status).toBe('pending');
    expect(result.current.state.schemaVersion).toBe(1);
    const ids = Object.keys(result.current.state.missionsCompleted);
    expect(ids).toHaveLength(8);
    ids.forEach((id) => {
      expect(
        result.current.state.missionsCompleted[
          id as keyof typeof result.current.state.missionsCompleted
        ],
      ).toBeNull();
    });
  });

  it('markMission transitions status from pending to in_progress', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', '2026-05-17T10:00:00.000Z');
    });
    expect(result.current.state.status).toBe('in_progress');
    expect(result.current.state.missionsCompleted['M-INTENTION']).toBe('2026-05-17T10:00:00.000Z');
  });

  it('setStatus changes status', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.setStatus('in_progress');
    });
    expect(result.current.state.status).toBe('in_progress');
  });

  it('dismiss transitions in_progress to dismissed and preserves missionsCompleted', () => {
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.markMission('M-INTENTION', '2026-05-17T10:00:00.000Z');
    });
    const missionsAfterMark = { ...result.current.state.missionsCompleted };
    act(() => {
      result.current.dismiss();
    });
    expect(result.current.state.status).toBe('dismissed');
    expect(result.current.state.missionsCompleted).toEqual(missionsAfterMark);
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
      completedOnDate: '2026-05-17',
    });
    const { result } = renderHook(() => useOnboardingState());
    act(() => {
      result.current.reopen();
    });
    expect(result.current.state.status).toBe('completed');
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
        result.current.markMission('M-INTENTION', '2026-05-17T10:00:00.000Z');
      });
    }).not.toThrow();

    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
