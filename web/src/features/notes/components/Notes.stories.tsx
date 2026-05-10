/**
 * Storybook stories for Notes — CSF3 format.
 *
 * Covers: AC-023 (4 stories: Empty, Single, Mixed, Many), AC-024 (build-storybook clean).
 * See spec US-008.
 *
 * Each story uses a controlled wrapper (useState) so the user can interact with
 * add/remove/cycle in real time.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { useState } from 'react';

import type { Note } from '../types.js';

import { Notes } from './Notes.js';

const meta = {
  title: 'Features/Notes',
  component: Notes,
  tags: ['autodocs'],
  args: {
    onChange: () => undefined,
  },
} satisfies Meta<typeof Notes>;

export default meta;

// ── Controlled wrapper ────────────────────────────────────────────────────────

function ControlledNotes({ initial }: { initial: Note[] }) {
  const [value, setValue] = useState<Note[]>(initial);

  return (
    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', minWidth: '600px' }}>
      <div style={{ flex: 1 }}>
        <Notes value={value} onChange={setValue} />
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
}

// ── Story: Empty ──────────────────────────────────────────────────────────────

/**
 * Empty — value=[].
 * Demonstrates the empty state showing only "+ Adicionar nota".
 * No NoteItem rendered (AC-015, AC-016).
 */
export const Empty: StoryObj = {
  render: () => <ControlledNotes initial={[]} />,
};

// ── Story: Single ─────────────────────────────────────────────────────────────

/**
 * Single — one note with default prefix • and some text.
 * Demonstrates baseline rendering: prefix button, editor, remove button.
 */
export const Single: StoryObj = {
  render: () => (
    <ControlledNotes
      initial={[{ id: '01HXYZ0000000000000SNGL001', prefix: '•', text: 'Primeira anotação livre' }]}
    />
  ),
};

// ── Story: Mixed ──────────────────────────────────────────────────────────────

/**
 * Mixed — 5 notes with diverse prefixes (•, →, —, ★) and inline formatting.
 * Demonstrates prefix variety and that HTML passes through unchanged (AC-006).
 */
export const Mixed: StoryObj = {
  render: () => (
    <ControlledNotes
      initial={[
        {
          id: '01HXYZ0000000000000MIXD001',
          prefix: '•',
          text: '<b>Reunião</b> com o cliente às 14h',
        },
        {
          id: '01HXYZ0000000000000MIXD002',
          prefix: '→',
          text: 'Revisar <i>proposta comercial</i> antes do envio',
        },
        {
          id: '01HXYZ0000000000000MIXD003',
          prefix: '—',
          text: 'Pesquisar sobre <u>arquitetura hexagonal</u>',
        },
        {
          id: '01HXYZ0000000000000MIXD004',
          prefix: '★',
          text: '<b>Ideia</b>: migrar autosave para <i>debounce</i> de 500ms',
        },
        {
          id: '01HXYZ0000000000000MIXD005',
          prefix: '•',
          text: 'Lembrar de <s>cancelar</s> reagendar a assinatura',
        },
      ]}
    />
  ),
};

// ── Story: Many ───────────────────────────────────────────────────────────────

/**
 * Many — 10+ notes to verify performance/scroll behavior visually (NFR-001).
 * Demonstrates the list scrolls without layout issues at scale.
 */
export const Many: StoryObj = {
  render: () => (
    <ControlledNotes
      initial={[
        { id: '01HXYZ0000000000000MANY001', prefix: '•', text: 'Nota 1 — ideia inicial' },
        {
          id: '01HXYZ0000000000000MANY002',
          prefix: '→',
          text: 'Nota 2 — próximo passo <b>urgente</b>',
        },
        { id: '01HXYZ0000000000000MANY003', prefix: '—', text: 'Nota 3 — observação do dia' },
        {
          id: '01HXYZ0000000000000MANY004',
          prefix: '★',
          text: 'Nota 4 — destaque da semana',
        },
        {
          id: '01HXYZ0000000000000MANY005',
          prefix: '•',
          text: 'Nota 5 — referência para pesquisa',
        },
        {
          id: '01HXYZ0000000000000MANY006',
          prefix: '→',
          text: 'Nota 6 — tarefa delegada para amanhã',
        },
        {
          id: '01HXYZ0000000000000MANY007',
          prefix: '—',
          text: 'Nota 7 — <i>contexto adicional</i> sobre projeto',
        },
        { id: '01HXYZ0000000000000MANY008', prefix: '★', text: 'Nota 8 — meta do mês' },
        {
          id: '01HXYZ0000000000000MANY009',
          prefix: '•',
          text: 'Nota 9 — follow-up com equipe',
        },
        {
          id: '01HXYZ0000000000000MANY010',
          prefix: '→',
          text: 'Nota 10 — <u>revisar documentação</u> técnica',
        },
        { id: '01HXYZ0000000000000MANY011', prefix: '—', text: 'Nota 11 — anotação livre final' },
      ]}
    />
  ),
};
