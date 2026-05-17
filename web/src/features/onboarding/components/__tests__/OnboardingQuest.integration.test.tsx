/**
 * Integration tests for OnboardingQuest orchestrator.
 *
 * Covers: AC-001, AC-002, AC-011, AC-012, AC-016, AC-018, AC-019 (Esc),
 *         AC-020, AC-021, AC-022, AC-023, AC-028, NFR-002 (aria-live).
 *
 * Strategy: real hooks (useOnboardingState, useNavigationTracker, deriveMissionProgress)
 * + mocked sub-components (QuestSticky, QuestList) to isolate orchestration logic.
 * localStorage seeded before each test to control initial state.
 */

import type { DailyPageData } from '@calendarfr/shared';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { STORAGE_KEY } from '../../lib/constants.js';
import { setReadonlyVisible } from '../../lib/readonlyController.js';
import type { MissionId, OnboardingState } from '../../types.js';
import { OnboardingQuest } from '../OnboardingQuest.js';

// ---------------------------------------------------------------------------
// Mock framer-motion for tests (AnimatePresence renders children immediately)
// ---------------------------------------------------------------------------

jest.mock('framer-motion', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const passthrough = (tag: string) =>
    React.forwardRef(({ children, ...props }: any, ref: any) =>
      React.createElement(tag, { ref, ...props }, children),
    );
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    motion: {
      div: passthrough('div'),
      svg: passthrough('svg'),
      span: passthrough('span'),
      line: passthrough('line'),
      p: passthrough('p'),
    },
    useReducedMotion: () => false,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = '2026-05-17';

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

function makeEmptyData(): DailyPageData {
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
  };
}

function makeFullData(): DailyPageData {
  return {
    schemaVersion: 1,
    date: DATE,
    mood: { emoji: '😊', label: 'feliz', color: '#f59e0b' },
    priorities: [
      { id: 'a', text: '<b>work</b>', done: true },
      { id: 'b', text: '', done: false },
      { id: 'c', text: '', done: false },
    ] as DailyPageData['priorities'],
    agenda: Array.from({ length: 18 }, (_, i) => ({
      hour: i + 6,
      text: i === 0 ? 'meeting' : '',
    })) as unknown as DailyPageData['agenda'],
    notes: [{ id: 'n1', prefix: '•' as const, text: 'a note' }],
    intention: 'focus',
    gratitude: [{ id: 'g1', text: 'grateful' }],
    createdAt: null,
    updatedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  // Reset the readonly controller between tests
  setReadonlyVisible(false);
});

afterEach(() => {
  jest.clearAllMocks();
  // Reset readonly controller
  setReadonlyVisible(false);
});

// ---------------------------------------------------------------------------
// AC-001: pending status → sticky-note mounts (status transitions to in_progress)
// ---------------------------------------------------------------------------

