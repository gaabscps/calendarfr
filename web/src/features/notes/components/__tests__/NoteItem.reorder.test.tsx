/**
 * NoteItem reorder tests — T-005 (FEAT-019)
 *
 * Covers: AC-013, AC-018, AC-019, AC-020, AC-022
 *
 * Uses renderWithDnd to provide DndContext + SortableContext so useSortable
 * can resolve without throwing outside a DnD context.
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

describe('NoteItem — drag handle presence (AC-013, AC-022)', () => {
  it('AC-022: renders NO drag handle when canReorder=false', () => {
    const note = makeNote({ id: 'note-1' });
    renderWithDnd(
      <NoteItem
        note={note}
        index={0}
        total={1}
        onChangeText={noop}
        onCyclePrefix={noop}
        onRemove={noop}
        autoFocus={false}
        canReorder={false}
      />,
      ['note-1'],
    );
    expect(screen.queryByRole('button', { name: /Arrastar nota/i })).not.toBeInTheDocument();
  });

  it('AC-013: renders drag handle when canReorder=true', () => {
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
    expect(screen.getByRole('button', { name: /Arrastar nota/i })).toBeInTheDocument();
  });

  it('AC-022: renders NO drag handle when canReorder is not passed (default)', () => {
    const note = makeNote({ id: 'note-1' });
    renderWithDnd(
      <NoteItem
        note={note}
        index={0}
        total={1}
        onChangeText={noop}
        onCyclePrefix={noop}
        onRemove={noop}
        autoFocus={false}
      />,
      ['note-1'],
    );
    expect(screen.queryByRole('button', { name: /Arrastar nota/i })).not.toBeInTheDocument();
  });
});

describe('NoteItem — Alt+↑/↓ keyboard reorder (AC-020)', () => {
  it('Alt+ArrowUp calls onMoveUp with preventDefault', () => {
    const note = makeNote({ id: 'note-2' });
    const onMoveUp = jest.fn();
    const onMoveDown = jest.fn();
    renderWithDnd(
      <NoteItem
        note={note}
        index={1}
        total={2}
        onChangeText={noop}
        onCyclePrefix={noop}
        onRemove={noop}
        autoFocus={false}
        canReorder={true}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />,
      ['note-2'],
    );

    const handle = screen.getByRole('button', { name: /Arrastar nota/i });
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    fireEvent(handle, event);

    expect(onMoveUp).toHaveBeenCalledTimes(1);
    expect(onMoveDown).not.toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('Alt+ArrowDown calls onMoveDown with preventDefault', () => {
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
    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');
    fireEvent(handle, event);

    expect(onMoveDown).toHaveBeenCalledTimes(1);
    expect(onMoveUp).not.toHaveBeenCalled();
    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('Alt+ArrowUp when onMoveUp=undefined is no-op (no error)', () => {
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
    expect(() => {
      fireEvent.keyDown(handle, { key: 'ArrowUp', altKey: true });
    }).not.toThrow();
  });

  it('other keys do NOT call onMoveUp or onMoveDown', () => {
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
    fireEvent.keyDown(handle, { key: 'ArrowUp' }); // no altKey
    fireEvent.keyDown(handle, { key: 'ArrowDown' }); // no altKey
    fireEvent.keyDown(handle, { key: 'Enter', altKey: true }); // different key

    expect(onMoveUp).not.toHaveBeenCalled();
    expect(onMoveDown).not.toHaveBeenCalled();
  });
});
