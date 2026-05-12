import type { Meta, StoryObj } from '@storybook/react';

import { Button } from './Button';

const meta = {
  title: 'Shared/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'danger'],
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

// --- Default (secondary/md) ---

export const Default: Story = {
  args: {
    children: 'Botão',
  },
};

// --- Variants (default state) ---

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
  },
};

export const Ghost: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
  },
};

export const Danger: Story = {
  args: {
    variant: 'danger',
    children: 'Danger',
  },
};

// --- Disabled state for all variants ---

export const PrimaryDisabled: Story = {
  args: {
    variant: 'primary',
    children: 'Primary',
    disabled: true,
  },
};

export const SecondaryDisabled: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary',
    disabled: true,
  },
};

export const GhostDisabled: Story = {
  args: {
    variant: 'ghost',
    children: 'Ghost',
    disabled: true,
  },
};

export const DangerDisabled: Story = {
  args: {
    variant: 'danger',
    children: 'Danger',
    disabled: true,
  },
};

// --- Sizes ---

export const SizeSm: Story = {
  args: {
    size: 'sm',
    children: 'Small',
  },
};

export const SizeMd: Story = {
  args: {
    size: 'md',
    children: 'Medium',
  },
};

export const SizeLg: Story = {
  args: {
    size: 'lg',
    children: 'Large',
  },
};

// --- All variants × all sizes matrix ---
// Hover/active/focus states: interact directly in Storybook (covered by AllVariants).

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-base)' }}>
      {(['primary', 'secondary', 'ghost', 'danger'] as const).map((variant) => (
        <div
          key={variant}
          style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}
        >
          {(['sm', 'md', 'lg'] as const).map((size) => (
            <Button key={size} variant={variant} size={size}>
              {variant} / {size}
            </Button>
          ))}
          <Button variant={variant} disabled>
            {variant} / disabled
          </Button>
        </div>
      ))}
    </div>
  ),
};
