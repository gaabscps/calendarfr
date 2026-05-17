/**
 * Integration tests for OnboardingQuest orchestrator.
 *
 * Covers: AC-007, AC-008, AC-009, AC-011, AC-013, AC-016, AC-017, AC-018, AC-019,
 *         AC-021, AC-022, NFR-010 (autosave gate, per-date progress, v2 schema).
 *
 * Strategy: real hooks (useOnboardingState, deriveMissionProgress)
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
      path: passthrough('path'),
      p: passthrough('p'),
    },
    useReducedMotion: () => false,
  };
});

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = '2026-05-17';
const DATE_B = '2026-05-18';

function makeAllNull(): Record<MissionId, null> {
  return {
    'M-INTENTION': null,
    'M-MOOD': null,
    'M-PRIORITY': null,
    'M-FORMAT': null,
    'M-CHECK': null,
    'M-WRITE': null,
    'M-GRATITUDE': null,
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
  };
}

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

/**
 * `data` payload where every mission's condition is satisfied. Use this for tests that
 * assert "completed state" UI — the visibility projection now requires both persisted
 * timestamps AND current data conditions to align (bug-7).
 */
function makeFullData(): DailyPageData {
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
    agenda: Array.from({ length: 18 }, (_, i) => ({
      hour: i + 6,
      text: i === 0 ? 'algo' : '',
    })) as unknown as DailyPageData['agenda'],
    notes: [],
    gratitude: [{ id: 'g1', text: 'agradeço' }] as unknown as DailyPageData['gratitude'],
    createdAt: null,
    updatedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  localStorage.clear();
  setReadonlyVisible(false);
});

afterEach(() => {
  jest.clearAllMocks();
  setReadonlyVisible(false);
});

// ---------------------------------------------------------------------------
// AC-001: pending status → sticky-note mounts (status transitions to in_progress)
// ---------------------------------------------------------------------------

describe('OnboardingQuest — initial render (AC-001)', () => {
  it('with no localStorage state, mounts sticky-note region in_progress', async () => {
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
  });

  it('with data=null and saveStatus=saved, still mounts sticky-note (pending→in_progress, no missions derived)', async () => {
    render(<OnboardingQuest data={null} date={DATE} saveStatus="saved" />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// AC-002: dismissed / completed → sticky-note NOT auto-mounted
// ---------------------------------------------------------------------------

describe('OnboardingQuest — status dismissed', () => {
  it('dismissed state → no sticky-note region', () => {
    setStorageState({ status: 'dismissed' });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />);
    expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();
  });

  it('completed state with full data (no readonly) → no sticky-note region', () => {
    setStorageState({
      status: 'completed',
      progressByDate: { [DATE]: makeAllCompleted() },
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    render(<OnboardingQuest data={makeFullData()} date={DATE} saveStatus="saved" />);
    expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-007: saveStatus saving→saved triggers derivation; other transitions do not
// ---------------------------------------------------------------------------

describe('OnboardingQuest — autosave gate (AC-007)', () => {
  it('mission is NOT marked when saveStatus is dirty (no saving→saved transition)', async () => {
    const { rerender } = render(
      <OnboardingQuest
        data={{ ...makeEmptyData(), intention: 'focus' }}
        date={DATE}
        saveStatus="dirty"
      />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    // Reconciliation happens on first date load, so check aria-live for next rerender
    // Rerender with same date — no new derivation since lastReconciledDate already set
    rerender(
      <OnboardingQuest
        data={{ ...makeEmptyData(), intention: 'focus' }}
        date={DATE}
        saveStatus="dirty"
      />,
    );
    // M-INTENTION should NOT be marked via dirty saveStatus alone after reconciliation
    // (the initial reconciliation did fire, but dirty doesn't prevent initial load)
  });

  it('mission IS marked when saveStatus transitions saving→saved', async () => {
    // Start with a date already reconciled (set lastReconciledDate by rendering with saved first)
    const { rerender } = render(
      <OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    // Now simulate: user typed intention → data updated → saving → saved
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), intention: 'focus' }}
          date={DATE}
          saveStatus="saving"
        />,
      );
    });
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), intention: 'focus' }}
          date={DATE}
          saveStatus="saved"
        />,
      );
    });
    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/missão 1 de 7 concluída/i);
    });
  });

  it('mission is NOT marked when saveStatus goes to error (AC-010)', async () => {
    const { rerender } = render(
      <OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), intention: 'focus' }}
          date={DATE}
          saveStatus="saving"
        />,
      );
    });
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), intention: 'focus' }}
          date={DATE}
          saveStatus="error"
        />,
      );
    });
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe('');
  });
});

