/**
 * Storybook stories for RichTextLine — CSF3 format.
 *
 * Covers: AC-029, AC-030 (Controlled story shows value in real-time).
 * See spec US-007.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import { RichTextLine } from './components/RichTextLine';

const meta = {
  title: 'Features/RichTextLine',
  component: RichTextLine,
  tags: ['autodocs'],
  args: {
    onChange: () => undefined,
  },
} satisfies Meta<typeof RichTextLine>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Empty editor — no value, no placeholder.
 * Demonstrates the component with no content and no hint text.
 */
export const Empty: Story = {
  args: {
    value: '',
  },
};

/**
 * Empty editor with a placeholder.
 * Demonstrates how the placeholder disappears on first keystroke.
 */
export const WithPlaceholder: Story = {
  args: {
    value: '',
    placeholder: 'O que importa hoje?',
  },
};

/**
 * Prefilled with all 4 allowed marks: <b>, <i>, <u>, <s>.
 * Demonstrates the full set of inline formatting the component supports.
 */
export const Prefilled: Story = {
  args: {
    value: '<b>Revisar</b> <i>contrato</i> <u>final</u> <s>antigo</s>',
  },
};

/**
 * Controlled story — value + setState wired together.
 * Shows a <pre> panel beside the editor that updates in real time as the user
 * types, demonstrating the controlled-component contract (AC-030).
 */
export const Controlled: StoryObj = {
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [value, setValue] = useState('<b>Edite</b> aqui');

    return (
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', minWidth: '500px' }}>
        <div style={{ flex: 1 }}>
          <RichTextLine value={value} onChange={setValue} placeholder="Digite algo…" />
        </div>
        <pre
          style={{
            flex: 1,
            margin: 0,
            padding: '0.5rem',
            background: 'rgba(0,0,0,0.05)',
            borderRadius: '4px',
            fontSize: '0.75rem',
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            minHeight: '2rem',
          }}
        >
          {value}
        </pre>
      </div>
    );
  },
};
