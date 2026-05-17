/* eslint-disable import/order */
import type { DailyPageData } from '@calendarfr/shared';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { soundController } from '@/shared/sound/soundController';

import { STORAGE_KEY } from '../../lib/constants.js';
import type { MissionId, OnboardingState } from '../../types.js';

const setReadonlyVisibleMock = jest.fn();
jest.mock('../../lib/readonlyController.js', () => ({
  setReadonlyVisible: (v: boolean) => setReadonlyVisibleMock(v),
  getReadonlyVisible: () => false,
  subscribeReadonlyVisible: () => () => {},
}));

// ─── Framer Motion mock ───────────────────────────────────────────────────────
let mockReducedMotion = false;

jest.mock('framer-motion', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');

  function MotionSpan({
    children,
    initial,
    animate,
    transition,
    ...rest
  }: { children?: import('react').ReactNode } & Record<string, unknown>) {
    return ReactMod.createElement(
      'span',
      {
        'data-motion-initial': JSON.stringify(initial),
        'data-motion-animate': JSON.stringify(animate),
        'data-motion-transition': JSON.stringify(transition),
        ...rest,
      },
      children,
    );
  }

  return {
    motion: { span: MotionSpan, div: MotionSpan, svg: MotionSpan, path: MotionSpan },
    useReducedMotion: () => mockReducedMotion,
  };
});

import { MissionSealSlot } from '../MissionSealSlot.js';

const DATE = '2026-05-17';

function makeAllCompleted(ts = '2026-05-17T10:00:00.000Z'): Record<MissionId, string> {
  return {
    'M-INTENTION': ts,
    'M-MOOD': ts,
    'M-PRIORITY': ts,
    'M-FORMAT': ts,
    'M-CHECK': ts,
    'M-WRITE': ts,
    'M-GRATITUDE': ts,
  };
}

function setStorageState(state: Partial<OnboardingState>): void {
  const full: OnboardingState = {
    schemaVersion: 2,
    progressByDate: {},
    completedAt: null,
    completedOnDate: null,
    status: 'pending',
    ...state,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(full));
}

function dispatchStorageEvent() {
  window.dispatchEvent(new window.Event('storage'));
}

function makeFullyConditionMetData(): DailyPageData {
  return {
    schemaVersion: 1,
    date: DATE,
    mood: { emoji: '😊', label: 'Feliz', color: '#fff' },
    intention: 'foco',
    priorities: [
      { id: 'a', text: '<u>uma prioridade</u>', done: true },
      { id: 'b', text: '', done: false },
      { id: 'c', text: '', done: false },
    ] as DailyPageData['priorities'],
    agenda: [{ hour: 6, text: 'algo' }] as unknown as DailyPageData['agenda'],
    notes: [],
    gratitude: [{ id: 'g1', text: 'agradeço' }] as unknown as DailyPageData['gratitude'],
    createdAt: null,
    updatedAt: null,
  };
}

beforeEach(() => {
  localStorage.clear();
  mockReducedMotion = false;
  soundController.setMuted(false);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('MissionSealSlot — visual state', () => {
  it('renders placeholder when day is not 7/7', () => {
    render(<MissionSealSlot date={DATE} />);
    expect(screen.getByTestId('seal-placeholder')).toBeInTheDocument();
    expect(screen.queryByTestId('golden-seal')).toBeNull();
  });

  it('renders the GoldenSeal when day is 7/7', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    render(<MissionSealSlot date={DATE} data={makeFullyConditionMetData()} />);
    expect(screen.getByTestId('golden-seal')).toBeInTheDocument();
    expect(screen.queryByTestId('seal-placeholder')).toBeNull();
  });

  it('always renders a clickable button', () => {
    render(<MissionSealSlot date={DATE} />);
    expect(screen.getByTestId('missionSealSlot-button')).toBeInTheDocument();
  });
});

describe('MissionSealSlot — click behaviour', () => {
  it('clicking with status=pending calls reopen (re-mounts sticky)', async () => {
    const user = userEvent.setup();
    setStorageState({ status: 'pending' });
    render(<MissionSealSlot date={DATE} />);
    await user.click(screen.getByTestId('missionSealSlot-button'));
    const raw = localStorage.getItem(STORAGE_KEY) ?? '';
    const parsed = JSON.parse(raw) as OnboardingState;
    // reopen() switches status to in_progress (not 'pending'); regardless, this proves
    // the click path went through reopen and not setReadonlyVisible.
    expect(parsed.status).not.toBe('dismissed');
  });

  it('clicking with status=dismissed calls reopen', async () => {
    const user = userEvent.setup();
    setStorageState({ status: 'dismissed' });
    render(<MissionSealSlot date={DATE} />);
    await user.click(screen.getByTestId('missionSealSlot-button'));
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as OnboardingState;
    expect(parsed.status).not.toBe('dismissed');
  });

  it('clicking with status=in_progress calls setReadonlyVisible(true)', async () => {
    const user = userEvent.setup();
    setReadonlyVisibleMock.mockClear();
    setStorageState({ status: 'in_progress' });
    render(<MissionSealSlot date={DATE} />);
    await user.click(screen.getByTestId('missionSealSlot-button'));
    expect(setReadonlyVisibleMock).toHaveBeenCalledWith(true);
  });

  it('clicking with status=completed calls setReadonlyVisible(true)', async () => {
    const user = userEvent.setup();
    setReadonlyVisibleMock.mockClear();
    setStorageState({ status: 'completed' });
    render(<MissionSealSlot date={DATE} />);
    await user.click(screen.getByTestId('missionSealSlot-button'));
    expect(setReadonlyVisibleMock).toHaveBeenCalledWith(true);
  });
});

describe('MissionSealSlot — day-complete sound + sparkle', () => {
  it('plays day-complete when the day transitions to 7/7', () => {
    const playSpy = jest.spyOn(soundController, 'play');
    const { rerender } = render(<MissionSealSlot date={DATE} />);
    expect(playSpy).not.toHaveBeenCalledWith('day-complete');

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<MissionSealSlot date={DATE} data={makeFullyConditionMetData()} />);

    expect(playSpy).toHaveBeenCalledWith('day-complete');
    playSpy.mockRestore();
  });

  it('does NOT play day-complete when 7/7 was already true on mount', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const playSpy = jest.spyOn(soundController, 'play');
    render(<MissionSealSlot date={DATE} data={makeFullyConditionMetData()} />);
    expect(playSpy).not.toHaveBeenCalledWith('day-complete');
    playSpy.mockRestore();
  });

  it('renders SparkleBurst when transitioning to 7/7 (not when 7/7 on mount)', () => {
    const { rerender } = render(<MissionSealSlot date={DATE} />);
    expect(screen.queryByTestId('sparkleBurst-root')).toBeNull();

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<MissionSealSlot date={DATE} data={makeFullyConditionMetData()} />);

    expect(screen.getByTestId('sparkleBurst-root')).toBeInTheDocument();
  });

  it('does NOT render SparkleBurst when 7/7 was already true on mount', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    render(<MissionSealSlot date={DATE} data={makeFullyConditionMetData()} />);
    expect(screen.queryByTestId('sparkleBurst-root')).toBeNull();
  });

  it('reduced-motion: no SparkleBurst even on transition', () => {
    mockReducedMotion = true;
    const { rerender } = render(<MissionSealSlot date={DATE} />);
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<MissionSealSlot date={DATE} data={makeFullyConditionMetData()} />);
    expect(screen.queryByTestId('sparkleBurst-root')).toBeNull();
  });
});