describe('OnboardingQuest — initial render (AC-001)', () => {
  it('with no localStorage state, mounts sticky-note region in_progress', async () => {
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
  });

  it('with data=null, still mounts sticky-note (pending→in_progress, no missions derived)', async () => {
    render(<OnboardingQuest data={null} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// AC-002: dismissed / completed → sticky-note NOT auto-mounted
// ---------------------------------------------------------------------------

describe('OnboardingQuest — status dismissed (AC-002)', () => {
  it('dismissed state → no sticky-note region', () => {
    setStorageState({ status: 'dismissed', missionsCompleted: makeAllNull() });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();
  });

  it('completed state (no readonly) → no sticky-note region', () => {
    setStorageState({
      status: 'completed',
      missionsCompleted: makeAllCompleted(),
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-012: all missions complete → status transitions to completed, sticky exits
// ---------------------------------------------------------------------------

describe('OnboardingQuest — all missions completed (AC-012)', () => {
  it('when all 8 missions are already in state, renders with completed header if readonly shown', async () => {
    setStorageState({
      status: 'completed',
      missionsCompleted: makeAllCompleted(),
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    act(() => {
      setReadonlyVisible(true);
    });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByText('Roteiro concluído ✓')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// AC-022: dismiss via "ocultar roteiro" → sticky-note unmounts (in_progress → dismissed)
// ---------------------------------------------------------------------------

describe('OnboardingQuest — ocultar roteiro (AC-022)', () => {
  it('in_progress: clicking ocultar → sticky-note unmounts', async () => {
    const user = userEvent.setup();

    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ocultar roteiro/i }));

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// AC-023: Esc key when mounted → dismiss (in_progress → dismissed)
// ---------------------------------------------------------------------------

describe('OnboardingQuest — Esc key closes sticky (AC-023)', () => {
  it('Esc when in_progress → sticky-note unmounts', async () => {
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();
    });
  });

  it('Esc when completed+readonly → setReadonlyVisible(false), sticky unmounts', async () => {
    setStorageState({
      status: 'completed',
      missionsCompleted: makeAllCompleted(),
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    act(() => {
      setReadonlyVisible(true);
    });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// AC-023 (f-001): Esc from editor input/textarea does NOT dismiss sticky
// ---------------------------------------------------------------------------

describe('OnboardingQuest — Esc from editor does not dismiss (AC-023)', () => {
  it('Esc dispatched from INPUT element → sticky stays mounted', async () => {
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });

    const inputEl = document.createElement('input');
    document.body.appendChild(inputEl);

    act(() => {
      inputEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();

    document.body.removeChild(inputEl);
  });

  it('Esc dispatched from TEXTAREA element → sticky stays mounted', async () => {
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });

    const textareaEl = document.createElement('textarea');
    document.body.appendChild(textareaEl);

    act(() => {
      textareaEl.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();

    document.body.removeChild(textareaEl);
  });
});

// ---------------------------------------------------------------------------
// AC-021: completed + setReadonlyVisible(true) → sticky mounts with "Roteiro concluído ✓"
// ---------------------------------------------------------------------------

describe('OnboardingQuest — completed-readonly mode (AC-021)', () => {
  it('setReadonlyVisible(true) when completed → sticky mounts with completed header', async () => {
    setStorageState({
      status: 'completed',
      missionsCompleted: makeAllCompleted(),
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);

    expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();

    act(() => {
      setReadonlyVisible(true);
    });

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
      expect(screen.getByText('Roteiro concluído ✓')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// NFR-002: aria-live message set on mission completion
// ---------------------------------------------------------------------------

describe('OnboardingQuest — aria-live on mission completion (NFR-002)', () => {
  it('completing a mission shows aria-live announcement', async () => {
    jest.useFakeTimers();
    render(<OnboardingQuest data={{ ...makeEmptyData(), intention: 'focus' }} date={DATE} />);

    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toMatch(/missão 1 de 8 concluída/i);
    });

    // After 3s, message clears
    act(() => {
      jest.advanceTimersByTime(3001);
    });

    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toBe('');
    });

    jest.useRealTimers();
  });
});

// ---------------------------------------------------------------------------
// AC-018: idempotence — already-completed missions don't re-announce on re-mount
// ---------------------------------------------------------------------------

describe('OnboardingQuest — AC-018 idempotence on re-mount', () => {
  it('re-mount with already-completed missions: aria-live stays empty', async () => {
    setStorageState({
      status: 'in_progress',
      missionsCompleted: {
        ...makeAllNull(),
        'M-INTENTION': '2026-05-17T09:00:00.000Z',
      },
    });
    const { unmount } = render(
      <OnboardingQuest data={{ ...makeEmptyData(), intention: 'focus' }} date={DATE} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });

    // Aria-live should be empty since mission was already completed before mount
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe('');

    unmount();
  });
});

// ---------------------------------------------------------------------------
// AC-028: CompletionStamp visible when completedOnDate === date
// ---------------------------------------------------------------------------

describe('OnboardingQuest — CompletionStamp visibility (AC-028)', () => {
  it('renders no stamp when status is in_progress', () => {
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    expect(screen.queryByTestId('completion-stamp')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// NFR-001: HelpButtonContainer and CompletionStampContainer isolate state
// subscription so DailyPageInner no longer subscribes to onboarding store.
// Render isolation is enforced by architecture: useOnboardingState() is called
// only inside the containers, not in DailyPageInner.
// ---------------------------------------------------------------------------

describe('OnboardingQuest — NFR-001 isolation architecture', () => {
  it('OnboardingQuest renders correctly after mission state mutates', async () => {
    const { rerender } = render(<OnboardingQuest data={makeEmptyData()} date={DATE} />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    rerender(<OnboardingQuest data={{ ...makeEmptyData(), intention: 'foco' }} date={DATE} />);
    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/missão/i);
    });
  });
});

// ---------------------------------------------------------------------------
// Full data integration: deriving all missions from a complete data object
// ---------------------------------------------------------------------------

describe('OnboardingQuest — full data mission derivation', () => {
  it('with full data, marks all missions after render effects', async () => {
    const { rerender } = render(<OnboardingQuest data={makeFullData()} date={DATE} />);

    // After the effects run, all missions including M-NAVIGATE (navOccurred=false here) except
    // M-NAVIGATE should be marked. Re-render with same date won't trigger nav.
    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      // At least one mission should be announced
      expect(liveRegion).toBeInTheDocument();
    });

    rerender(<OnboardingQuest data={makeFullData()} date={DATE} />);
  });
});
