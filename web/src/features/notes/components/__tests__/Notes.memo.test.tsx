/**
 * Memoization tests for Notes — NFR-002
 *
 * Verifies that editing one note does NOT re-render the other N-1 NoteItems.
 * Uses a per-aria-label render counter inside a local RichTextLine mock.
 * Mirrors FEAT-009 Agenda.integration.test.tsx render-counter pattern.
 *
 * Local mock (instead of _helpers.tsx shared mock) so the render-counter
 * is scoped to this file and doesn't leak counts across other suites.
 */

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Note, NotePrefix } from '../../types.js';
import { Notes } from '../Notes.js';

import { renderWithProviders } from '@/test-utils';

const renderCounts: Record<string, number> = {};

jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
  }) => {
    const key = ariaLabel ?? '';
    renderCounts[key] = (renderCounts[key] ?? 0) + 1;
    return (
      <input
        type="text"
        role="textbox"
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  };
  return { RichTextLine: Editor, RichTextBlock: Editor };
});

beforeEach(() => {
  for (const k of Object.keys(renderCounts)) {
    renderCounts[k] = 0;
  }
});

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? `n-${Math.random().toString(36).slice(2, 8)}`,
    prefix: (overrides.prefix as NotePrefix) ?? '•',
    text: overrides.text ?? '',
  };
}

function Container({ initial }: { initial: Note[] }) {
  const [value, setValue] = useState<Note[]>(initial);
  return <Notes value={value} onChange={setValue} />;
}

describe('Notes — memoization (NFR-002)', () => {
  it('editing one note does NOT re-render the other N-1 NoteItems', async () => {
    const initial = [
      makeNote({ id: 'n1', text: '' }),
      makeNote({ id: 'n2', text: '' }),
      makeNote({ id: 'n3', text: '' }),
    ];
    renderWithProviders(<Container initial={initial} />);

    expect(renderCounts['Nota 1 de 3']).toBe(1);
    expect(renderCounts['Nota 2 de 3']).toBe(1);
    expect(renderCounts['Nota 3 de 3']).toBe(1);

    for (const k of Object.keys(renderCounts)) {
      renderCounts[k] = 0;
    }

    const editor2 = screen.getByLabelText('Nota 2 de 3');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(editor2, 'edited');
      editor2.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await waitFor(() => {
      expect(renderCounts['Nota 2 de 3']).toBeGreaterThanOrEqual(1);
    });

    expect(renderCounts['Nota 1 de 3']).toBe(0);
    expect(renderCounts['Nota 3 de 3']).toBe(0);
  });
});
