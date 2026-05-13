/**
 * NoteItem accessibility tests — T-009 (FEAT-019)
 *
 * Covers: AC-018 (dnd delegation), AC-025 (aria-roledescription via dnd-kit attributes).
 *
 * Uses renderWithDnd to provide DndContext + SortableContext.
 */

import { screen, fireEvent } from '@testing-library/react';
import React from 'react';

import type { Note } from '../../types.js';
import { NoteItem } from '../NoteItem.js';

import { renderWithDnd } from '@/test-utils/renderWithDnd';

jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    ariaLabel,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
  }) => <input type="text" role="textbox" aria-label={ariaLabel} defaultValue={value} readOnly />;
  return { RichTextLine: Editor, RichTextBlock: Editor };
});

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? 'note-1',
    prefix: overrides.prefix ?? '•',
    text: overrides.text ?? '',
  };
}

const noop = () => {};

describe('NoteItem — drag handle delegates non-Alt keys to dnd-kit (AC-018)', () => {
  it('non-Alt keys (Space/Enter/Escape) do not call onMoveUp/onMoveDown and do not throw', () => {
    const note = makeNote({ id: 'note-1' });
    const onMoveUp = jest.fn();
    const onMoveDown = jest.fn();

    renderWithDnd(
      <NoteItem
        note={note}
        index={0}
        total={2}
        onChangeText={noop}
        onCyclePrefix={noop}
        onRemove={noop}
        autoFocus={false}
        canReorder={true}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
      ['note-1'],
    );

    const handle = screen.getByRole('button', { name: /Arrastar nota/i });
    expect(() => fireEvent.keyDown(handle, { key: ' ' })).not.toThrow();
    expect(() => fireEvent.keyDown(handle, { key: 'Enter' })).not.toThrow();
    expect(() => fireEvent.keyDown(handle, { key: 'Escape' })).not.toThrow();

    expect(onMoveUp).not.toHaveBeenCalled();
    expect(onMoveDown).not.toHaveBeenCalled();
  });
});

describe('NoteItem — aria-roledescription on drag handle (AC-025)', () => {
  it('drag handle button has aria-roledescription attribute when canReorder=true', () => {
    // AC-025: KeyboardSensor is active; @dnd-kit spreads aria-roledescription
    // via useSortable { attributes } onto the drag handle button (value: "sortable").
    // The exact value is controlled by @dnd-kit/sortable internals.
    const note = makeNote({ id: 'note-1' });
    renderWithDnd(
      <NoteItem
        note={note}
        index={0}
        total={2}
        onChangeText={noop}
        onCyclePrefix={noop}
        onRemove={noop}
        autoFocus={false}
        canReorder={true}
      />,
      ['note-1'],
    );

    const handle = screen.getByRole('button', { name: /Arrastar nota/i });
    // AC-025: roleDescription overridden to PT-BR 'reordenável' via useSortable attributes.
    expect(handle).toHaveAttribute('aria-roledescription', 'reordenável');
  });

  it('drag handle has aria-label "Arrastar nota N" for screen reader identification (AC-019)', () => {
    const note = makeNote({ id: 'note-1' });
    renderWithDnd(
      <NoteItem
        note={note}
        index={0}
        total={2}
        onChangeText={noop}
        onCyclePrefix={noop}
        onRemove={noop}
        autoFocus={false}
        canReorder={true}
      />,
      ['note-1'],
    );

    expect(screen.getByRole('button', { name: 'Arrastar nota 1' })).toBeInTheDocument();
  });
});
