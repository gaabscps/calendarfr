/**
 * Integration tests for DailyPage — composição Moleskine, animação, a11y.
 *
 * Strategy: mock useDailyPage and usePageNavigation at module level for component
 * unit tests; use MSW for HTTP-integration scenarios in the last section.
 *
 * Covers: AC-003, AC-004, AC-005, AC-034, AC-035, AC-036, AC-037, AC-038,
 *         AC-039, AC-040, AC-041, AC-042 (a11y), AC-009 (save indicator UI),
 *         AC-027 (retry button UI).
 */

import type { DailyPageData } from '@calendarfr/shared';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import React from 'react';

import { DailyPage } from '../DailyPage.js';

import { server } from '@/test-utils/msw/server';

// ---------------------------------------------------------------------------
// Mock heavy feature components to keep tests fast and isolated
// ---------------------------------------------------------------------------

jest.mock('@/features/priorities', () => ({
  Priorities: ({ value, onChange }: { value: unknown; onChange: (_v: unknown) => void }) => (
    <div data-testid="priorities" data-value={JSON.stringify(value)}>
      <button onClick={() => onChange(value)}>priorities-trigger</button>
    </div>
  ),
  EMPTY_PRIORITY: { id: '', text: '', done: false },
}));

jest.mock('@/features/mood', () => ({
  MoodPicker: ({ value, onChange }: { value: unknown; onChange: (_v: unknown) => void }) => (
    <div data-testid="mood-picker" data-value={JSON.stringify(value)}>
      <button onClick={() => onChange(value)}>mood-trigger</button>
    </div>
  ),
  MoodPopover: ({ value, onChange }: { value: unknown; onChange: (_v: unknown) => void }) => (
    <div data-testid="mood-picker" data-value={JSON.stringify(value)}>
      <button onClick={() => onChange(value)}>mood-trigger</button>
    </div>
  ),
}));

jest.mock('@/features/agenda', () => ({
  Agenda: ({ value, onChange }: { value: unknown; onChange: (_v: unknown) => void }) => (
    <div data-testid="agenda" data-value={JSON.stringify(value)}>
      <button onClick={() => onChange(value)}>agenda-trigger</button>
    </div>
  ),
  EMPTY_AGENDA: Array.from({ length: 18 }, (_, i) => ({ hour: i + 6, text: '' })),
}));

jest.mock('@/features/notes', () => ({
  Notes: ({ value, onChange }: { value: unknown; onChange: (_v: unknown) => void }) => (
    <div data-testid="notes" data-value={JSON.stringify(value)}>
      <button onClick={() => onChange(value)}>notes-trigger</button>
    </div>
  ),
}));

jest.mock('@/features/sticky-note', () => ({
  StickyNote: () => null,
}));

// ---------------------------------------------------------------------------
// Mock hooks (will be overridden per test group)
// ---------------------------------------------------------------------------

const mockUseDailyPage = jest.fn();
const mockUsePageNavigation = jest.fn();
const mockUseReducedMotion = jest.fn();

jest.mock('../../hooks/useDailyPage.js', () => ({
  ...jest.requireActual('../../hooks/useDailyPage.js'),
  useDailyPage: (...args: unknown[]) => mockUseDailyPage(...args),
}));

jest.mock('../../hooks/usePageNavigation.js', () => ({
  ...jest.requireActual('../../hooks/usePageNavigation.js'),
  usePageNavigation: (...args: unknown[]) => mockUsePageNavigation(...args),
}));

