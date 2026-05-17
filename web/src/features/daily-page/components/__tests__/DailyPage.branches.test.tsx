/**
 * Branch coverage tests for DailyPage.tsx.
 *
 * T-010: Removed stale toPrioritiesTuple throw test — T-007 removed that guard.
 * DailyPage now accepts Priority[] directly with no tuple cast.
 */

import type { DailyPageData } from '@calendarfr/shared';
import { render, screen } from '@testing-library/react';
import React from 'react';

import { DailyPage } from '../DailyPage.js';

// ---------------------------------------------------------------------------
// Mock the same modules as in the integration test
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

function makeData(overrides?: Partial<DailyPageData>): DailyPageData {
  return {
    schemaVersion: 1,
    date: DATE,
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
    data: makeData(),
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
  mockUseReducedMotion.mockReturnValue(false);
  mockUsePageNavigation.mockReturnValue(makeDefaultNavReturn());
  mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn());
});

afterEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

// ---------------------------------------------------------------------------
// DailyPage renders normally with Priority[] (no tuple guard)
// toPrioritiesTuple was removed in T-007; DailyPage accepts any Priority[].
// ---------------------------------------------------------------------------

describe('DailyPage — renders with Priority[] (AC-012)', () => {
  it('renders with 1 priority item', () => {
    const oneItem = makeData({
      priorities: [{ id: 'a', text: '', done: false }] as DailyPageData['priorities'],
    });
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: oneItem }));
    expect(() => {
      render(<DailyPage />);
    }).not.toThrow();
    expect(screen.getByTestId('priorities')).toBeInTheDocument();
  });

  it('renders with 3 priority items (default fixture)', () => {
    expect(() => {
      render(<DailyPage />);
    }).not.toThrow();
    expect(screen.getByTestId('priorities')).toBeInTheDocument();
  });

  it('renders with 5 priority items', () => {
    const fiveItems = makeData({
      priorities: Array.from({ length: 5 }, (_, i) => ({
        id: `p${i}`,
        text: '',
        done: false,
      })) as DailyPageData['priorities'],
    });
    mockUseDailyPage.mockReturnValue(makeDefaultDailyReturn({ data: fiveItems }));
    expect(() => {
      render(<DailyPage />);
    }).not.toThrow();
    expect(screen.getByTestId('priorities')).toBeInTheDocument();
  });
});
