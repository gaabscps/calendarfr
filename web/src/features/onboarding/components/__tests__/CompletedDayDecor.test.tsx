import type { DailyPageData } from '@calendarfr/shared';
import { act, render, screen } from '@testing-library/react';

import { STORAGE_KEY } from '../../lib/constants.js';
import type { MissionId, OnboardingState } from '../../types.js';
import { CompletedDayDecor } from '../CompletedDayDecor.js';

import { soundController } from '@/shared/sound/soundController';

function makeFullyConditionMetData(): DailyPageData {
  return {
    schemaVersion: 1,
    date: '2026-05-17',
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

function makeEmptyData(): DailyPageData {
  return {
    schemaVersion: 1,
    date: '2026-05-17',
    mood: null,
    intention: null,
    priorities: [
      { id: 'a', text: '', done: false },
      { id: 'b', text: '', done: false },
      { id: 'c', text: '', done: false },
    ] as DailyPageData['priorities'],
    agenda: Array.from({ length: 18 }, (_, i) => ({
      hour: i + 6,
      text: '',
    })) as unknown as DailyPageData['agenda'],
    notes: [],
    gratitude: [],
    createdAt: null,
    updatedAt: null,
  };
}

// ─── Framer Motion mock ───────────────────────────────────────────────────────
let mockReducedMotion = false;

jest.mock('framer-motion', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');

  function MotionDiv({
    children,
    initial,
    animate,
    transition,
    ...rest
  }: { children?: import('react').ReactNode } & Record<string, unknown>) {
    return ReactMod.createElement(
      'div',
      {
        'data-motion-initial': JSON.stringify(initial),
        'data-motion-animate': JSON.stringify(animate),
        'data-motion-transition': JSON.stringify(transition),
        'data-testid': 'motion-div',
        ...rest,
      },
      children,
    );
  }

  function MotionSvg({
    children,
    initial,
    animate,
    transition,
    ...rest
  }: { children?: import('react').ReactNode } & Record<string, unknown>) {
    return ReactMod.createElement(
      'svg',
      {
        'data-motion-initial': JSON.stringify(initial),
        'data-motion-animate': JSON.stringify(animate),
        'data-motion-transition': JSON.stringify(transition),
        ...rest,
      },
      children,
    );
  }

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
    motion: { div: MotionDiv, svg: MotionSvg, span: MotionSpan },
    useReducedMotion: () => mockReducedMotion,
  };
});

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

beforeEach(() => {
  localStorage.clear();
  mockReducedMotion = false;
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('CompletedDayDecor — conditional render', () => {
  it('AC-037: returns null when progressByDate[date] is empty', () => {
    setStorageState({ progressByDate: {} });
    const { container } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();
  });

  it('AC-040: returns null when 6 of 7 missions are completed', () => {
    const partial: Record<MissionId, string | null> = {
      'M-INTENTION': '2026-05-17T10:00:00.000Z',
      'M-MOOD': '2026-05-17T10:00:00.000Z',
      'M-PRIORITY': '2026-05-17T10:00:00.000Z',
      'M-FORMAT': '2026-05-17T10:00:00.000Z',
      'M-CHECK': '2026-05-17T10:00:00.000Z',
      'M-WRITE': '2026-05-17T10:00:00.000Z',
      'M-GRATITUDE': null,
    };
    setStorageState({ progressByDate: { [DATE]: partial } });
    const { container } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders the golden-seal when all 7 missions are completed', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);
    expect(container.querySelector('[data-testid="golden-seal"]')).toBeInTheDocument();
  });

  it('AC-039: does not render for a different date that is incomplete', () => {
    setStorageState({
      progressByDate: { '2026-05-18': makeAllCompleted() },
    });
    const { container } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();
  });

  it('bug-7: does NOT render when persisted=7/7 but current data no longer satisfies conditions', () => {
    // Latch left timestamps for a day whose content was later cleared. The visual intersection
    // (persisted ∧ current condition) flips back to incomplete — decor should disappear.
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} data={makeEmptyData()} />);
    expect(container.firstChild).toBeNull();
  });

  it('bug-7: DOES render when persisted=7/7 AND current data still satisfies every condition', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(
      <CompletedDayDecor date={DATE} data={makeFullyConditionMetData()} />,
    );
    expect(container.querySelector('[data-testid="golden-seal"]')).toBeInTheDocument();
  });
});