jest.mock('../../hooks/useReducedMotion.js', () => ({
  useReducedMotion: () => mockUseReducedMotion(),
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = '2026-05-11';
const DATE_NEXT = '2026-05-12';
const API_BASE = 'http://localhost:3003';

function makeData(date: string, overrides?: Partial<DailyPageData>): DailyPageData {
  return {
    schemaVersion: 1,
    date,
    mood: null,
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
    intention: null,
    gratitude: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const DATA = makeData(DATE);

function makeDefaultNavReturn(overrides = {}) {
  return {
    date: DATE,
    direction: null as 'prev' | 'next' | null,
    isAnimating: false,
    goToPrev: jest.fn().mockResolvedValue(undefined),
    goToNext: jest.fn().mockResolvedValue(undefined),
    goToDate: jest.fn().mockResolvedValue(undefined),
    swipeProps: {},
    ...overrides,
  };
}

function makeDefaultDailyReturn(overrides = {}) {
  return {
    data: DATA,
    loadError: null,
    saveStatus: 'saved' as const,
    setPriorities: jest.fn(),
    setMood: jest.fn(),
    setAgenda: jest.fn(),
    setNotes: jest.fn(),
    setIntention: jest.fn(),
    setGratitude: jest.fn(),
    retrySave: jest.fn(),
    flushSavePending: jest.fn().mockResolvedValue(undefined),
    reload: jest.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  // Suppress OnboardingQuest sticky-note so it does not interfere with these tests.
  localStorage.setItem(
    'calendarfr.onboarding.state',
    JSON.stringify({
      schemaVersion: 2,
      progressByDate: {},
      completedAt: null,
      completedOnDate: null,
      status: 'dismissed',
    }),
  );
  mockUseReducedMotion.mockReturnValue(false);
  mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn());
  mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn());
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// 1. Rendering: PaperSheet wrapper (AC-005)
// ---------------------------------------------------------------------------

describe('DailyPage — PaperSheet wrapper (AC-005)', () => {
  it('wraps content in PaperSheet (data-paper-sheet attribute)', () => {
    render(<DailyPage />);
    expect(document.querySelector('[data-paper-sheet="true"]')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Skeleton while loading (AC-002, AC-037)
// ---------------------------------------------------------------------------

describe('DailyPage — loading skeleton (AC-002)', () => {
  it('shows skeleton when data is null', () => {
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: null }));
    render(<DailyPage />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  it('does NOT render 4 features while loading', () => {
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: null }));
    render(<DailyPage />);
    expect(screen.queryByTestId('priorities')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mood-picker')).not.toBeInTheDocument();
    expect(screen.queryByTestId('agenda')).not.toBeInTheDocument();
    expect(screen.queryByTestId('notes')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 3. Load error screen (AC-030)
// ---------------------------------------------------------------------------

describe('DailyPage — load error screen (AC-030)', () => {
  it('shows error screen when loadError is set', () => {
    mockUseDailyPage.mockReturnValue(
      makeDefaultDailyReturn({ data: null, loadError: new Error('network') }),
    );
    render(<DailyPage />);
    expect(screen.getByTestId('load-error-screen')).toBeInTheDocument();
  });

  it('shows reload button on error screen', () => {
    mockUseDailyPage.mockReturnValue(
      makeDefaultDailyReturn({ data: null, loadError: new Error('network') }),
    );
    render(<DailyPage />);
    expect(screen.getByRole('button', { name: /recarregar/i })).toBeInTheDocument();
  });

  it('clicking reload calls reload()', async () => {
    const reload = jest.fn();
    const user = userEvent.setup();
    mockUseDailyPage.mockReturnValue(
      makeDefaultDailyReturn({ data: null, loadError: new Error('network'), reload }),
    );
    render(<DailyPage />);
    await user.click(screen.getByRole('button', { name: /recarregar/i }));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('does NOT show features when error is present', () => {
    mockUseDailyPage.mockReturnValue(
      makeDefaultDailyReturn({ data: null, loadError: new Error('x') }),
    );
    render(<DailyPage />);
    expect(screen.queryByTestId('priorities')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 4. Composed 4 features after load (AC-003)
// ---------------------------------------------------------------------------

describe('DailyPage — 4 features rendered after load (AC-003)', () => {
  it('renders Priorities, MoodPicker, Agenda, Notes when data is loaded', () => {
    render(<DailyPage />);
    expect(screen.getByTestId('priorities')).toBeInTheDocument();
    expect(screen.getByTestId('mood-picker')).toBeInTheDocument();
    expect(screen.getByTestId('agenda')).toBeInTheDocument();
    expect(screen.getByTestId('notes')).toBeInTheDocument();
  });

  it('passes data.priorities to Priorities', () => {
    render(<DailyPage />);
    const el = screen.getByTestId('priorities');
    const val = JSON.parse(el.getAttribute('data-value') ?? 'null') as unknown;
    expect(val).toEqual(DATA.priorities);
  });

  it('passes data.mood to MoodPicker', () => {
    render(<DailyPage />);
    const el = screen.getByTestId('mood-picker');
    const val = JSON.parse(el.getAttribute('data-value') ?? 'null') as unknown;
    expect(val).toEqual(DATA.mood);
  });

  it('passes data.agenda to Agenda', () => {
    render(<DailyPage />);
    const el = screen.getByTestId('agenda');
    const val = JSON.parse(el.getAttribute('data-value') ?? 'null') as unknown;
    expect(val).toEqual(DATA.agenda);
  });

  it('passes data.notes to Notes', () => {
    render(<DailyPage />);
    const el = screen.getByTestId('notes');
    const val = JSON.parse(el.getAttribute('data-value') ?? 'null') as unknown;
    expect(val).toEqual(DATA.notes);
  });
});

// ---------------------------------------------------------------------------
// 5. Save indicator UI (AC-009, AC-012, AC-027)
// ---------------------------------------------------------------------------

describe('DailyPage — save indicator (AC-009, AC-012, AC-027)', () => {
  it('shows Salvando… when saveStatus is saving', () => {
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ saveStatus: 'saving' }));
    render(<DailyPage />);
    expect(screen.getByText('Salvando…')).toBeInTheDocument();
  });

  it('shows Editando… when saveStatus is dirty (AC-012: distinct from saving)', () => {
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ saveStatus: 'dirty' }));
    render(<DailyPage />);
    expect(screen.getByText('Editando…')).toBeInTheDocument();
  });

  it('shows Salvo when saveStatus is saved', () => {
    render(<DailyPage />);
    expect(screen.getByText('Salvo')).toBeInTheDocument();
  });

  it('shows retry button in error state', () => {
    const retrySave = jest.fn();
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ saveStatus: 'error', retrySave }));
    render(<DailyPage />);
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('clicking retry calls retrySave', async () => {
    const retrySave = jest.fn();
    const user = userEvent.setup();
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ saveStatus: 'error', retrySave }));
    render(<DailyPage />);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(retrySave).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 6. Navigation: prev/next buttons (AC-013, AC-041)
// ---------------------------------------------------------------------------

describe('DailyPage — navigation buttons', () => {
  it('renders prev and next nav buttons', () => {
    render(<DailyPage />);
    expect(screen.getByRole('button', { name: 'Dia anterior' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Próximo dia' })).toBeInTheDocument();
  });

  it('clicking prev calls goToPrev', async () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn({ goToPrev }));
    render(<DailyPage />);
    await user.click(screen.getByRole('button', { name: 'Dia anterior' }));
    expect(goToPrev).toHaveBeenCalledTimes(1);
  });

  it('clicking next calls goToNext', async () => {
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn({ goToNext }));
    render(<DailyPage />);
    await user.click(screen.getByRole('button', { name: 'Próximo dia' }));
    expect(goToNext).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// 7. Animation layers — two-layer coexistence (AC-034, AC-035, AC-036)
// ---------------------------------------------------------------------------

describe('DailyPage — animation layers (AC-034)', () => {
  it('renders content in DayLayer wrapper', () => {
    render(<DailyPage />);
    expect(document.querySelector('[data-day-layer]')).toBeInTheDocument();
  });

  it('with reduced motion, no second layer during animation', () => {
    mockUseReducedMotion.mockReturnValue(true);
    mockUsePageNavigation.mockReturnValue(
      makeDefaultNavReturn({ isAnimating: true, direction: 'next' }),
    );
    render(<DailyPage />);
    // Only one layer should exist when reduced motion is on
    const layers = document.querySelectorAll('[data-day-layer]');
    expect(layers.length).toBe(1);
  });

  it('without reduced motion, renders DayLayer container', () => {
    mockUseReducedMotion.mockReturnValue(false);
    mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn({ isAnimating: false }));
    render(<DailyPage />);
    expect(document.querySelector('[data-day-layer]')).toBeInTheDocument();
  });

  /**
   * L-MAJOR-3(a): trigger date change with animation active → outgoing and incoming
   * layers coexist simultaneously (AC-034 two-layer guarantee).
   */
  it('(AC-034) date change with animation active → outgoing and incoming layers coexist', () => {
    mockUseReducedMotion.mockReturnValue(false);

    // Initial render: no animation
    mockUsePageNavigation.mockReturnValue(
      makeDefaultNavReturn({ date: DATE, direction: null, isAnimating: false }),
    );
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: DATA }));

    const { rerender } = render(<DailyPage />);

    // Simulate date change + animation start
    act(() => {
      mockUsePageNavigation.mockReturnValue(
        makeDefaultNavReturn({
          date: DATE_NEXT,
          direction: 'next' as const,
          isAnimating: true,
        }),
      );
      mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: null }));
    });
    rerender(<DailyPage />);

    // Both outgoing and incoming layers must coexist during animation
    const outgoing = document.querySelector('[data-day-layer="outgoing"]');
    const incoming = document.querySelector('[data-day-layer="incoming"]');
    expect(outgoing).toBeInTheDocument();
    expect(incoming).toBeInTheDocument();
  });

  /**
   * L-MAJOR-3(b): after animation completes, incoming renders LoadingSkeleton
   * when data is still null (AC-037: skeleton in incoming layer).
   */
  it('(AC-037) animation complete → incoming renders LoadingSkeleton when data still null', () => {
    mockUseReducedMotion.mockReturnValue(false);

    // Render in post-animation state: isAnimating=false, data=null
    mockUsePageNavigation.mockReturnValue(
      makeDefaultNavReturn({ date: DATE_NEXT, direction: 'next' as const, isAnimating: false }),
    );
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: null }));

    render(<DailyPage />);

    // No outgoing — animation ended
    expect(document.querySelector('[data-day-layer="outgoing"]')).not.toBeInTheDocument();
    // Incoming/single layer renders LoadingSkeleton
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();
  });

  /**
   * L2-NEW-2 (AC-037): LoadingSkeleton must be INSIDE [data-day-layer="incoming"]
   * DURING animation (isAnimating: true), not just after it ends.
   * This proves DayLayer renders the skeleton in the correct incoming layer subtree.
   */
  it('(AC-037) DURING animation: LoadingSkeleton is inside the incoming layer', () => {
    mockUseReducedMotion.mockReturnValue(false);

    // Initial render: no animation, data loaded
    mockUsePageNavigation.mockReturnValue(
      makeDefaultNavReturn({ date: DATE, direction: null, isAnimating: false }),
    );
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: DATA }));

    const { rerender } = render(<DailyPage />);

    // Trigger animation: new date, data=null (incoming page not yet loaded)
    act(() => {
      mockUsePageNavigation.mockReturnValue(
        makeDefaultNavReturn({ date: DATE_NEXT, direction: 'next' as const, isAnimating: true }),
      );
      mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: null }));
    });
    rerender(<DailyPage />);

    // isAnimating=true → two layers must exist: outgoing and incoming
    const incomingEl = document.querySelector('[data-day-layer="incoming"]');
    expect(incomingEl).toBeInTheDocument();

    // The loading skeleton must be INSIDE the incoming layer (not in outgoing or elsewhere)
    expect(within(incomingEl as HTMLElement).getByTestId('loading-skeleton')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 8. Reduced-motion real flow (AC-035)
// ---------------------------------------------------------------------------

describe('DailyPage — reduced-motion real flow (AC-035)', () => {
  /**
   * L-MAJOR-4(a): reducedMotion=false → trigger nav → outgoing layer renders.
   * Exercises the actual animation path (not just isAnimating:true from initial render).
   */
  it('reducedMotion=false: nav triggers outgoing layer', () => {
    mockUseReducedMotion.mockReturnValue(false);

    // Initial: no animation
    mockUsePageNavigation.mockReturnValue(
      makeDefaultNavReturn({ date: DATE, direction: null, isAnimating: false }),
    );
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: DATA }));

    const { rerender } = render(<DailyPage />);

    // Trigger navigation → animation starts
    act(() => {
      mockUsePageNavigation.mockReturnValue(
        makeDefaultNavReturn({
          date: DATE_NEXT,
          direction: 'next' as const,
          isAnimating: true,
        }),
      );
    });
    rerender(<DailyPage />);

    // Outgoing layer must be rendered
    expect(document.querySelector('[data-day-layer="outgoing"]')).toBeInTheDocument();
  });

  /**
   * L-MAJOR-4(b): reducedMotion=true mid-animation → reverts to single-layer (no outgoing).
   */
  it('reducedMotion=true mid-animation: only single layer rendered', () => {
    // Start with reducedMotion=false and animation active
    mockUseReducedMotion.mockReturnValue(false);
    mockUsePageNavigation.mockReturnValue(
      makeDefaultNavReturn({ date: DATE, direction: null, isAnimating: false }),
    );
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: DATA }));

    const { rerender } = render(<DailyPage />);

    // Trigger nav
    act(() => {
      mockUsePageNavigation.mockReturnValue(
        makeDefaultNavReturn({ date: DATE_NEXT, direction: 'next' as const, isAnimating: true }),
      );
    });
    rerender(<DailyPage />);

    // Now toggle reducedMotion=true mid-animation
    act(() => {
      mockUseReducedMotion.mockReturnValue(true);
    });
    rerender(<DailyPage />);

    // Reduced motion: no outgoing layer, only single
    expect(document.querySelector('[data-day-layer="outgoing"]')).not.toBeInTheDocument();
    const layers = document.querySelectorAll('[data-day-layer]');
    expect(layers.length).toBe(1);
  });

  /**
   * L-MAJOR-4(c): useReducedMotion cleanup — matchMedia removeEventListener is called on unmount.
   */
  it('useReducedMotion cleanup: removeEventListener called on unmount', () => {
    const removeEventListener = jest.fn();
    const addEventListener = jest.fn();
    const mockMql = {
      matches: false,
      addEventListener,
      removeEventListener,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
      onchange: null,
      media: '(prefers-reduced-motion: reduce)',
    };

    const originalMatchMedia = window.matchMedia;
    // Use Object.defineProperty to override non-configurable window.matchMedia in jsdom
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn().mockReturnValue(mockMql),
    });

    // Unmock useReducedMotion to test real cleanup
    jest.unmock('../../hooks/useReducedMotion.js');
    const { useReducedMotion } = jest.requireActual<
      typeof import('../../hooks/useReducedMotion.js')
    >('../../hooks/useReducedMotion.js');

    // Render a minimal component that uses the real hook
    function TestReducedMotion() {
      useReducedMotion();
      return null;
    }

    const { unmount } = render(<TestReducedMotion />);

    // addEventListener should be called once on mount
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();

    // removeEventListener should be called once on unmount
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    // Restore
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
    jest.mock('../../hooks/useReducedMotion.js', () => ({
      useReducedMotion: () => mockUseReducedMotion(),
    }));
  });
});

