import type { Meta, StoryObj } from '@storybook/react';

import { IconButton } from './IconButton';

const meta = {
  title: 'Shared/IconButton',
  component: IconButton,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
  args: {
    children: '×',
    'aria-label': 'icon button',
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

// ----- Ghost variant -----

export const GhostSm: Story = {
  name: 'Ghost / sm (32px hit area)',
  args: {
    variant: 'ghost',
    size: 'sm',
    'aria-label': 'close',
    children: '×',
  },
};

export const GhostMd: Story = {
  name: 'Ghost / md',
  args: {
    variant: 'ghost',
    size: 'md',
    'aria-label': 'move',
    children: '↓',
  },
};

export const GhostLg: Story = {
  name: 'Ghost / lg',
  args: {
    variant: 'ghost',
    size: 'lg',
    'aria-label': 'expand',
    children: '⤢',
  },
};

// ----- Danger variant -----

export const DangerSm: Story = {
  name: 'Danger / sm',
  args: {
    variant: 'danger',
    size: 'sm',
    'aria-label': 'delete item',
    children: '🗑',
  },
};

export const DangerMd: Story = {
  name: 'Danger / md',
  args: {
    variant: 'danger',
    size: 'md',
    'aria-label': 'remove',
    children: '🗑',
  },
};

export const DangerLg: Story = {
  name: 'Danger / lg',
  args: {
    variant: 'danger',
    size: 'lg',
    'aria-label': 'delete all',
    children: '🗑',
  },
};

// ----- States -----

export const Disabled: Story = {
  name: 'Disabled state (ghost)',
  args: {
    variant: 'ghost',
    size: 'sm',
    'aria-label': 'disabled action',
    children: '×',
    disabled: true,
  },
};

export const DangerDisabled: Story = {
  name: 'Disabled state (danger)',
  args: {
    variant: 'danger',
    size: 'sm',
    'aria-label': 'disabled delete',
    children: '🗑',
    disabled: true,
  },
};

// Hover and focus-visible are pseudo-class states; document them via parameters
export const HoverPreview: Story = {
  name: 'Ghost — hover (pseudo-class preview)',
  args: {
    variant: 'ghost',
    size: 'sm',
    'aria-label': 'hover preview',
    children: '×',
  },
  parameters: {
    pseudo: { hover: true },
  },
};

export const FocusPreview: Story = {
  name: 'Ghost — focus-visible (pseudo-class preview)',
  args: {
    variant: 'ghost',
    size: 'sm',
    'aria-label': 'focus preview',
    children: '×',
  },
  parameters: {
    pseudo: { focusVisible: true },
  },
};

export const ActivePreview: Story = {
  name: 'Ghost — active (pseudo-class preview)',
  args: {
    variant: 'ghost',
    size: 'sm',
    'aria-label': 'active preview',
    children: '×',
  },
  parameters: {
    pseudo: { active: true },
  },
};

export const DangerFocusPreview: Story = {
  name: 'Danger — focus-visible (pseudo-class preview)',
  args: {
    variant: 'danger',
    size: 'sm',
    'aria-label': 'danger focus preview',
    children: '🗑',
  },
  parameters: {
    pseudo: { focusVisible: true },
  },
};
