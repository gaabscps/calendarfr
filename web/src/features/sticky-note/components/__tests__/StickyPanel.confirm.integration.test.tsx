/**
 * FEAT-022 T-014 — StickyPanel close button uses ConfirmDeleteButton.
 *
 * Covers:
 *  AC-010: 2-clique no botão de fechar do post-it confirma sem toast.
 *  AC-011: timer expira e/ou clique fora reverte para idle (sem fechar o panel).
 *
 * Garante visualmente que NÃO existe toast / UndoQueue neste caminho.
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import type React from 'react';

import { StickyPanel } from '../StickyPanel.js';

import type { Note, UseNotesReturn } from '@/features/notes';

// ---------------------------------------------------------------------------
// Mock rich-text-line so NoteItem renders plain inputs (no Tiptap dependency).
// ---------------------------------------------------------------------------

jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
  }) => (
    <input
      type="text"
      role="textbox"
      aria-label={ariaLabel}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  return { RichTextLine: Editor, RichTextBlock: Editor };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ITEM: Note = { id: 'note-1', prefix: '•', text: 'test note' };

function makeNotesApi(): UseNotesReturn {
  return {
    onAdd: jest.fn(),
    onRemove: jest.fn(),
    onChangeText: jest.fn(),
    onCyclePrefix: jest.fn(),
    reorder: jest.fn(),
    justAddedIdRef: { current: null } as React.RefObject<string | null>,
  };
}

function renderRedPanel(onClose: () => void) {
  const panelRef = { current: null } as React.RefObject<HTMLDivElement | null>;
  const dragHandleProps = { onMouseDown: jest.fn() };
  const notesApi = makeNotesApi();

  render(
    <StickyPanel
      isOpen
      color="r"
      items={[ITEM]}
      notesApi={notesApi}
      panelRef={panelRef}
      position={{ x: 0, y: 0 }}
      zIndex={1000}
      isDragging={false}
      dragHandleProps={dragHandleProps}
      onClose={onClose}
      onBringToFront={jest.fn()}
    />,
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StickyPanel — close button inline confirm (FEAT-022 AC-010, AC-011)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('AC-010: 2-click on close button confirms and calls onClose exactly once', () => {
    const onClose = jest.fn();
    renderRedPanel(onClose);

    const idleBtn = screen.getByRole('button', { name: 'Fechar post-it' });

    // 1st click → confirming (label/aria flip), onClose NOT yet.
    act(() => {
      fireEvent.click(idleBtn);
    });
    expect(onClose).not.toHaveBeenCalled();

    const confirmingBtn = screen.getByRole('button', { name: 'Confirmar fechamento do post-it' });
    expect(confirmingBtn).toHaveAttribute('aria-pressed', 'true');
    expect(confirmingBtn).toHaveTextContent('Confirmar?');

    // 2nd click → confirms.
    act(() => {
      fireEvent.click(confirmingBtn);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('AC-011: 3s expire reverts to idle without firing onClose', () => {
    const onClose = jest.fn();
    renderRedPanel(onClose);

    const btn = screen.getByRole('button', { name: 'Fechar post-it' });
    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      jest.advanceTimersByTime(3001);
    });

    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('aria-label', 'Fechar post-it');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('AC-011: pointerdown outside cancels and does NOT fire onClose', () => {
    const onClose = jest.fn();
    renderRedPanel(onClose);

    const btn = screen.getByRole('button', { name: 'Fechar post-it' });
    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      fireEvent.pointerDown(document.body);
    });

    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('renders NO toast / undo-queue UI when confirming (sticky path is inline-only)', () => {
    renderRedPanel(jest.fn());

    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Fechar post-it' }));
    });

    // Sticky panel close never enfileira um UndoEntry — nenhum toast role=status
    // ou label "Desfazer" deve aparecer.
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /desfazer/i })).not.toBeInTheDocument();
  });
});
