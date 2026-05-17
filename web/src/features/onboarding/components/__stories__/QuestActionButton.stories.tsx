/**
 * Storybook stories for QuestActionButton — CSF3 format.
 *
 * Covers SC-002: 1 story `Default` interactive with onClick action.
 */

import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';

import { QuestActionButton } from '../QuestActionButton.js';

// ── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Features/Onboarding/QuestActionButton',
  component: QuestActionButton,
  tags: ['autodocs'],
  args: {
    missionId: 'M-INTENTION',
    missionLabel: 'Defina a intenção do dia',
    onClick: action('clicked'),
  },
} satisfies Meta<typeof QuestActionButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// ── Story: Default ────────────────────────────────────────────────────────────

/**
 * Default — interactive button with action logger.
 *
 * Click the arrow icon to see the 'clicked' action in the Storybook actions panel.
 */
export const Default: Story = {};
