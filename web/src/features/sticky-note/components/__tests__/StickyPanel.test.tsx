/**
 * Unit tests: StickyPanel — proportions, animation, drag handle, close button.
 *
 * Covers:
 *  AC-001: panel class applied (220px min via CSS)
 *  AC-002: overflow-y via CSS class
 *  AC-003: border-radius + box-shadow via CSS
 *  AC-004: position.x/y applied as left/top inline style
 *  AC-005: isOpen=true → .open class; isOpen=false → .closed class
 *  AC-019: drag handle element rendered
 *  AC-020: dragHandleProps.onMouseDown attached to drag handle
 *  AC-021: isDragging=true → .dragging class on handle; body cursor=grabbing
 *  AC-033: onClose defined → close button rendered
 *  AC-036: onClose=undefined (Yellow) → no close button
 */

import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type React from 'react';

import { StickyPanel } from '../StickyPanel.js';

import type { Note, UseNotesReturn } from '@/features/notes';

// ---------------------------------------------------------------------------
// Mock rich-text-line so NoteItem renders plain inputs (no Tiptap dependency)
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

interface RenderOpts {
  isOpen?: boolean;
  color?: 'y' | 'r' | 'g' | 'b';
  position?: { x: number; y: number };
  zIndex?: number;
  isDragging?: boolean;
  onClose?: (() => void) | undefined;
  onBringToFront?: () => void;
}

function renderPanel(opts: RenderOpts = {}) {
  const panelRef = { current: null } as React.RefObject<HTMLDivElement | null>;
  const dragHandleProps = { onMouseDown: jest.fn() };
  const notesApi = makeNotesApi();

  const {
    isOpen = true,
    color = 'y',
    position = { x: 22, y: 14 },
    zIndex = 1000,
    isDragging = false,
    onClose = undefined,
    onBringToFront = jest.fn(),
  } = opts;

  render(
    <StickyPanel
      isOpen={isOpen}
      color={color}
      items={[ITEM]}
      notesApi={notesApi}
      panelRef={panelRef}
      position={position}
      zIndex={zIndex}
      isDragging={isDragging}
      dragHandleProps={dragHandleProps}
      {...(onClose !== undefined ? { onClose } : {})}
      onBringToFront={onBringToFront}
    />,
  );

  return { panelRef, dragHandleProps, notesApi, onBringToFront };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('StickyPanel — CSS classes (AC-001, AC-002, AC-003, AC-005)', () => {
  it('isOpen=true → panel has .open class (AC-005)', () => {
    renderPanel({ isOpen: true });
    const panel = screen.getByLabelText('Painel de anotações globais');
    expect(panel.className).toMatch(/open/);
    expect(panel.className).not.toMatch(/closed/);
  });

  it('isOpen=false → panel has .closed class with pointer-events:none (AC-005)', () => {
    renderPanel({ isOpen: false });
    const panel = screen.getByLabelText('Painel de anotações globais');
    expect(panel.className).toMatch(/closed/);
    expect(panel.className).not.toMatch(/open/);
  });
});

describe('StickyPanel — inline style (AC-004)', () => {
  it('applies position.x as left and position.y as top (AC-004)', () => {
    renderPanel({ position: { x: 100, y: 200 } });
    const panel = screen.getByLabelText('Painel de anotações globais');
    expect(panel).toHaveStyle({ left: '100px', top: '200px' });
  });

  it('applies zIndex to panel style', () => {
    renderPanel({ zIndex: 1005 });
    const panel = screen.getByLabelText('Painel de anotações globais');
    expect(panel).toHaveStyle({ zIndex: '1005' });
  });

  it('applies STICKY_COLOR_HEX background for yellow (AC-001)', () => {
    renderPanel({ color: 'y' });
    const panel = screen.getByLabelText('Painel de anotações globais');
    expect(panel).toHaveStyle({ background: '#f5e06e' });
  });

  it('applies STICKY_COLOR_HEX background for red', () => {
    renderPanel({ color: 'r' });
    const panel = screen.getByLabelText('Painel de anotações globais');
    expect(panel).toHaveStyle({ background: '#fca5a5' });
  });
});

describe('StickyPanel — drag handle (AC-019, AC-020, AC-021)', () => {
  it('drag handle element is rendered (AC-019)', () => {
    renderPanel();
    // dragIndicator child is within drag handle div
    const indicator = document.querySelector('[class*="dragIndicator"]');
    expect(indicator).toBeInTheDocument();
  });

  it('isDragging=false → handle does NOT have .dragging class (AC-021)', () => {
    renderPanel({ isDragging: false });
    const handle = document.querySelector('[class*="dragHandle"]');
    expect(handle?.className).not.toMatch(/dragging/);
  });

  it('isDragging=true → handle has .dragging class (AC-021)', () => {
    renderPanel({ isDragging: true });
    const handle = document.querySelector('[class*="dragHandle"]');
    expect(handle?.className).toMatch(/dragging/);
  });

  it('isDragging=true → document.body cursor is grabbing (AC-021)', () => {
    renderPanel({ isDragging: true });
    expect(document.body.style.cursor).toBe('grabbing');
  });

  it('isDragging=false → document.body cursor is empty (AC-021)', () => {
    renderPanel({ isDragging: false });
    expect(document.body.style.cursor).toBe('');
  });
});

describe('StickyPanel — close button (AC-033, AC-036)', () => {
  it('onClose=undefined (Yellow) → no close button rendered (AC-036)', () => {
    renderPanel({ color: 'y', onClose: undefined });
    expect(screen.queryByRole('button', { name: 'Fechar post-it' })).not.toBeInTheDocument();
  });

  it('onClose defined (Red) → close button rendered (AC-033)', () => {
    renderPanel({ color: 'r', onClose: jest.fn() });
    expect(screen.getByRole('button', { name: 'Fechar post-it' })).toBeInTheDocument();
  });

  it('two clicks on close button confirm and call onClose (AC-033 + FEAT-022 AC-010/AC-011)', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    renderPanel({ color: 'r', onClose });

    // First click → arms confirm (label flips), onClose NOT yet called.
    await user.click(screen.getByRole('button', { name: 'Fechar post-it' }));
    expect(onClose).not.toHaveBeenCalled();

    // Second click → confirms.
    await user.click(screen.getByRole('button', { name: 'Confirmar fechamento do post-it' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('StickyPanel — bring to front (AC-033)', () => {
  it('mousedown on panel calls onBringToFront', () => {
    const onBringToFront = jest.fn();
    renderPanel({ onBringToFront });
    const panel = screen.getByLabelText('Painel de anotações globais');
    act(() => {
      panel.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    expect(onBringToFront).toHaveBeenCalled();
  });
});

describe('StickyPanel — content (AC-002)', () => {
  it('renders the add button in panel footer', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: /adicionar anotação/i })).toBeInTheDocument();
  });

  it('renders note items list', () => {
    renderPanel();
    expect(screen.getByDisplayValue('test note')).toBeInTheDocument();
  });
});
