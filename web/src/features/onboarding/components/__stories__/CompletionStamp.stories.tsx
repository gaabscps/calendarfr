import type { Meta, StoryObj } from '@storybook/react';

import { CompletionStamp } from '../CompletionStamp.js';

const STORY_DATE = '2026-05-17';

const meta = {
  title: 'Features/Onboarding/CompletionStamp',
  component: CompletionStamp,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div
        style={{
          position: 'relative',
          width: '480px',
          height: '320px',
          background: 'var(--color-paper, #fff9f0)',
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: '4px',
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    completedOnDate: STORY_DATE,
    currentDate: STORY_DATE,
  },
} satisfies Meta<typeof CompletionStamp>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default — carimbo cerimonial "PLANNER INICIADO ✓" standalone.
 * Animates in with 3-phase choreography: shadow → seal → tagline (AC-017).
 * The parent div simulates the PaperSheet positioning context.
 */
export const Default: Story = {};
