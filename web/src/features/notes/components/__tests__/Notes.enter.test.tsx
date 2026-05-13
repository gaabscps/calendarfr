/**
 * Notes.enter.test.tsx — FEAT-018 keyboard UX: ENTER creates new note.
 *
 * Covers: AC-006 (ENTER calls onChange with +1 note),
 *         AC-007 (new note receives autoFocus via justAddedIdRef mechanism).
 *
 * Self-contained mock for @/features/rich-text-line that wires onEnter
 * to the Enter keydown event. This file stays under 250 lines (CLAUDE.md rule).
 */

import { act, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';

import type { Note, NotePrefix } from '../../types.js';
import { Notes } from '../Notes.js';

import { renderWithProviders } from '@/test-utils';

// ---------------------------------------------------------------------------
// Mock: RichTextLine / RichTextBlock → plain <input> with onEnter wiring.
// jest.mock is hoisted per-file, so this is isolated from other test files.
// ---------------------------------------------------------------------------
jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
    autoFocus,
    onEnter,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onEnter?: () => void;
  }) => (
    <input
      type="text"
      role="textbox"
      aria-label={ariaLabel}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) onEnter?.();
      }}
    />
  );

  return { RichTextLine: Editor, RichTextBlock: Editor };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// AC-006 — ENTER calls onChange with one more note
// ---------------------------------------------------------------------------
describe('FEAT-018 — AC-006: ENTER adds a new note', () => {
  it('pressing ENTER in a note editor triggers onChange with notes.length + 1', async () => {
    const spy = jest.fn();
    const initial = [makeNote({ id: 'n1' })];
    renderWithProviders(<Container initial={initial} spy={spy} />);

    const editor = screen.getByRole('textbox');
    await act(async () => {
      editor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true }),
      );
    });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const emitted = spy.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(2);
  });

  it('SHIFT+ENTER does NOT create a new note (no spurious add)', async () => {
    const spy = jest.fn();
    const initial = [makeNote({ id: 'n1' })];
    renderWithProviders(<Container initial={initial} spy={spy} />);

    const editor = screen.getByRole('textbox');
    await act(async () => {
      editor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true }),
      );
    });

    // onChange must not be called for SHIFT+ENTER
    expect(spy).not.toHaveBeenCalled();
  });

  it('pressing ENTER when list has multiple notes still appends exactly one note', async () => {
    const spy = jest.fn();
    const initial = [makeNote({ id: 'n1' }), makeNote({ id: 'n2' }), makeNote({ id: 'n3' })];
    renderWithProviders(<Container initial={initial} spy={spy} />);

    const editors = screen.getAllByRole('textbox');
    // Press Enter in the second note
    await act(async () => {
      editors[1]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true }),
      );
    });

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const emitted = spy.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// AC-007 — after ENTER the new note receives autoFocus (justAddedIdRef)
// ---------------------------------------------------------------------------
describe('FEAT-018 — AC-007: new note receives autoFocus after ENTER', () => {
  it('the newly-added note editor becomes document.activeElement', async () => {
    const initial = [makeNote({ id: 'n1' })];
    renderWithProviders(<Container initial={initial} />);

    const editor = screen.getByRole('textbox');
    await act(async () => {
      editor.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true }),
      );
    });

    const editors = await screen.findAllByRole('textbox');
    expect(editors).toHaveLength(2);

    // The new note is appended at the end; autoFocus=true mounts it as focused
    await waitFor(() => {
      expect(document.activeElement).toBe(editors[1]);
    });
  });

  it('autoFocus goes to the last-appended note even when list grows from 2 to 3', async () => {
    const initial = [makeNote({ id: 'n1' }), makeNote({ id: 'n2' })];
    renderWithProviders(<Container initial={initial} />);

    const editors = screen.getAllByRole('textbox');
    // Press Enter in the first note
    await act(async () => {
      editors[0]!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', shiftKey: false, bubbles: true }),
      );
    });

    const updatedEditors = await screen.findAllByRole('textbox');
    expect(updatedEditors).toHaveLength(3);

    await waitFor(() => {
      expect(document.activeElement).toBe(updatedEditors[2]);
    });
  });
});