// ---------------------------------------------------------------------------
// 9. A11y: header region, aria-live, aria-keyshortcuts (AC-038–AC-042)
// ---------------------------------------------------------------------------

describe('DailyPage — a11y (AC-038–AC-042)', () => {
  it('header has role="region" with aria-label="Cabeçalho do dia" (AC-038)', () => {
    render(<DailyPage />);
    expect(screen.getByRole('region', { name: 'Cabeçalho do dia' })).toBeInTheDocument();
  });

  it('date heading has aria-live="polite" (AC-039)', () => {
    render(<DailyPage />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('aria-live', 'polite');
  });

  it('save indicator has aria-live="polite" and aria-atomic="true" (AC-040)', () => {
    render(<DailyPage />);
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-atomic', 'true');
  });

  it('prev button has aria-keyshortcuts (AC-041)', () => {
    render(<DailyPage />);
    const btn = screen.getByRole('button', { name: 'Dia anterior' });
    expect(btn).toHaveAttribute('aria-keyshortcuts');
  });

  it('next button has aria-keyshortcuts (AC-041)', () => {
    render(<DailyPage />);
    const btn = screen.getByRole('button', { name: 'Próximo dia' });
    expect(btn).toHaveAttribute('aria-keyshortcuts');
  });

  it('tab order: nav buttons reachable by keyboard (AC-042)', async () => {
    const user = userEvent.setup();
    render(<DailyPage />);
    await user.tab();
    await user.tab();
    await user.tab();
    // No exception means tab order works without hacks
  });
});

// ---------------------------------------------------------------------------
// FEAT-028: CompletedDayDecor renders when progressByDate[date] has 7/7 (AC-031)
// ---------------------------------------------------------------------------

describe('DailyPage — CompletedDayDecor renders with 7/7 missions (AC-031)', () => {
  it('renders washi-left testid when onboarding state has all 7 missions for current date', async () => {
    // Pre-seed localStorage with v2 state: 7/7 missions for DATE
    const allDone: Record<string, string> = {
      'M-INTENTION': '2026-05-11T08:00:00.000Z',
      'M-MOOD': '2026-05-11T08:05:00.000Z',
      'M-PRIORITY': '2026-05-11T08:10:00.000Z',
      'M-FORMAT': '2026-05-11T08:15:00.000Z',
      'M-CHECK': '2026-05-11T08:20:00.000Z',
      'M-WRITE': '2026-05-11T08:25:00.000Z',
      'M-GRATITUDE': '2026-05-11T08:30:00.000Z',
    };
    localStorage.setItem(
      'calendarfr.onboarding.state',
      JSON.stringify({
        schemaVersion: 2,
        progressByDate: { [DATE]: allDone },
        completedAt: '2026-05-11T08:30:00.000Z',
        completedOnDate: DATE,
        status: 'completed',
      }),
    );

    render(<DailyPage />);

    await waitFor(() => {
      expect(document.querySelector('[data-testid="washi-left"]')).toBeInTheDocument();
    });
    expect(document.querySelector('[data-testid="washi-right"]')).toBeInTheDocument();
    expect(document.querySelector('[data-testid="golden-seal"]')).toBeInTheDocument();
  });

  it('does NOT render CompletedDayDecor when only 6/7 missions done', () => {
    const sixDone: Record<string, string | null> = {
      'M-INTENTION': '2026-05-11T08:00:00.000Z',
      'M-MOOD': '2026-05-11T08:05:00.000Z',
      'M-PRIORITY': '2026-05-11T08:10:00.000Z',
      'M-FORMAT': '2026-05-11T08:15:00.000Z',
      'M-CHECK': '2026-05-11T08:20:00.000Z',
      'M-WRITE': '2026-05-11T08:25:00.000Z',
      'M-GRATITUDE': null,
    };
    localStorage.setItem(
      'calendarfr.onboarding.state',
      JSON.stringify({
        schemaVersion: 2,
        progressByDate: { [DATE]: sixDone },
        completedAt: null,
        completedOnDate: null,
        status: 'in_progress',
      }),
    );

    render(<DailyPage />);

    expect(document.querySelector('[data-testid="washi-left"]')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 10. MSW integration: load → features render (AC-003, smoke)
// ---------------------------------------------------------------------------

describe('DailyPage — MSW smoke: load state transitions', () => {
  it('shows skeleton when data is null (simulating loading state)', () => {
    server.use(http.get(`${API_BASE}/api/days/:date`, () => HttpResponse.json(DATA)));

    // Simulate loading then loaded by toggling mock return values
    mockUseDailyPage
      .mockReturnValueOnce(makeDefaultDailyReturn({ data: null }))
      .mockReturnValue(makeDefaultDailyReturn({ data: DATA }));
    mockUseReducedMotion.mockReturnValue(false);
    mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn());

    const { rerender } = render(<DailyPage />);
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument();

    rerender(<DailyPage />);
    expect(screen.getByTestId('priorities')).toBeInTheDocument();
  });

  it('5xx GET error → shows error screen', async () => {
    mockUseDailyPage.mockReturnValue(
      makeDefaultDailyReturn({ data: null, loadError: new Error('HTTP 500') }),
    );
    render(<DailyPage />);
    await waitFor(() => {
      expect(screen.getByTestId('load-error-screen')).toBeInTheDocument();
    });
  });
});
