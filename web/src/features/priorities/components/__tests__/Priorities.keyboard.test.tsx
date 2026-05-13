/**
 * Priorities.keyboard.test.tsx
 *
 * Covers: AC-008, AC-009, AC-010, AC-011, AC-012, AC-026 for FEAT-019.
 *
 * Tests keyboard reordering (Alt+↑/↓) on drag handles rendered by Priorities.
 * Mock strategy: RichTextBlock → <input> to avoid Tiptap in jsdom.
 */

// jest.mock must appear before any imports — hoisted by Jest.
jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange?: (_v: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
    onEnter?: () => void;
    onBackspaceEmpty?: () => void;
    placeholder?: string;
  }) => (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
  return { RichTextBlock: Editor, RichTextLine: Editor };
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Priority } from '../../types.js';
import { EMPTY_PRIORITY } from '../../types.js';
import { Priorities } from '../Priorities.js';

import { renderWithProviders } from '@/test-utils';

function makeItem(n: number): Priority {
  return { id: `kb-${n}`, text: `task ${n}`, done: false };
}

function Harness({ initial, spy }: { initial: Priority[]; spy?: (_v: Priority[]) => void }) {
  const [value, setValue] = useState<Priority[]>(initial);
  return (
    <Priorities
      value={value}
      onChange={(next) => {
        setValue(next);
        spy?.(next);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// AC-002: drag handle absent when canReorder=false (single item)
// ---------------------------------------------------------------------------

describe('Priorities keyboard — AC-002: no drag handle with 1 item', () => {
  it('drag handle NOT in document when only 1 item', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(1);
    });
    expect(screen.queryByRole('button', { name: /arrastar prioridade/i })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// AC-001: drag handles present when 2+ items
// ---------------------------------------------------------------------------

describe('Priorities keyboard — AC-001: drag handles present with 2+ items', () => {
  it('renders a drag handle for each item when items.length > 1', async () => {
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} />);
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /arrastar prioridade/i })).toHaveLength(2);
    });
  });
});

// ---------------------------------------------------------------------------
// AC-008: Alt+ArrowUp on item[1] → item moves to index 0; onChange called
// ---------------------------------------------------------------------------

describe('Priorities keyboard — AC-008: Alt+ArrowUp on item[1] swaps with item[0]', () => {
  it('onChange called with item[1] moved to index 0', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} spy={spy} />);
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /arrastar prioridade/i })).toHaveLength(2);
    });
    const handles = screen.getAllByRole('button', { name: /arrastar prioridade/i });
    fireEvent.keyDown(handles[1]!, { key: 'ArrowUp', altKey: true });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(emitted[0]?.id).toBe('kb-1');
    expect(emitted[1]?.id).toBe('kb-0');
  });

  it('onChange called with item[1] moved to index 0 (3 items)', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1), makeItem(2)]} spy={spy} />);
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /arrastar prioridade/i })).toHaveLength(3);
    });
    const handles = screen.getAllByRole('button', { name: /arrastar prioridade/i });
    fireEvent.keyDown(handles[1]!, { key: 'ArrowUp', altKey: true });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(emitted[0]?.id).toBe('kb-1');
    expect(emitted[1]?.id).toBe('kb-0');
    expect(emitted[2]?.id).toBe('kb-2');
  });
});

// ---------------------------------------------------------------------------
// AC-009: Alt+ArrowUp on item[0] → no-op
// ---------------------------------------------------------------------------

describe('Priorities keyboard — AC-009: Alt+ArrowUp on item[0] is no-op', () => {
  it('onChange NOT called when pressing Alt+ArrowUp on first item', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} spy={spy} />);
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /arrastar prioridade/i })).toHaveLength(2);
    });
    const [handle0] = screen.getAllByRole('button', { name: /arrastar prioridade/i });
    fireEvent.keyDown(handle0!, { key: 'ArrowUp', altKey: true });
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC-010: Alt+ArrowDown on item[N] → item moves to N+1; onChange called
// ---------------------------------------------------------------------------

describe('Priorities keyboard — AC-010: Alt+ArrowDown on item[0] swaps with item[1]', () => {
  it('onChange called with item[0] moved to index 1', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} spy={spy} />);
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /arrastar prioridade/i })).toHaveLength(2);
    });
    const [handle0] = screen.getAllByRole('button', { name: /arrastar prioridade/i });
    fireEvent.keyDown(handle0!, { key: 'ArrowDown', altKey: true });
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(emitted[0]?.id).toBe('kb-1');
    expect(emitted[1]?.id).toBe('kb-0');
  });
});

