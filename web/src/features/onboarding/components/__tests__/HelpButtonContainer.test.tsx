import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { STORAGE_KEY } from '../../lib/constants.js';
import { setReadonlyVisible } from '../../lib/readonlyController.js';
import type { MissionId, OnboardingState } from '../../types.js';
import { HelpButtonContainer } from '../HelpButtonContainer.js';

function makeAllNull(): Record<MissionId, null> {
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

function makeAllCompleted(ts = '2026-05-17T10:00:00.000Z'): Record<MissionId, string> {
  return {
    'M-INTENTION': ts,
    'M-MOOD': ts,
    'M-PRIORITY': ts,
    'M-FORMAT': ts,
    'M-CHECK': ts,
    'M-WRITE': ts,
    'M-GRATITUDE': ts,
    'M-NAVIGATE': ts,
  };
}

function setStorageState(state: Partial<OnboardingState>): void {
  const full: OnboardingState = {
    schemaVersion: 1,
    status: 'pending',
    missionsCompleted: makeAllNull(),
    completedAt: null,
    completedOnDate: null,
    ...state,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
}

beforeEach(() => {
  localStorage.clear();
  setReadonlyVisible(false);
});

afterEach(() => {
  jest.clearAllMocks();
  setReadonlyVisible(false);
});

describe('HelpButtonContainer', () => {
  it('renders HelpButton with correct aria-label', () => {
    render(<HelpButtonContainer />);
    expect(screen.getByRole('button', { name: /abrir roteiro do diário/i })).toBeInTheDocument();
  });

  it('AC-020: click when status=dismissed transitions state to in_progress (reopen)', async () => {
    const user = userEvent.setup();
    setStorageState({ status: 'dismissed', missionsCompleted: makeAllNull() });
    render(<HelpButtonContainer />);
    await user.click(screen.getByRole('button', { name: /abrir roteiro do diário/i }));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as OnboardingState;
    expect(stored.status).toBe('in_progress');
  });

  it('AC-020: click when status=in_progress is a no-op (no state change)', async () => {
    const user = userEvent.setup();
    setStorageState({ status: 'in_progress', missionsCompleted: makeAllNull() });
    render(<HelpButtonContainer />);
    const before = localStorage.getItem(STORAGE_KEY);
    await user.click(screen.getByRole('button', { name: /abrir roteiro do diário/i }));
    const after = localStorage.getItem(STORAGE_KEY);
    expect(after).toBe(before);
  });

  it('AC-021: click when status=completed calls setReadonlyVisible(true)', async () => {
    const user = userEvent.setup();
    setStorageState({
      status: 'completed',
      missionsCompleted: makeAllCompleted(),
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: '2026-05-17',
    });
    render(<HelpButtonContainer />);
    expect(setReadonlyVisible).toBeDefined();
    await user.click(screen.getByRole('button', { name: /abrir roteiro do diário/i }));
    const { getReadonlyVisible } = await import('../../lib/readonlyController.js');
    act(() => {});
    expect(getReadonlyVisible()).toBe(true);
  });
});
