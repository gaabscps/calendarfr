/**
 * Storybook stories for Agenda — CSF3 format.
 *
 * Covers: AC-023, AC-024, AC-025 (build-storybook), AC-028 (coverage gate).
 * See spec US-006.
 *
 * Story `WithCurrentHour` uses the `now` prop (internal testability escape
 * hatch defined in AgendaProps) to deterministically pin the highlighted slot
 * to hour=14 (2026-05-10T14:30:00). This matches AC-024: deterministic
 * highlight without runtime clock dependency.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { EMPTY_AGENDA } from '../types.js';
import type { AgendaSlots } from '../types.js';

import { Agenda } from './Agenda.js';

const meta = {
  title: 'Features/Agenda',
  component: Agenda,
  tags: ['autodocs'],
  args: {
    onChange: () => undefined,
  },
} satisfies Meta<typeof Agenda>;

export default meta;
type Story = StoryObj<typeof meta>;

// ---------------------------------------------------------------------------
// Fixture data
// ---------------------------------------------------------------------------

/**
 * Empty — all 18 slots with text: "".
 * Used directly from the canonical constant.
 */
const emptySlots: AgendaSlots = EMPTY_AGENDA;

/**
 * Typical day — hours 8, 9, 12, 15, 18 filled with realistic content.
 * Includes bold/italic inline markup to demonstrate RichTextLine delegation.
 */
const typicalSlots: AgendaSlots = [
  { hour: 6, text: '' },
  { hour: 7, text: '' },
  { hour: 8, text: '<b>standup</b>' },
  { hour: 9, text: 'reunião de planejamento' },
  { hour: 10, text: '' },
  { hour: 11, text: '' },
  { hour: 12, text: 'almoço com cliente' },
  { hour: 13, text: '' },
  { hour: 14, text: '' },
  { hour: 15, text: '<i>foco</i> Q1' },
  { hour: 16, text: '' },
  { hour: 17, text: '' },
  { hour: 18, text: 'revisão de código' },
  { hour: 19, text: '' },
  { hour: 20, text: '' },
  { hour: 21, text: '' },
  { hour: 22, text: '' },
  { hour: 23, text: '' },
] as unknown as AgendaSlots;

/**
 * Full day — all 18 slots filled with sample content.
 */
const fullSlots: AgendaSlots = [
  { hour: 6, text: 'meditação' },
  { hour: 7, text: 'exercício' },
  { hour: 8, text: '<b>standup</b>' },
  { hour: 9, text: 'planejamento do dia' },
  { hour: 10, text: 'desenvolvimento — feature A' },
  { hour: 11, text: 'code review' },
  { hour: 12, text: 'almoço' },
  { hour: 13, text: 'e-mails e slack' },
  { hour: 14, text: '<i>foco</i> — feature B' },
  { hour: 15, text: 'reunião de status' },
  { hour: 16, text: 'documentação' },
  { hour: 17, text: 'testes e QA' },
  { hour: 18, text: 'encerramento do dia' },
  { hour: 19, text: 'leitura técnica' },
  { hour: 20, text: 'jantar' },
  { hour: 21, text: 'projetos pessoais' },
  { hour: 22, text: 'revisão do amanhã' },
  { hour: 23, text: 'descanso' },
] as unknown as AgendaSlots;

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

/**
 * Empty — all 18 slots are unused.
 * Demonstrates the default state when a new day is opened.
 */
export const Empty: Story = {
  args: {
    value: emptySlots,
  },
};

/**
 * Typical — a representative workday: 5 slots filled (hours 8, 9, 12, 15, 18)
 * with realistic content and inline formatting (bold / italic).
 * The remaining 13 slots are empty.
 */
export const Typical: Story = {
  args: {
    value: typicalSlots,
  },
};

/**
 * Full — all 18 slots filled with sample content.
 * Demonstrates a completely planned day from 06h to 23h.
 */
export const Full: Story = {
  args: {
    value: fullSlots,
  },
};

/**
 * WithCurrentHour — pins `now` to 2026-05-10T14:30:00 so that slot hour=14
 * is deterministically highlighted regardless of the actual system clock.
 *
 * The `now` prop is an `@internal` testability escape hatch on `AgendaProps`
 * (not part of the public barrel API). Using it here avoids runtime Date mocks
 * in Storybook decorators, making the story self-contained and reproducible.
 *
 * AC-024: deterministic highlight via prop injection.
 */
export const WithCurrentHour: Story = {
  args: {
    value: typicalSlots,
    now: new Date('2026-05-10T14:30:00'),
  },
  parameters: {
    docs: {
      description: {
        story:
          'Pins the current-hour indicator to hour 14 via `now={new Date("2026-05-10T14:30:00")}`. ' +
          'The slot for 14h receives `data-current-hour="true"` and the subtle accent highlight. ' +
          'In production the `now` prop is omitted and defaults to `new Date()` at render time.',
      },
    },
  },
};

/**
 * Controlled — value + setState wired together.
 * Shows the current AgendaSlots array in a <pre> panel updating in real time
 * as the user types, demonstrating the controlled-component contract (AC-001).
 */
export const Controlled: StoryObj = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState<AgendaSlots>(typicalSlots);

    return (
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <Agenda value={value} onChange={setValue} />
        </div>
        <pre
          style={{
            width: '220px',
            flexShrink: 0,
            margin: 0,
            padding: '0.75rem',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
            fontSize: '0.65rem',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            maxHeight: '600px',
            overflowY: 'auto',
          }}
        >
          {JSON.stringify(value, null, 2)}
        </pre>
      </div>
    );
  },
};
