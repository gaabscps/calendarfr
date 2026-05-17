import { action } from '@storybook/addon-actions';
import type { Meta, StoryObj } from '@storybook/react';

import { HelpButton } from '../HelpButton.js';

const meta = {
  title: 'Features/Onboarding/HelpButton',
  component: HelpButton,
  tags: ['autodocs'],
  args: {
    onClick: action('clicked'),
  },
} satisfies Meta<typeof HelpButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Default — the "?" help button as it appears in PageNavigator (AC-019).
 * Click triggers the action logged in the Actions panel.
 */
export const Default: Story = {};