describe('CompletedDayDecor — animation choreography (normal motion)', () => {
  it('golden-seal has scale+rotate animation with delay 0.3s (not complete on mount)', () => {
    const { container, rerender } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<CompletedDayDecor date={DATE} />);

    const sealEl = container.querySelector('[data-testid="golden-seal"]');
    expect(sealEl).toBeInTheDocument();
    const animate = JSON.parse(sealEl!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(sealEl!.getAttribute('data-motion-transition') ?? 'null');

    expect(Array.isArray(animate.rotate)).toBe(true);
    expect(animate).toMatchObject({ scale: 1 });
    expect(transition).toMatchObject({ type: 'spring', stiffness: 220, damping: 16, delay: 0.3 });
  });
});

describe('CompletedDayDecor — reduced-motion (AC-035)', () => {
  it('AC-036+AC-035: already complete on mount uses initial=false (no fade entrance)', () => {
    mockReducedMotion = true;
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);

    const sealEl = container.querySelector('[data-testid="golden-seal"]');
    expect(sealEl).toBeInTheDocument();

    const initial = JSON.parse(sealEl!.getAttribute('data-motion-initial') ?? 'null');
    const animate = JSON.parse(sealEl!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(sealEl!.getAttribute('data-motion-transition') ?? 'null');

    expect(initial).toBe(false);
    expect(animate).toMatchObject({ opacity: 1 });
    expect(transition.duration).toBeLessThanOrEqual(0.2);
  });

  it('AC-035: not complete on mount — uses fade entrance (initial has opacity 0)', () => {
    mockReducedMotion = true;
    const { container, rerender } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<CompletedDayDecor date={DATE} />);

    const sealEl = container.querySelector('[data-testid="golden-seal"]');
    expect(sealEl).toBeInTheDocument();

    const initial = JSON.parse(sealEl!.getAttribute('data-motion-initial') ?? 'null');
    const animate = JSON.parse(sealEl!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(sealEl!.getAttribute('data-motion-transition') ?? 'null');

    expect(initial).toMatchObject({ opacity: 0 });
    expect(animate).toMatchObject({ opacity: 1 });
    expect(transition.duration).toBeLessThanOrEqual(0.2);
  });

  it('reduced-motion: still renders the seal', () => {
    mockReducedMotion = true;
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);

    expect(container.querySelector('[data-testid="golden-seal"]')).toBeInTheDocument();
  });
});

describe('CompletedDayDecor — idempotência (AC-036)', () => {
  it('when already complete on mount, seal motion element has initial={false}', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);

    const sealEl = container.querySelector('[data-testid="golden-seal"]');
    expect(sealEl).toBeInTheDocument();
    const initial = JSON.parse(sealEl!.getAttribute('data-motion-initial') ?? 'null');

    expect(initial).toBe(false);
  });

  it('when not complete on mount then transitions to complete, initial is not false', () => {
    const { container, rerender } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<CompletedDayDecor date={DATE} />);

    const sealEl = container.querySelector('[data-testid="golden-seal"]');
    expect(sealEl).toBeInTheDocument();
    const initial = JSON.parse(sealEl!.getAttribute('data-motion-initial') ?? 'null');
    expect(initial).not.toBe(false);
    expect(initial).toMatchObject({ scale: 0, rotate: 0 });
  });
});

describe('CompletedDayDecor — FEAT-029 sparkle + sound', () => {
  beforeEach(() => {
    localStorage.clear();
    mockReducedMotion = false;
    soundController.setMuted(false);
  });

  it('plays day-complete when the day transitions to 7/7 during this mount', () => {
    const playSpy = jest.spyOn(soundController, 'play');
    const { container, rerender } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<CompletedDayDecor date={DATE} />);

    expect(playSpy).toHaveBeenCalledWith('day-complete');
    playSpy.mockRestore();
  });

  it('does NOT play day-complete when already 7/7 on first mount', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const playSpy = jest.spyOn(soundController, 'play');
    render(<CompletedDayDecor date={DATE} />);
    expect(playSpy).not.toHaveBeenCalledWith('day-complete');
    playSpy.mockRestore();
  });

  it('renders the centered SparkleBurst when day transitions to 7/7 (not on mount)', () => {
    const { container, rerender } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<CompletedDayDecor date={DATE} />);

    expect(screen.getByTestId('sparkleBurst-root')).toBeInTheDocument();
  });

  it('does NOT render SparkleBurst when day was already 7/7 on mount', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    render(<CompletedDayDecor date={DATE} />);
    expect(screen.queryByTestId('sparkleBurst-root')).toBeNull();
  });

  it('reduced-motion: no SparkleBurst even on transition', () => {
    mockReducedMotion = true;
    const { container, rerender } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<CompletedDayDecor date={DATE} />);

    expect(screen.queryByTestId('sparkleBurst-root')).toBeNull();
  });
});
