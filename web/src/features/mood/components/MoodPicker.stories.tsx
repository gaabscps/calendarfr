/**
 * Storybook stories for MoodPicker — CSF3 format.
 *
 * Covers: AC-017 (4 stories: Empty, Selected, Controlled, InvalidValue),
 *         AC-018 (build-storybook clean).
 * See spec US-005.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { MOOD_OPTIONS } from '../lib/moodOptions.js';
import type { MoodPickerValue } from '../types.js';

import { MoodPicker } from './MoodPicker.js';

const meta = {
  title: 'Features/Mood',
  component: MoodPicker,
  tags: ['autodocs'],
  args: {
    onChange: () => undefined,
  },
} satisfies Meta<typeof MoodPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty — value is null, no chip selected.
 * Demonstrates the prompt "Como você está hoje?" with all 6 chips visible
 * and none highlighted — the legitimate "not yet chosen" state (AC-005).
 */
export const Empty: Story = {
  args: {
    value: null,
  },
};

/**
 * Selected — chip 2 ("tranquilo") is pre-selected.
 * Demonstrates background-color highlight on the active chip (AC-004) and
 * that the remaining 5 chips stay with neutral background.
 */
export const Selected: Story = {
  args: {
    // MOOD_OPTIONS[1] = { emoji: '🙂', label: 'tranquilo', color: '#a3c4a8' }
    value: MOOD_OPTIONS[1],
  },
};

/**
 * Controlled — interactive story wired with useState.
 * Click any chip to select it; click the selected chip again to deselect
 * (toggle back to null). The current value is displayed in the panel on the
 * right, updating in real time. Demonstrates the controlled-component
 * contract (AC-001, AC-002) and radio-group keyboard navigation.
 */
export const Controlled: StoryObj = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState<MoodPickerValue>(null);

    return (
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', minWidth: '480px' }}>
        <div style={{ flex: 1 }}>
          <MoodPicker value={value} onChange={setValue} />
        </div>
        <pre
          style={{
            flex: 1,
            margin: 0,
            padding: '0.75rem',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
            fontSize: '0.72rem',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            minHeight: '4rem',
          }}
        >
          {JSON.stringify(value, null, 2) ?? 'null'}
        </pre>
      </div>
    );
  },
};

/**
 * InvalidValue — value contains a mood object that is not in the curated list.
 * Demonstrates the fallback behaviour from AC-007: no chip is highlighted,
 * the component renders as if value === null, and a console.warn is emitted
 * (inspect the browser console to see the warning message).
 */
export const InvalidValue: Story = {
  args: {
    value: { emoji: '🤔', label: 'pensativo', color: '#777777' },
  },
};