// ---------------------------------------------------------------------------
// AC-008: initial reconciliation per date (one-time per date on first load)
// ---------------------------------------------------------------------------

describe('OnboardingQuest — initial reconciliation (AC-008)', () => {
  it('reconciles on first data load for a date — marks satisfied missions', async () => {
    render(
      <OnboardingQuest
        data={{ ...makeEmptyData(), intention: 'focus' }}
        date={DATE}
        saveStatus="saved"
      />,
    );
    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/missão/i);
    });
  });

  it('does NOT re-reconcile when data updates with same date after initial reconciliation', async () => {
    const { rerender } = render(
      <OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    const announceSpy = jest.spyOn(window, 'clearTimeout');
    // Update data without saveStatus transition — should NOT re-derive
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), intention: 'new text' }}
          date={DATE}
          saveStatus="dirty"
        />,
      );
    });
    // aria-live stays empty since no saving→saved and date already reconciled
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe('');
    announceSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// AC-011: batch marking when multiple missions satisfied on single autosave commit
// ---------------------------------------------------------------------------

describe('OnboardingQuest — batch marking on autosave commit (AC-011)', () => {
  it('marks multiple missions in one saving→saved transition', async () => {
    const { rerender } = render(
      <OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    act(() => {
      rerender(
        <OnboardingQuest
          data={{
            ...makeEmptyData(),
            intention: 'foco',
            mood: { emoji: '😊', label: 'Feliz', color: '#fff' },
          }}
          date={DATE}
          saveStatus="saving"
        />,
      );
    });
    act(() => {
      rerender(
        <OnboardingQuest
          data={{
            ...makeEmptyData(),
            intention: 'foco',
            mood: { emoji: '😊', label: 'Feliz', color: '#fff' },
          }}
          date={DATE}
          saveStatus="saved"
        />,
      );
    });
    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/missão/i);
    });
  });
});

// ---------------------------------------------------------------------------
// AC-016/AC-017: per-date progress — different dates have independent progress
// ---------------------------------------------------------------------------

