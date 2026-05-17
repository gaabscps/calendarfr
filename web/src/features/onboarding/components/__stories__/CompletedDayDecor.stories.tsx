/**
 * Storybook stories for CompletedDayDecor — CSF3 format.
 *
 * Covers SC-002: 1 story `Default` standalone with mock 7/7 state.
 */

import type { Decorator, Meta, StoryObj } from '@storybook/react';
import { useEffect } from 'react';

import { CUSTOM_EVENT_NAME, STORAGE_KEY } from '../../lib/constants.js';
import type { MissionId, OnboardingState } from '../../types.js';
import { CompletedDayDecor } from '../CompletedDayDecor.js';

// ── Fixture data ─────────────────────────────────────────────────────────────

const TODAY = '2026-05-17';

const ALL_MISSIONS_DONE: Record<MissionId, string> = {
  'M-INTENTION': '2026-05-17T08:00:00.000Z',
  'M-MOOD': '2026-05-17T08:05:00.000Z',
  'M-PRIORITY': '2026-05-17T08:10:00.000Z',
  'M-FORMAT': '2026-05-17T08:15:00.000Z',
  'M-CHECK': '2026-05-17T08:20:00.000Z',
  'M-WRITE': '2026-05-17T08:25:00.000Z',
  'M-GRATITUDE': '2026-05-17T08:30:00.000Z',
};

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

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Features/Onboarding/CompletedDayDecor',
  component: CompletedDayDecor,
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
    date: TODAY,
  },
} satisfies Meta<typeof CompletedDayDecor>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Story: Default ────────────────────────────────────────────────────────────

/**
 * Default — day with all 7 missions completed.
 *
 * Pre-seeds localStorage with v2 state: 7/7 missions for today.
 * Renders washi tape (top-left, top-right) + golden seal (bottom-right).
 */
export const Default: Story = {
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
  ],
  args: {
    date: TODAY,
  },
};
