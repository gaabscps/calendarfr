/**
 * Storybook stories for Priorities — CSF3 format.
 *
 * Covers: AC-021, AC-022 (Controlled story shows value in real-time).
 * See spec US-006.
 */

import type { Priority } from '@calendarfr/shared';
import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { UndoQueueProvider } from '@/features/undo-delete';

import { EMPTY_PRIORITY } from '../types.js';

import { Priorities } from './Priorities.js';

const meta = {
  title: 'Features/Priorities',
  component: Priorities,
  tags: ['autodocs'],
  args: {
    onChange: () => undefined,
  },
  decorators: [
    (Story) => (
      <UndoQueueProvider>
        <Story />
      </UndoQueueProvider>
    ),
  ],
} satisfies Meta<typeof Priorities>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Empty initial state — single empty slot. */
const emptyPriorities: Priority[] = [{ ...EMPTY_PRIORITY }];

/**
 * Empty — empty initial state.
 * Demonstrates placeholder text per slot and no visual "done" state.
 */
export const Empty: Story = {
  args: {
    value: emptyPriorities,
  },
};

/**
 * Partial — slot 0 has content; slots 1 and 2 remain empty.
 * Demonstrates partial fill: the checkboxes and placeholder still show for
 * the unused slots.
 */
export const Partial: Story = {
  args: {
    value: [
      { id: '01HXYZ0000000000000PARTIAL1', text: 'Revisar contrato', done: false },
      { ...EMPTY_PRIORITY },
      { ...EMPTY_PRIORITY },
    ] satisfies Priority[],
  },
};

/**
 * AllDone — all 3 slots filled and marked done, with inline formatting.
 * Demonstrates strikethrough CSS applied to each slot (AC-006) and that the
 * raw HTML (bold/italic/strike tags) passes through unchanged.
 */
export const AllDone: Story = {
  args: {
    value: [
      { id: '01HXYZ0000000000000ALLDONE1', text: '<b>Bold</b> task', done: true },
      { id: '01HXYZ0000000000000ALLDONE2', text: '<i>Italic</i> task', done: true },
      { id: '01HXYZ0000000000000ALLDONE3', text: '<s>Strike</s> task', done: true },
    ] satisfies Priority[],
  },
};

/**
 * Controlled — value + setState wired together.
 * Shows the current Priority[] in a <pre> panel next to the component,
 * updating in real time as the user types or toggles checkboxes.
 * Demonstrates the controlled-component contract (AC-022).
 */
export const Controlled: StoryObj = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState<Priority[]>([
      { id: '01HXYZ0000000000000CTRL0001', text: 'Primeira prioridade', done: false },
      { id: '01HXYZ0000000000000CTRL0002', text: '<b>Segunda</b> prioridade', done: true },
      { ...EMPTY_PRIORITY },
    ]);

    return (
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', minWidth: '640px' }}>
        <div style={{ flex: 1 }}>
          <Priorities value={value} onChange={setValue} />
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
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  },
};