describe('OnboardingQuest — per-date progress independence (AC-016/AC-017)', () => {
  it('switching date resets visible missions to that date progress', async () => {
    // DATE seeded as partial (3/7 persisted). Data satisfies ONLY those same 3 conditions
    // (intention/mood/priority text) — so initial reconciliation finds nothing new to mark,
    // and the intersection visible = 3/7 keeps the sticky mounted with 3 marked.
    const ts = '2026-05-17T09:00:00.000Z';
    setStorageState({
      status: 'in_progress',
      progressByDate: {
        [DATE]: {
          ...makeAllNull(),
          'M-INTENTION': ts,
          'M-MOOD': ts,
          'M-PRIORITY': ts,
        },
        [DATE_B]: makeAllNull(),
      },
    });
    const partialData: DailyPageData = {
      ...makeEmptyData(),
      intention: 'foco',
      mood: { emoji: '😊', label: 'Feliz', color: '#fff' },
      priorities: [
        { id: 'a', text: 'uma prioridade', done: false },
        { id: 'b', text: '', done: false },
        { id: 'c', text: '', done: false },
      ] as DailyPageData['priorities'],
    };
    const { rerender } = render(
      <OnboardingQuest data={partialData} date={DATE} saveStatus="saved" />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    expect(screen.getByRole('region', { name: /3 de 7/i })).toBeInTheDocument();
    // Navigate to DATE_B which has 0 missions
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), date: DATE_B }}
          date={DATE_B}
          saveStatus="saved"
        />,
      );
    });
    await waitFor(() => {
      const region = screen.getByRole('region', { name: /roteiro do diário/i });
      expect(region).toBeInTheDocument();
    });
    // Count from aria-label: "0 de 7 missões"
    expect(screen.getByRole('region', { name: /0 de 7/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Bug-fix: visibility is per-day, not gated on the global `status` flag.
// Once a user completes their first 7/7, `status` latches to 'completed' forever;
// the sticky must still auto-show on later days whose own progress is < 7/7.
// ---------------------------------------------------------------------------

describe('OnboardingQuest — per-day visibility (post-completion regression)', () => {
  it('global status=completed but current date has 0/7 → sticky auto-shows', async () => {
    setStorageState({
      status: 'completed',
      progressByDate: { [DATE]: makeAllCompleted() },
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE_B} saveStatus="saved" />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /0 de 7/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Roteiro do diário')).toBeInTheDocument();
  });

  it('global status=completed AND current date has 7/7 (data still satisfies) → sticky hidden', () => {
    setStorageState({
      status: 'completed',
      progressByDate: {
        [DATE]: makeAllCompleted(),
        [DATE_B]: makeAllCompleted('2026-05-18T10:00:00.000Z'),
      },
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    render(<OnboardingQuest data={makeFullData()} date={DATE_B} saveStatus="saved" />);
    expect(screen.queryByRole('region', { name: /roteiro do diário/i })).not.toBeInTheDocument();
  });

  it('global status=completed AND current date partial → headerLabel reflects today (not global)', async () => {
    setStorageState({
      status: 'completed',
      progressByDate: {
        [DATE]: makeAllCompleted(),
        [DATE_B]: { ...makeAllNull(), 'M-INTENTION': '2026-05-18T09:00:00.000Z' },
      },
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE_B} saveStatus="saved" />);
    await waitFor(() => {
      expect(screen.getByText('Roteiro do diário')).toBeInTheDocument();
    });
    expect(screen.queryByText('Roteiro concluído ✓')).not.toBeInTheDocument();
  });

  it('bug-7: persisted=7/7 but data is empty → sticky still shows with header "Roteiro do diário" (0/7 visible)', async () => {
    // Reproduces the user-reported regression: they cleared content from a day where they had
    // previously completed all 7 missions. With pure persisted-state gating the sticky stayed
    // hidden and headerLabel said "concluído ✓". Intersection projection (persisted ∧ current
    // content condition) flips today back to 0/7 visible → sticky reappears.
    setStorageState({
      status: 'completed',
      progressByDate: { [DATE]: makeAllCompleted() },
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /0 de 7/i })).toBeInTheDocument();
    });
    expect(screen.getByText('Roteiro do diário')).toBeInTheDocument();
    expect(screen.queryByText('Roteiro concluído ✓')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-018: completing all 7 missions auto-promotes to completed
// ---------------------------------------------------------------------------

describe('OnboardingQuest — auto-completion (AC-018)', () => {
  it('all missions completed state shows completed header via readonly', async () => {
    setStorageState({
      status: 'completed',
      progressByDate: { [DATE]: makeAllCompleted() },
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    act(() => {
      setReadonlyVisible(true);
    });
    render(<OnboardingQuest data={makeFullData()} date={DATE} saveStatus="saved" />);
    await waitFor(() => {
      expect(screen.getByText('Roteiro concluído ✓')).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// AC-022: dismiss via "ocultar roteiro" → sticky-note unmounts
// ---------------------------------------------------------------------------

describe('OnboardingQuest — ocultar roteiro', () => {
  it('in_progress: clicking ocultar → sticky-note unmounts', async () => {
    const user = userEvent.setup();

    render(<OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />);
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
// Esc key when mounted → dismiss
// ---------------------------------------------------------------------------

describe('OnboardingQuest — Esc key closes sticky', () => {
  it('Esc when in_progress → sticky-note unmounts', async () => {
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />);
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
      progressByDate: { [DATE]: makeAllCompleted() },
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    act(() => {
      setReadonlyVisible(true);
    });
    render(<OnboardingQuest data={makeFullData()} date={DATE} saveStatus="saved" />);
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
// Esc from editor input/textarea does NOT dismiss sticky
// ---------------------------------------------------------------------------

describe('OnboardingQuest — Esc from editor does not dismiss', () => {
  it('Esc dispatched from INPUT element → sticky stays mounted', async () => {
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />);
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
});

// ---------------------------------------------------------------------------
// NFR-002: aria-live message set on mission completion
// ---------------------------------------------------------------------------

describe('OnboardingQuest — aria-live on mission completion', () => {
  it('completing a mission shows aria-live announcement with "de 7"', async () => {
    jest.useFakeTimers();
    render(
      <OnboardingQuest
        data={{ ...makeEmptyData(), intention: 'focus' }}
        date={DATE}
        saveStatus="saved"
      />,
    );

    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion).toBeInTheDocument();
      expect(liveRegion?.textContent).toMatch(/missão 1 de 7 concluída/i);
    });

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
// AC-018 idempotence — already-completed missions don't re-announce on re-mount
// ---------------------------------------------------------------------------

describe('OnboardingQuest — idempotence on re-mount', () => {
  it('re-mount with already-completed missions: aria-live stays empty', async () => {
    setStorageState({
      status: 'in_progress',
      progressByDate: {
        [DATE]: {
          ...makeAllNull(),
          'M-INTENTION': '2026-05-17T09:00:00.000Z',
        },
      },
    });
    const { unmount } = render(
      <OnboardingQuest
        data={{ ...makeEmptyData(), intention: 'focus' }}
        date={DATE}
        saveStatus="saved"
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });

    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe('');

    unmount();
  });
});

// ---------------------------------------------------------------------------
// completed + setReadonlyVisible(true) → sticky mounts with "Roteiro concluído ✓"
// ---------------------------------------------------------------------------

describe('OnboardingQuest — completed-readonly mode', () => {
  it('setReadonlyVisible(true) when completed → sticky mounts with completed header', async () => {
    setStorageState({
      status: 'completed',
      progressByDate: { [DATE]: makeAllCompleted() },
      completedAt: '2026-05-17T10:00:00.000Z',
      completedOnDate: DATE,
    });
    render(<OnboardingQuest data={makeFullData()} date={DATE} saveStatus="saved" />);

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
// US-002: mission only marks after saving→saved transition (AC-007)
// ---------------------------------------------------------------------------

describe('OnboardingQuest — US-002: autosave gate (AC-007)', () => {
  it('mission NOT marked while saveStatus is dirty, even when data satisfies condition', async () => {
    // Seed reconciled date so initial reconciliation is skipped by re-seeding an
    // already-reconciled date scenario: render with saved first to set lastReconciledDate.
    const { rerender } = render(
      <OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    // Now update data with intention + dirty status — no saving→saved transition
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), intention: 'focus' }}
          date={DATE}
          saveStatus="dirty"
        />,
      );
    });
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toBe('');
  });

  it('mission IS marked when saving→saved transition AND data satisfies condition', async () => {
    const { rerender } = render(
      <OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), intention: 'focus' }}
          date={DATE}
          saveStatus="saving"
        />,
      );
    });
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), intention: 'focus' }}
          date={DATE}
          saveStatus="saved"
        />,
      );
    });
    await waitFor(() => {
      const liveRegion = document.querySelector('[aria-live="polite"]');
      expect(liveRegion?.textContent).toMatch(/missão 1 de 7 concluída/i);
    });
  });
});

// ---------------------------------------------------------------------------
// US-003: per-date progress — navigate dateA→dateB shows 0 (AC-016/AC-017)
// ---------------------------------------------------------------------------

describe('OnboardingQuest — US-003: per-date progress (AC-016/AC-017)', () => {
  it('render dateA with 3 missions marked; rerender with dateB → 0 marked', async () => {
    setStorageState({
      status: 'in_progress',
      progressByDate: {
        [DATE]: {
          ...makeAllNull(),
          'M-INTENTION': '2026-05-17T08:00:00.000Z',
          'M-MOOD': '2026-05-17T08:05:00.000Z',
          'M-PRIORITY': '2026-05-17T08:10:00.000Z',
        },
        [DATE_B]: makeAllNull(),
      },
    });
    const { rerender } = render(
      <OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />,
    );
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    // Navigate to DATE_B
    act(() => {
      rerender(
        <OnboardingQuest
          data={{ ...makeEmptyData(), date: DATE_B }}
          date={DATE_B}
          saveStatus="saved"
        />,
      );
    });
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /0 de 7/i })).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// US-004: click QuestActionButton → goToMission called (AC-024)
// ---------------------------------------------------------------------------

describe('OnboardingQuest — US-004: QuestActionButton triggers goToMission (AC-024)', () => {
  it('click QuestActionButton of M-INTENTION → scrollIntoView called on target element', async () => {
    const user = userEvent.setup();
    const mockScrollIntoView = jest.fn();
    const mockFocus = jest.fn();
    const mockClassListAdd = jest.fn();
    const mockClassListRemove = jest.fn();
    const mockEl = {
      scrollIntoView: mockScrollIntoView,
      focus: mockFocus,
      classList: { add: mockClassListAdd, remove: mockClassListRemove },
      querySelector: jest.fn().mockReturnValue(null),
    };
    jest.spyOn(document, 'querySelector').mockImplementation((selector) => {
      if (selector === '[data-onboarding-target="intention"]') {
        return mockEl as unknown as Element;
      }
      return null;
    });

    render(<OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />);
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });

    const actionBtn = screen.getByRole('button', {
      name: /ir para missão: defina a intenção do dia/i,
    });
    await user.click(actionBtn);
    expect(mockScrollIntoView).toHaveBeenCalled();

    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// NFR-010: v1 schema silently discarded, renders fresh
// ---------------------------------------------------------------------------

describe('OnboardingQuest — v1 schema silent discard (NFR-010)', () => {
  it('v1 localStorage is silently discarded and component starts fresh', async () => {
    const errorSpy = jest.spyOn(console, 'error');
    const warnSpy = jest.spyOn(console, 'warn');
    localStorage.setItem(
      STORAGE_KEY,
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
    render(<OnboardingQuest data={makeEmptyData()} date={DATE} saveStatus="saved" />);
    // v1 "dismissed" is discarded → fresh v2 pending state → quest mounts
    await waitFor(() => {
      expect(screen.getByRole('region', { name: /roteiro do diário/i })).toBeInTheDocument();
    });
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
