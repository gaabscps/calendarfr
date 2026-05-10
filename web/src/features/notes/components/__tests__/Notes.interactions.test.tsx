/**
 * Integration tests: Notes interactions — BATCH-B
 *
 * Covers: AC-006, AC-008, AC-009, AC-011, AC-013, AC-014, AC-017.
 *
 * Sister files: Notes.integration.test.tsx (structure/ARIA), Notes.memo.test.tsx
 * (NFR-002 render-counter). RichTextLine mocked to <input> per file (regra
 * inviolável #3 + jest.mock per-file hoisting).
 */

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Note, NotePrefix } from '../../types.js';
import { Notes } from '../Notes.js';

import { renderWithProviders, userEvent } from '@/test-utils';

jest.mock('@/features/rich-text-line', () => ({
  RichTextLine: ({
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
  ),
}));

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

describe('Notes — prefix cycle (AC-008, AC-009)', () => {
  it.each<[NotePrefix, NotePrefix]>([
    ['•', '→'],
    ['→', '—'],
    ['—', '★'],
    ['★', '•'],
  ])('clicking prefix %s advances to %s, preserving id+text', async (start, expected) => {
    const note = makeNote({ id: 'n1', prefix: start, text: 'hello' });
    const spy = jest.fn();
    renderWithProviders(<Container initial={[note]} spy={spy} />);

    await userEvent.click(
      screen.getByRole('button', { name: new RegExp(`Prefixo da nota 1: \\${start}`) }),
    );

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const emitted = spy.mock.calls[0]?.[0] as Note[];
    expect(emitted[0]?.prefix).toBe(expected);
    expect(emitted[0]?.id).toBe('n1');
    expect(emitted[0]?.text).toBe('hello');
  });
});

describe('Notes — remove via × (AC-011, AC-013, AC-014)', () => {
  it('clicking × removes that note; survivors preserved by reference', async () => {
    const n1 = makeNote({ id: 'n1', text: 'a' });
    const n2 = makeNote({ id: 'n2', prefix: '→', text: 'b' });
    const n3 = makeNote({ id: 'n3', text: 'c' });
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1, n2, n3]} spy={spy} />);

    const removeButtons = screen.getAllByRole('button', { name: 'Remover nota' });
    await userEvent.click(removeButtons[1] as HTMLElement);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const emitted = spy.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(2);
    expect(emitted.map((n) => n.id)).toEqual(['n1', 'n3']);
  });

  it('AC-013: removing the focused note does not throw and detaches activeElement', async () => {
    const n1 = makeNote({ id: 'n1' });
    const n2 = makeNote({ id: 'n2' });
    renderWithProviders(<Container initial={[n1, n2]} />);

    const editor1 = screen.getAllByRole('textbox')[0] as HTMLElement;
    act(() => {
      editor1.focus();
    });
    expect(document.activeElement).toBe(editor1);

    const removeButtons = screen.getAllByRole('button', { name: 'Remover nota' });
    await userEvent.click(removeButtons[0] as HTMLElement);

    await waitFor(() => {
      expect(document.activeElement).not.toBe(editor1);
    });
  });

  it('AC-014: clicking × does NOT open a confirmation dialog', async () => {
    const note = makeNote({ id: 'n1' });
    renderWithProviders(<Container initial={[note]} />);

    await userEvent.click(screen.getByRole('button', { name: 'Remover nota' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});

describe('Notes — HTML round-trip (AC-006)', () => {
  it('text changes propagate verbatim through onChange', async () => {
    const note = makeNote({ id: 'n1', text: '' });
    const spy = jest.fn();
    renderWithProviders(<Container initial={[note]} spy={spy} />);

    const editor = screen.getByRole('textbox');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(editor, '<b>important</b> note');
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const emitted = spy.mock.calls[0]?.[0] as Note[];
    expect(emitted[0]?.text).toBe('<b>important</b> note');
    expect(emitted[0]?.id).toBe('n1');
    expect(emitted[0]?.prefix).toBe('•');
  });
});

describe('Notes — tab order (AC-017)', () => {
  it('Tab cycles prefix → editor → remove → ... → +', async () => {
    const notes = [makeNote({ id: 'a', prefix: '•' }), makeNote({ id: 'b', prefix: '→' })];
    renderWithProviders(<Container initial={notes} />);

    const sequence: string[] = [];
    for (let i = 0; i < 7; i++) {
      await userEvent.tab();
      sequence.push(document.activeElement?.getAttribute('aria-label') ?? '');
    }

    expect(sequence[0]).toMatch(/Prefixo da nota 1/);
    expect(sequence[1]).toBe('Nota 1 de 2');
    expect(sequence[2]).toBe('Remover nota');
    expect(sequence[3]).toMatch(/Prefixo da nota 2/);
    expect(sequence[4]).toBe('Nota 2 de 2');
    expect(sequence[5]).toBe('Remover nota');
    expect(sequence[6]).toMatch(/Adicionar nota/i);
  });
});
