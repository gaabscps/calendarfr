/**
 * Storybook stories for OnboardingQuest — CSF3 format.
 *
 * Covers SC-002: 5 states — Pending, InProgressPartial, CompletedActive, CompletedReadonly,
 * CompletedDay (with CompletedDayDecor skin).
 *
 * Each story seeds localStorage synchronously in a decorator before the component
 * mounts, so that useOnboardingState (useSyncExternalStore) reads the correct
 * initial snapshot. Direct localStorage.setItem (not writeStorage) ensures test
 * isolation: each story starts from a known state without depending on prior story
 * execution order or module-level storage cache.
 */

import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';

import { CUSTOM_EVENT_NAME, STORAGE_KEY } from '../../lib/constants.js';
import { setReadonlyVisible } from '../../lib/readonlyController.js';
import type { MissionId, OnboardingState } from '../../types.js';
import { MissionSealSlot } from '../MissionSealSlot.js';
import { OnboardingQuest } from '../OnboardingQuest.js';

// ── Fixture data ─────────────────────────────────────────────────────────────

const TODAY = '2026-05-17';

const PARTIAL_MISSIONS: Record<MissionId, string | null> = {
  'M-INTENTION': '2026-05-17T08:00:00.000Z',
  'M-MOOD': '2026-05-17T08:05:00.000Z',
  'M-PRIORITY': '2026-05-17T08:10:00.000Z',
  'M-FORMAT': null,
  'M-CHECK': null,
  'M-WRITE': null,
  'M-GRATITUDE': null,
};

const ALL_MISSIONS_DONE: Record<MissionId, string> = {
  'M-INTENTION': '2026-05-17T08:00:00.000Z',
  'M-MOOD': '2026-05-17T08:05:00.000Z',
  'M-PRIORITY': '2026-05-17T08:10:00.000Z',
  'M-FORMAT': '2026-05-17T08:15:00.000Z',
  'M-CHECK': '2026-05-17T08:20:00.000Z',
  'M-WRITE': '2026-05-17T08:25:00.000Z',
  'M-GRATITUDE': '2026-05-17T08:30:00.000Z',
};

// 6 of 7 missions done — sticky-note renders with 6 selos + 1 pending.
const SIX_MISSIONS_DONE: Record<MissionId, string | null> = {
  'M-INTENTION': '2026-05-17T08:00:00.000Z',
  'M-MOOD': '2026-05-17T08:05:00.000Z',
  'M-PRIORITY': '2026-05-17T08:10:00.000Z',
  'M-FORMAT': '2026-05-17T08:15:00.000Z',
  'M-CHECK': '2026-05-17T08:20:00.000Z',
  'M-WRITE': '2026-05-17T08:25:00.000Z',
  'M-GRATITUDE': null,
};

// ── Decorator helpers ─────────────────────────────────────────────────────────

function withOnboardingState(stateOverride: OnboardingState): Decorator {
  const decorator: Decorator = function WithState(Story) {
    useEffect(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stateOverride));
      window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
      return () => {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
      };
    }, []);
    return <Story />;
  };
  return decorator;
}

function clearOnboardingState(): Decorator {
  const decorator: Decorator = function ClearState(Story) {
    useEffect(() => {
      localStorage.removeItem(STORAGE_KEY);
      window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
      return () => {
        localStorage.removeItem(STORAGE_KEY);
        window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
      };
    }, []);
    return <Story />;
  };
  return decorator;
}

function withReadonlyVisible(): Decorator {
  const decorator: Decorator = function ReadonlyVisible(Story) {
    setReadonlyVisible(true);
    return <Story />;
  };
  return decorator;
}

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Features/Onboarding/OnboardingQuest',
  component: OnboardingQuest,
  tags: ['autodocs'],
  decorators: [
    function PaperWrapper(Story) {
      return (
        <div
          style={{
            position: 'relative',
            width: '520px',
            minHeight: '480px',
            background: 'var(--color-paper, #fff9f0)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: '4px',
            padding: '2rem',
          }}
        >
          <Story />
        </div>
      );
    },
  ] satisfies Decorator[],
  args: {
    data: null,
    date: TODAY,
    saveStatus: 'saved' as const,
  },
} satisfies Meta<typeof OnboardingQuest>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Story: Pending ───────────────────────────────────────────────────────────

