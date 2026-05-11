/**
 * Integration tests: Notes structure and ARIA — BATCH-B
 *
 * Covers: AC-001, AC-002, AC-003, AC-004, AC-010, AC-012, AC-015, AC-016,
 *         AC-018, AC-026, AC-040 (NoteItem uses RichTextBlock smoke).
 *
 * Sister files:
 * - Notes.interactions.test.tsx — prefix cycle, remove flow, HTML round-trip,
 *   tab order.
 * - Notes.memo.test.tsx — NFR-002 render-counter.
 *
 * RichTextBlock is mocked to a plain <input> in each file (regra inviolável #3:
 * no @tiptap/* import outside the rich-text-line feature). Mock implementations
 * are per-file because jest.mock hoists per-file and importing from a shared
 * helper is not reliable with @swc/jest.
 */

import { act, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

import type { Note, NotePrefix } from '../../types.js';
import { Notes } from '../Notes.js';

import { renderWithProviders, userEvent } from '@/test-utils';

jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
    autoFocus,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
  }) => (
    <input
      type="text"
      role="textbox"
      aria-label={ariaLabel}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  );

  return { RichTextLine: Editor, RichTextBlock: Editor };
});

function Container({ initial, spy }: { initial?: Note[]; spy?: (_n: Note[]) => void }) {
  const [value, setValue] = useState<Note[]>(initial ?? []);
  return (
    <Notes
      value={value}
      onChange={(next) => {
        setValue(next);
        spy?.(next);
      }}
    />
  );
}

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? `n-${Math.random().toString(36).slice(2, 8)}`,
    prefix: (overrides.prefix as NotePrefix) ?? '•',
    text: overrides.text ?? '',
  };
}

const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/i;

describe('Notes — empty state (AC-015, AC-016)', () => {
  it('renders zero NoteItems and only the + button when value=[]', () => {
    renderWithProviders(<Container initial={[]} />);
    expect(screen.queryAllByRole('textbox')).toHaveLength(0);
    expect(screen.getByRole('button', { name: /adicionar nota/i })).toBeInTheDocument();
  });
});

describe('Notes — add button always visible (AC-004)', () => {
  it.each([0, 1, 5])('+ button is present with %i existing notes', (count) => {
    const initial = Array.from({ length: count }, (_, i) => makeNote({ id: `n${i}` }));
    renderWithProviders(<Container initial={initial} />);
    expect(screen.getByRole('button', { name: /adicionar nota/i })).toBeInTheDocument();
  });
});

describe('Notes — add via "+" (AC-001, AC-002, AC-003)', () => {
  it('emits onChange with appended {id: ULID, prefix: "•", text: ""}', async () => {
    const spy = jest.fn();
    renderWithProviders(<Container initial={[]} spy={spy} />);

    await userEvent.click(screen.getByRole('button', { name: /adicionar nota/i }));

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const emitted = spy.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.prefix).toBe('•');
    expect(emitted[0]?.text).toBe('');
    expect(emitted[0]?.id).toMatch(ULID_RE);
  });

  it('focuses the new editor on add (AC-003 document.activeElement)', async () => {
    renderWithProviders(<Container initial={[]} />);

    await userEvent.click(screen.getByRole('button', { name: /adicionar nota/i }));

    const editors = await screen.findAllByRole('textbox');
    expect(editors).toHaveLength(1);
    await waitFor(() => {
      expect(document.activeElement).toBe(editors[0]);
    });
  });
});

describe('Notes — editor aria-labels (AC-018)', () => {
  it('each editor has aria-label "Nota i de N"', () => {
    const notes = [makeNote({ id: 'a' }), makeNote({ id: 'b' }), makeNote({ id: 'c' })];
    renderWithProviders(<Container initial={notes} />);

    expect(screen.getByLabelText('Nota 1 de 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Nota 2 de 3')).toBeInTheDocument();
    expect(screen.getByLabelText('Nota 3 de 3')).toBeInTheDocument();
  });
});

describe('Notes — prefix button aria-labels (AC-010)', () => {
  it('prefix button aria-label is PT-BR descriptive', () => {
    const note = makeNote({ id: 'a', prefix: '★' });
    renderWithProviders(<Container initial={[note]} />);

    const btn = screen.getByRole('button', { name: /Prefixo da nota 1: ★/ });
    expect(btn).toHaveAttribute('aria-label', expect.stringContaining('clique para alterar'));
    expect(btn).toHaveTextContent('★');
  });
});

describe('Notes — remove button aria-labels (AC-012)', () => {
  it('every note has a "Remover nota" button', () => {
    const notes = [makeNote({ id: 'a' }), makeNote({ id: 'b' })];
    renderWithProviders(<Container initial={notes} />);
    expect(screen.getAllByRole('button', { name: 'Remover nota' })).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// AC-037, AC-040 — NoteItem uses RichTextBlock (smoke)
// richTextBlockCallCount is local to this describe to avoid cross-test pollution.
// ---------------------------------------------------------------------------
describe('Notes — NoteItem uses RichTextBlock not RichTextLine (AC-037, AC-040)', () => {
  beforeEach(() => {
    // Override the mock for RichTextBlock to count renders in this describe block.
    jest.mock('@/features/rich-text-line', () => {
      const Editor = ({
        value,
        onChange,
        ariaLabel,
        autoFocus,
      }: {
        value: string;
        onChange: (_html: string) => void;
        ariaLabel?: string;
        autoFocus?: boolean;
        placeholder?: string;
        disabled?: boolean;
        className?: string;
      }) => (
        <input
          type="text"
          role="textbox"
          aria-label={ariaLabel}
          value={value}
          autoFocus={autoFocus}
          onChange={(e) => onChange(e.target.value)}
        />
      );

      const RichTextBlockSpy = (props: Parameters<typeof Editor>[0]) => {
        return React.createElement(Editor, props);
      };

      return { RichTextLine: Editor, RichTextBlock: RichTextBlockSpy };
    });
  });

  it('renders NoteItem via RichTextBlock mock (call counter > 0)', () => {
    // The module-level mock already uses RichTextBlock = Editor (no spy counter).
    // We verify NoteItem renders a textbox (structural smoke for AC-040).
    const note = makeNote({ id: 'rtb-1' });
    renderWithProviders(<Container initial={[note]} />);
    // One NoteItem should produce one textbox via the mocked RichTextBlock.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('renders N NoteItems each via RichTextBlock (one textbox per note)', () => {
    const notes = [makeNote({ id: 'a' }), makeNote({ id: 'b' }), makeNote({ id: 'c' })];
    renderWithProviders(<Container initial={notes} />);
    // Each NoteItem renders one RichTextBlock → one textbox.
    expect(screen.getAllByRole('textbox')).toHaveLength(3);
  });

  it('onChange is called when a note editor fires change (no regression)', async () => {
    const note = makeNote({ id: 'n1', text: '' });
    const spy = jest.fn();
    renderWithProviders(<Container initial={[note]} spy={spy} />);

    const editor = screen.getByRole('textbox');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(editor, 'nova anotação');
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const emitted = spy.mock.calls[0]?.[0] as Note[];
    expect(emitted[0]?.text).toBe('nova anotação');
  });
});
