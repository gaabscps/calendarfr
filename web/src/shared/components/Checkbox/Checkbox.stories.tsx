import type { Meta, StoryObj } from '@storybook/react';

import { Checkbox } from './Checkbox';

const meta = {
  title: 'Shared/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {
  args: {
    checked: false,
    onChange: () => undefined,
    'aria-label': 'Item desmarcado',
  },
};

export const Checked: Story = {
  args: {
    checked: true,
    onChange: () => undefined,
    'aria-label': 'Item marcado',
  },
};

export const Disabled: Story = {
  args: {
    checked: false,
    onChange: () => undefined,
    'aria-label': 'Item desabilitado',
    disabled: true,
  },
};

export const DisabledChecked: Story = {
  args: {
    checked: true,
    onChange: () => undefined,
    'aria-label': 'Item desabilitado e marcado',
    disabled: true,
  },
};

/** Focus visual — use Tab to navigate to the checkbox and inspect the focus ring */
export const FocusVisible: Story = {
  args: {
    checked: false,
    onChange: () => undefined,
    'aria-label': 'Foco visível',
  },
  parameters: {
    pseudo: { focusVisible: true },
  },
};

/** Hover state */
export const Hover: Story = {
  args: {
    checked: false,
    onChange: () => undefined,
    'aria-label': 'Estado hover',
  },
  parameters: {
    pseudo: { hover: true },
  },
};

/** Active / pressed */
export const Active: Story = {
  args: {
    checked: false,
    onChange: () => undefined,
    'aria-label': 'Estado ativo',
  },
  parameters: {
    pseudo: { active: true },
  },
};

/** With external label via <label htmlFor> — clicking label text toggles the checkbox */
export const WithExternalLabel: StoryObj = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Checkbox
        id="external-checkbox"
        checked={false}
        onChange={() => undefined}
        aria-labelledby="external-label"
      />
      <label htmlFor="external-checkbox" id="external-label" style={{ cursor: 'pointer' }}>
        Rótulo externo
      </label>
    </div>
  ),
};