/**
 * Pending — fresh state (no localStorage key).
 *
 * Auto-transitions pending → in_progress on mount; all 7 missions show pending
 * seals (dotted outlines). data=null simulates loading state (AC-013b).
 */
export const Pending: Story = {
  decorators: [clearOnboardingState()],
  args: {
    data: null,
    date: TODAY,
    saveStatus: 'saved',
  },
};

// ── Story: InProgressPartial ──────────────────────────────────────────────────

/**
 * InProgressPartial — 3 missions completed (Intention, Mood, Priority).
 *
 * localStorage pre-seeded with status=in_progress and 3 timestamps.
 * data=null so no further derivation runs; the 3 selos show completed state
 * (filled circle + strikethrough), 4 pending (dotted outlines).
 * Demonstrates AC-013b (loading) + AC-013a (latching from persistence).
 */
export const InProgressPartial: Story = {
  decorators: [
    withOnboardingState({
      schemaVersion: 2,
      status: 'in_progress',
      progressByDate: {
        [TODAY]: PARTIAL_MISSIONS,
      },
      completedAt: null,
      completedOnDate: null,
    }),
  ],
  args: {
    data: null,
    date: TODAY,
    saveStatus: 'saved',
  },
};

// ── Story: CompletedActive ────────────────────────────────────────────────────

/**
 * CompletedActive — pre-completion state: 6 missions done, 1 pending (M-GRATITUDE).
 *
 * status=in_progress so the sticky-note renders with 6 selos + 1 pending seal.
 * This gives a visually meaningful sticky-note state for review — one mission away
 * from the carimbo cerimonial.
 */
export const CompletedActive: Story = {
  decorators: [
    withOnboardingState({
      schemaVersion: 2,
      status: 'in_progress',
      progressByDate: {
        [TODAY]: SIX_MISSIONS_DONE,
      },
      completedAt: null,
      completedOnDate: null,
    }),
  ],
  args: {
    data: null,
    date: TODAY,
    saveStatus: 'saved',
  },
};

// ── Story: CompletedReadonly ─────────────────────────────────────────────────

/**
 * CompletedReadonly — status=completed, sticky re-opened via the ? button.
 *
 * setReadonlyVisible(true) is called in the decorator before mount to simulate
 * the user clicking HelpButton on a completed state. The sticky-note renders in
 * readonly mode with header "Roteiro concluído ✓" and all 7 selos filled (AC-021).
 * Clicking "ocultar roteiro" hides the sticky without mutating persisted state.
 */
export const CompletedReadonly: Story = {
  decorators: [
    withOnboardingState({
      schemaVersion: 2,
      status: 'completed',
      progressByDate: {
        [TODAY]: ALL_MISSIONS_DONE,
      },
      completedAt: '2026-05-17T08:30:00.000Z',
      completedOnDate: TODAY,
    }),
    withReadonlyVisible(),
  ],
  args: {
    data: null,
    date: TODAY,
    saveStatus: 'saved',
  },
};

// ── Story: CompletedDay ───────────────────────────────────────────────────────

/**
 * CompletedDay — 7/7 missions done + CompletedDayDecor skin (washi + golden seal).
 *
 * Pre-seeds localStorage with 7/7 today so both OnboardingQuest (via readonly)
 * and CompletedDayDecor render together, demonstrating the full completed-day skin.
 * The sticky-note is hidden (status=completed, no readonly) so CompletedDayDecor
 * is the visible reward visible on the paper.
 */
export const CompletedDay: Story = {
  decorators: [
    withOnboardingState({
      schemaVersion: 2,
      status: 'completed',
      progressByDate: {
        [TODAY]: ALL_MISSIONS_DONE,
      },
      completedAt: '2026-05-17T08:30:00.000Z',
      completedOnDate: TODAY,
    }),
    function WithDecor(Story) {
      return (
        <>
          <Story />
          <MissionSealSlot date={TODAY} />
        </>
      );
    },
  ] satisfies Decorator[],
  args: {
    data: null,
    date: TODAY,
    saveStatus: 'saved',
  },
};