// ---------------------------------------------------------------------------
// AC-011: Alt+ArrowDown on last item → no-op
// ---------------------------------------------------------------------------

describe('Priorities keyboard — AC-011: Alt+ArrowDown on last item is no-op', () => {
  it('onChange NOT called when pressing Alt+ArrowDown on last item', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} spy={spy} />);
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /arrastar prioridade/i })).toHaveLength(2);
    });
    const handles = screen.getAllByRole('button', { name: /arrastar prioridade/i });
    fireEvent.keyDown(handles[handles.length - 1]!, { key: 'ArrowDown', altKey: true });
    expect(spy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// AC-012: focus follows item to new position after keyboard reorder
// ---------------------------------------------------------------------------

describe('Priorities keyboard — AC-012: focus follows item after Alt+ArrowUp', () => {
  it('after Alt+ArrowUp on item[1], the drag handle at index 0 receives focus', async () => {
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} />);
    await waitFor(() => {
      expect(screen.queryAllByRole('button', { name: /arrastar prioridade/i })).toHaveLength(2);
    });
    const handles = screen.getAllByRole('button', { name: /arrastar prioridade/i });
    handles[1]!.focus();
    fireEvent.keyDown(handles[1]!, { key: 'ArrowUp', altKey: true });
    await waitFor(() => {
      expect(document.activeElement).toHaveAttribute('aria-label', 'Arrastar prioridade 1');
    });
  });
});

// ---------------------------------------------------------------------------
// AC-026: PT-BR announcement strings — captured from DndContext prop
// Spies on DndContext.type (inner fn of React.memo) to capture the
// accessibility.announcements prop that Priorities.tsx passes to DndContext.
// ---------------------------------------------------------------------------

describe('Priorities — PT-BR DnD announcements (AC-026)', () => {
  type Announcements = Record<string, (_args: Record<string, unknown>) => string>;
  let capturedAnnouncements: Announcements | null = null;

  beforeEach(() => {
    capturedAnnouncements = null;
    // eslint-disable-next-line no-undef
    const { DndContext } = require('@dnd-kit/core') as {
      DndContext: { type: (..._args: unknown[]) => unknown };
    };
    const originalType = DndContext.type;
    jest.spyOn(DndContext, 'type').mockImplementation(function (this: unknown, ...args: unknown[]) {
      const props = args[0] as { accessibility?: { announcements?: Announcements } };
      capturedAnnouncements = props.accessibility?.announcements ?? null;
      return originalType.apply(this, args);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('AC-026: announcements prop has PT-BR onDragStart with position and instructions', () => {
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} />);
    expect(capturedAnnouncements).not.toBeNull();
    const msg = capturedAnnouncements!.onDragStart?.({
      active: { id: 'kb-0' },
    } as unknown as Record<string, unknown>);
    expect(msg).toMatch(/Item levantado\. Posição atual 1 de 2\./);
    expect(msg).toMatch(
      /Use as setas para mover, espaço ou Enter para soltar, Escape para cancelar\./,
    );
  });

  it('AC-026: announcements prop has PT-BR onDragOver "Item movido para posição {pos} de {total}."', () => {
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1), makeItem(2)]} />);
    expect(capturedAnnouncements).not.toBeNull();
    const msg = capturedAnnouncements!.onDragOver?.({
      active: { id: 'kb-0' },
      over: { id: 'kb-2' },
    } as unknown as Record<string, unknown>);
    expect(msg).toBe('Item movido para posição 3 de 3.');
    const noOver = capturedAnnouncements!.onDragOver?.({
      active: { id: 'kb-0' },
      over: null,
    } as unknown as Record<string, unknown>);
    expect(noOver).toBe('');
  });

  it('AC-026: announcements prop has PT-BR onDragEnd "Item solto em posição {pos}."', () => {
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} />);
    expect(capturedAnnouncements).not.toBeNull();
    const msg = capturedAnnouncements!.onDragEnd?.({
      active: { id: 'kb-0' },
      over: { id: 'kb-1' },
    } as unknown as Record<string, unknown>);
    expect(msg).toMatch(/Item solto em posição \d+\./);
  });

  it('AC-026: announcements prop has PT-BR onDragCancel "Reordenação cancelada."', () => {
    renderWithProviders(<Harness initial={[makeItem(0), makeItem(1)]} />);
    expect(capturedAnnouncements).not.toBeNull();
    expect(capturedAnnouncements!.onDragCancel?.({} as unknown as Record<string, unknown>)).toBe(
      'Reordenação cancelada.',
    );
  });
});
