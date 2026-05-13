/**
 * Notes tab-order tests — split from Notes.interactions.test.tsx (NFR-006 250-line limit)
 *
 * Covers: AC-017 (tab order: drag-handle → prefix → editor → remove → +)
 */

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

import { useState } from 'react';

import type { Note, NotePrefix } from '../../types.js';
import { Notes } from '../Notes.js';

import { renderWithProviders, userEvent } from '@/test-utils';

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? `n-${Math.random().toString(36).slice(2, 8)}`,
    prefix: (overrides.prefix as NotePrefix) ?? '•',
    text: overrides.text ?? '',
  };
}

function Container({ initial }: { initial?: Note[] }) {
  const [value, setValue] = useState<Note[]>(initial ?? []);
  return <Notes value={value} onChange={setValue} />;
}

describe('Notes — tab order (AC-017)', () => {
  it('Tab cycles drag-handle → prefix → editor → remove → ... → + (canReorder=true, 2+ notes)', async () => {
    const notes = [makeNote({ id: 'a', prefix: '•' }), makeNote({ id: 'b', prefix: '→' })];
    renderWithProviders(<Container initial={notes} />);

    const sequence: string[] = [];
    for (let i = 0; i < 9; i++) {
      await userEvent.tab();
      sequence.push(document.activeElement?.getAttribute('aria-label') ?? '');
    }

    expect(sequence[0]).toMatch(/Arrastar nota 1/);
    expect(sequence[1]).toMatch(/Prefixo da nota 1/);
    expect(sequence[2]).toBe('Nota 1 de 2');
    expect(sequence[3]).toBe('Remover nota');
    expect(sequence[4]).toMatch(/Arrastar nota 2/);
    expect(sequence[5]).toMatch(/Prefixo da nota 2/);
    expect(sequence[6]).toBe('Nota 2 de 2');
    expect(sequence[7]).toBe('Remover nota');
    expect(sequence[8]).toMatch(/Adicionar nota/i);
  });

  it('Tab cycles prefix → editor → remove → + when canReorder=false (single note)', async () => {
    const notes = [makeNote({ id: 'a', prefix: '•' })];
    renderWithProviders(<Container initial={notes} />);

    const sequence: string[] = [];
    for (let i = 0; i < 4; i++) {
      await userEvent.tab();
      sequence.push(document.activeElement?.getAttribute('aria-label') ?? '');
    }

    expect(sequence[0]).toMatch(/Prefixo da nota 1/);
    expect(sequence[1]).toBe('Nota 1 de 1');
    expect(sequence[2]).toBe('Remover nota');
    expect(sequence[3]).toMatch(/Adicionar nota/i);
  });
});
