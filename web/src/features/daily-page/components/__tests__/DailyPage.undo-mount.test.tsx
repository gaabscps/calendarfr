/**
 * DailyPage.undo-mount.test.tsx — FEAT-022 T-008.
 *
 * Covers AC-014 (UndoQueueProvider + UndoToastHost mounted at DailyPage root)
 * and AC-015 (flushAll called on unmount and on date change).
 *
 * Strategy: mock the `@/features/undo-delete` barrel so the Provider becomes
 * a pass-through and `useUndoQueueContext` returns a deterministic queue +
 * spy `flushAll`. This isolates the mounting/flush contract from the real
 * timer-based queue (covered separately in undo-delete unit tests).
 */

import type { DailyPageData } from '@calendarfr/shared';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { DailyPage } from '../DailyPage.js';

// ---------------------------------------------------------------------------
// Mock heavy feature components — keep tests fast and isolated
// ---------------------------------------------------------------------------

jest.mock('@/features/priorities', () => ({
  Priorities: ({ value }: { value: unknown }) => (
    <div data-testid="priorities" data-value={JSON.stringify(value)} />
  ),
  EMPTY_PRIORITY: { id: '', text: '', done: false },
}));

jest.mock('@/features/mood', () => ({
  MoodPicker: ({ value }: { value: unknown }) => (
    <div data-testid="mood-picker" data-value={JSON.stringify(value)} />
  ),
  MoodPopover: ({ value }: { value: unknown }) => (
    <div data-testid="mood-picker" data-value={JSON.stringify(value)} />
  ),
}));

jest.mock('@/features/agenda', () => ({
  Agenda: ({ value }: { value: unknown }) => (
    <div data-testid="agenda" data-value={JSON.stringify(value)} />
  ),
  EMPTY_AGENDA: Array.from({ length: 18 }, (_, i) => ({ hour: i + 6, text: '' })),
}));

jest.mock('@/features/notes', () => ({
  Notes: ({ value }: { value: unknown }) => (
    <div data-testid="notes" data-value={JSON.stringify(value)} />
  ),
}));

jest.mock('@/features/sticky-note', () => ({
  StickyNote: () => null,
}));

// ---------------------------------------------------------------------------
// Mock undo-delete barrel — capture flushAll calls, drive queue length
// ---------------------------------------------------------------------------

const flushAllSpy = jest.fn();
let mockQueue: Array<{ id: string }> = [];

jest.mock('@/features/undo-delete', () => ({
  UndoQueueProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UndoToastHost: () => <div data-testid="undo-toast-host" />,
  useUndoQueueContext: () => ({
    queue: mockQueue,
    enqueueUndo: jest.fn(),
    cancelUndo: jest.fn(),
    flushAll: flushAllSpy,
  }),
}));

// ---------------------------------------------------------------------------
// Mock daily-page hooks
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

const DATE = '2099-12-31';
const DATE_NEXT = '2100-01-01';

function makeData(date: string): DailyPageData {
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
  };
}

function makeDefaultNavReturn(date: string = DATE, overrides = {}) {
  return {
    date,
    direction: null as 'prev' | 'next' | null,
    isAnimating: false,
    goToPrev: jest.fn().mockResolvedValue(undefined),
    goToNext: jest.fn().mockResolvedValue(undefined),
    goToDate: jest.fn().mockResolvedValue(undefined),
    swipeProps: {},
    ...overrides,
  };
}

function makeDefaultDailyReturn(date: string = DATE, overrides = {}) {
  return {
    data: makeData(date),
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
    }),
  );
  mockQueue = [];
  flushAllSpy.mockClear();
  mockUseReducedMotion.mockReturnValue(false);
  mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn());
  mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn());
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// AC-014: Provider + Host mounted
// ---------------------------------------------------------------------------

describe('DailyPage — undo Provider + Host (AC-014)', () => {
  it('mounts UndoToastHost as a sibling of the page tree', () => {
    render(<DailyPage initialDate={DATE} />);
    expect(screen.getByTestId('undo-toast-host')).toBeInTheDocument();
  });

  it('renders without crashing inside the UndoQueueProvider', () => {
    render(<DailyPage initialDate={DATE} />);
    // PaperSheet wrapper still present — Provider didn't break the layout
    expect(document.querySelector('[data-paper-sheet="true"]')).toBeInTheDocument();
  });

  it('passes gateOpen=true to useDailyPage when queue is empty', () => {
    mockQueue = [];
    render(<DailyPage initialDate={DATE} />);
    // useDailyPage(date, { gateOpen: queue.length === 0 })
    expect(mockUseDailyPage).toHaveBeenCalledWith(DATE, { gateOpen: true });
  });

  it('passes gateOpen=false to useDailyPage when queue has entries', () => {
    mockQueue = [{ id: 'u1' }];
    render(<DailyPage initialDate={DATE} />);
    expect(mockUseDailyPage).toHaveBeenCalledWith(DATE, { gateOpen: false });
  });
});

// ---------------------------------------------------------------------------
// AC-015: flushAll on unmount + on date change
// ---------------------------------------------------------------------------

describe('DailyPage — flush on unmount / date change (AC-015)', () => {
  it('calls flushAll when the component unmounts', () => {
    const { unmount } = render(<DailyPage initialDate={DATE} />);
    expect(flushAllSpy).not.toHaveBeenCalled();

    unmount();

    expect(flushAllSpy).toHaveBeenCalledTimes(1);
  });

  it('calls flushAll when the navigated date changes', () => {
    mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn(DATE));
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn(DATE));

    const { rerender } = render(<DailyPage initialDate={DATE} />);
    expect(flushAllSpy).not.toHaveBeenCalled();

    // Simulate page navigation: usePageNavigation now reports the next date.
    mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn(DATE_NEXT));
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn(DATE_NEXT));
    rerender(<DailyPage initialDate={DATE} />);

    // Cleanup of the previous effect ran with date=DATE → flushAll fired exactly once.
    expect(flushAllSpy).toHaveBeenCalledTimes(1);
  });
});
