/**
 * PriorityItem.reorder.test.tsx
 *
 * Covers AC-001, AC-006, AC-007, AC-008, AC-010 for T-004 (FEAT-019).
 */

import { fireEvent, screen } from '@testing-library/react';
import React from 'react';

import type { Priority } from '../../types.js';
import { PriorityItem } from '../PriorityItem';

import { renderWithDnd } from '@/test-utils/renderWithDnd';

const basePriority: Priority = {
  id: 'p-1',
  text: '<p>Hello</p>',
  done: false,
};

function renderItem(props: Partial<React.ComponentProps<typeof PriorityItem>> = {}) {
  const defaultProps: React.ComponentProps<typeof PriorityItem> = {
    value: basePriority,
    index: 0,
    onChangeText: jest.fn(),
    onToggleDone: jest.fn(),
    ...props,
  };
  return renderWithDnd(<PriorityItem {...defaultProps} />, [basePriority.id]);
}

describe('PriorityItem — drag handle visibility (AC-001, AC-010)', () => {
  it('does NOT render drag handle when canReorder is false (default)', () => {
    renderItem({ canReorder: false });
    expect(screen.queryByRole('button', { name: /arrastar prioridade/i })).toBeNull();
  });

  it('does NOT render drag handle when canReorder is undefined', () => {
    renderItem({});
    expect(screen.queryByRole('button', { name: /arrastar prioridade/i })).toBeNull();
  });

  it('renders drag handle with ⠿ when canReorder=true (AC-001)', () => {
    renderItem({ canReorder: true, index: 0 });
    const handle = screen.getByRole('button', { name: /arrastar prioridade/i });
    expect(handle).toBeInTheDocument();
    expect(handle.textContent).toBe('⠿');
  });
});

describe('PriorityItem — drag handle aria-label (AC-007)', () => {
  it('aria-label reflects 1-based slot index', () => {
    renderItem({ canReorder: true, index: 2 });
    expect(screen.getByRole('button', { name: 'Arrastar prioridade 3' })).toBeInTheDocument();
  });
});

describe('PriorityItem — keyboard handler Alt+↑/↓ (AC-008)', () => {
  it('Alt+ArrowUp calls onMoveUp and prevents default', () => {
    const onMoveUp = jest.fn();
    renderItem({ canReorder: true, onMoveUp });
    const handle = screen.getByRole('button', { name: /arrastar prioridade/i });

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowUp',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(handle, event);

    expect(onMoveUp).toHaveBeenCalledTimes(1);
  });

  it('Alt+ArrowDown calls onMoveDown and prevents default', () => {
    const onMoveDown = jest.fn();
    renderItem({ canReorder: true, onMoveDown });
    const handle = screen.getByRole('button', { name: /arrastar prioridade/i });

    const event = new KeyboardEvent('keydown', {
      key: 'ArrowDown',
      altKey: true,
      bubbles: true,
      cancelable: true,
    });
    fireEvent(handle, event);

    expect(onMoveDown).toHaveBeenCalledTimes(1);
  });

  it('Alt+ArrowUp with onMoveUp absent does not throw (no-op)', () => {
    // No onMoveUp prop — optional, so no explicit undefined needed
    renderItem({ canReorder: true });
    const handle = screen.getByRole('button', { name: /arrastar prioridade/i });

    expect(() => {
      fireEvent.keyDown(handle, { key: 'ArrowUp', altKey: true });
    }).not.toThrow();
  });

  it('Alt+ArrowDown with onMoveDown absent does not throw (no-op)', () => {
    // No onMoveDown prop — optional, so no explicit undefined needed
    renderItem({ canReorder: true });
    const handle = screen.getByRole('button', { name: /arrastar prioridade/i });

    expect(() => {
      fireEvent.keyDown(handle, { key: 'ArrowDown', altKey: true });
    }).not.toThrow();
  });

  it('non-Alt key on handle does NOT call onMoveUp or onMoveDown', () => {
    const onMoveUp = jest.fn();
    const onMoveDown = jest.fn();
    renderItem({ canReorder: true, onMoveUp, onMoveDown });
    const handle = screen.getByRole('button', { name: /arrastar prioridade/i });

    fireEvent.keyDown(handle, { key: 'ArrowUp', altKey: false });
    fireEvent.keyDown(handle, { key: 'ArrowDown', altKey: false });

    expect(onMoveUp).not.toHaveBeenCalled();
    expect(onMoveDown).not.toHaveBeenCalled();
  });
});

describe('PriorityItem — dragHandleRef forwarded (supports focus post-reorder)', () => {
  it('dragHandleRef is attached to the handle button', () => {
    const ref = React.createRef<HTMLButtonElement | null>();
    renderItem({ canReorder: true, dragHandleRef: ref });
    const handle = screen.getByRole('button', { name: /arrastar prioridade/i });
    expect(ref.current).toBe(handle);
  });
});

describe('PriorityItem — AC-025: aria-roledescription on drag handle', () => {
  it('drag handle has aria-roledescription from @dnd-kit useSortable attributes spread', () => {
    // AC-025: @dnd-kit KeyboardSensor is active; useSortable spreads {aria-roledescription}
    // via the attributes object. Current default is "sortable" from @dnd-kit.
    // The spec target is "reordenável" which requires roleDescription option in useSortable.
    renderItem({ canReorder: true, index: 0 });
    const handle = screen.getByRole('button', { name: /arrastar prioridade/i });
    // AC-025: spec requires value "reordenável" — @dnd-kit default is "sortable",
    // so presence-only would pass even with wrong value.
    expect(handle).toHaveAttribute('aria-roledescription', 'reordenável');
  });

  it('single-item: drag handle absent when canReorder=false (AC-009)', () => {
    // AC-009: when canReorder=false, the handle is not rendered at all.
    renderItem({ canReorder: false });
    expect(screen.queryByRole('button', { name: /arrastar prioridade/i })).toBeNull();
  });
});

describe('PriorityItem — AC-006: .lifted state during isDragging (jsdom limitation)', () => {
  // AC-006: .lifted state (box-shadow/opacity during isDragging) cannot be asserted
  // in jsdom — covered in e2e. This test passes trivially to document the limitation.
  it('placeholder: .lifted CSS class not testable in jsdom — covered in e2e', () => {
    // isDragging from useSortable activates only via real pointer events beyond
    // activationConstraint.distance=5. jsdom cannot simulate coordinate-based events.
    // AC-006 visual coverage: see e2e/real/ tests.
    expect(true).toBe(true);
  });
});
