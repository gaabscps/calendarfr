import { act, render } from '@testing-library/react';

import { STORAGE_KEY } from '../../lib/constants.js';
import type { MissionId, OnboardingState } from '../../types.js';
import { CompletedDayDecor } from '../CompletedDayDecor.js';

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

  return {
    motion: { div: MotionDiv, svg: MotionSvg },
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

  it('renders 3 SVG elements when all 7 missions are completed', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);
    expect(container.querySelector('[data-testid="washi-left"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="washi-right"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="golden-seal"]')).toBeInTheDocument();
  });

  it('AC-039: does not render for a different date that is incomplete', () => {
    setStorageState({
      progressByDate: { '2026-05-18': makeAllCompleted() },
    });
    const { container } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('CompletedDayDecor — animation choreography (normal motion)', () => {
  it('AC-034: washi-left has correct animate and transition when complete on mount', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);

    const washiLeftSvg = container.querySelector('[data-testid="washi-left"]');
    expect(washiLeftSvg).toBeInTheDocument();
    const animate = JSON.parse(washiLeftSvg!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(washiLeftSvg!.getAttribute('data-motion-transition') ?? 'null');

    expect(animate).toMatchObject({ scale: 1, opacity: 1 });
    expect(transition).toMatchObject({ type: 'spring', stiffness: 200, damping: 18 });
  });

  it('AC-034: golden-seal has scale+rotate animation with delay 0.3s (not complete on mount)', () => {
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

  it('AC-034: washi-right has delay 0.1s (not complete on mount)', () => {
    const { container, rerender } = render(<CompletedDayDecor date={DATE} />);
    expect(container.firstChild).toBeNull();

    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    act(() => {
      dispatchStorageEvent();
    });
    rerender(<CompletedDayDecor date={DATE} />);

    const washiRightEl = container.querySelector('[data-testid="washi-right"]');
    expect(washiRightEl).toBeInTheDocument();
    const transition = JSON.parse(washiRightEl!.getAttribute('data-motion-transition') ?? 'null');
    expect(transition).toMatchObject({ delay: 0.1 });
  });
});

describe('CompletedDayDecor — reduced-motion (AC-035)', () => {
  it('AC-036+AC-035: already complete on mount uses initial=false (no fade entrance)', () => {
    mockReducedMotion = true;
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);

    const washiLeftEl = container.querySelector('[data-testid="washi-left"]');
    expect(washiLeftEl).toBeInTheDocument();

    const initial = JSON.parse(washiLeftEl!.getAttribute('data-motion-initial') ?? 'null');
    const animate = JSON.parse(washiLeftEl!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(washiLeftEl!.getAttribute('data-motion-transition') ?? 'null');

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

    const washiLeftEl = container.querySelector('[data-testid="washi-left"]');
    expect(washiLeftEl).toBeInTheDocument();

    const initial = JSON.parse(washiLeftEl!.getAttribute('data-motion-initial') ?? 'null');
    const animate = JSON.parse(washiLeftEl!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(washiLeftEl!.getAttribute('data-motion-transition') ?? 'null');

    expect(initial).toMatchObject({ opacity: 0 });
    expect(animate).toMatchObject({ opacity: 1 });
    expect(transition.duration).toBeLessThanOrEqual(0.2);
  });

  it('reduced-motion: still renders all 3 SVG children', () => {
    mockReducedMotion = true;
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);

    expect(container.querySelector('[data-testid="washi-left"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="washi-right"]')).toBeInTheDocument();
    expect(container.querySelector('[data-testid="golden-seal"]')).toBeInTheDocument();
  });
});

describe('CompletedDayDecor — idempotência (AC-036)', () => {
  it('when already complete on mount, washi-left motion element has initial={false}', () => {
    setStorageState({ progressByDate: { [DATE]: makeAllCompleted() } });
    const { container } = render(<CompletedDayDecor date={DATE} />);

    const washiLeftSvg = container.querySelector('[data-testid="washi-left"]');
    expect(washiLeftSvg).toBeInTheDocument();
    const initial = JSON.parse(washiLeftSvg!.getAttribute('data-motion-initial') ?? 'null');

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

    const washiLeftEl = container.querySelector('[data-testid="washi-left"]');
    expect(washiLeftEl).toBeInTheDocument();
    const initial = JSON.parse(washiLeftEl!.getAttribute('data-motion-initial') ?? 'null');
    expect(initial).not.toBe(false);
    expect(initial).toMatchObject({ scale: 0.6, opacity: 0 });
  });
});
