/**
 * Notes keyboard reorder tests — T-009 (FEAT-019)
 *
 * Covers: AC-020, AC-021, AC-022, AC-023, AC-024
 *
 * Tests Alt+↑/↓ keyboard reorder on drag handles rendered inside Notes.
 * RichTextBlock mocked to <input> per file (regra inviolável #3).
 */

jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
    autoFocus,
  }: {
    value: string;
    onChange?: (_html: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
  }) => (
    <input
      type="text"
      role="textbox"
      aria-label={ariaLabel}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
  return { RichTextLine: Editor, RichTextBlock: Editor };
});

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Note, NotePrefix } from '../../types.js';
import { Notes } from '../Notes.js';

import { renderWithProviders } from '@/test-utils';

function makeNote(id: string, text = '', prefix: NotePrefix = '•'): Note {
  return { id, text, prefix };
}

function Container({ initial, spy }: { initial: Note[]; spy?: (_n: Note[]) => void }) {
  const [value, setValue] = useState<Note[]>(initial);
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

describe('Notes keyboard reorder — Alt+ArrowUp (AC-020, AC-021)', () => {
  it('AC-020: Alt+ArrowUp on drag handle of index 1 moves it up; onChange called with swapped order', async () => {
    const n1 = makeNote('n1', 'A');
    const n2 = makeNote('n2', 'B');
    const n3 = makeNote('n3', 'C');
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1, n2, n3]} spy={spy} />);

    const handles = screen.getAllByRole('button', { name: /Arrastar nota/i });
    const handle2 = handles[1] as HTMLElement; // index 1

    await act(async () => {
      handle2.focus();
      handle2.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowUp',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls[spy.mock.calls.length - 1]?.[0] as Note[];
    expect(emitted).toHaveLength(3);
    expect(emitted[0]?.id).toBe('n2');
    expect(emitted[1]?.id).toBe('n1');
    expect(emitted[2]?.id).toBe('n3');
  });

  it('AC-021: Alt+ArrowUp on drag handle of index 0 is no-op; onChange NOT called', async () => {
    const n1 = makeNote('n1', 'A');
    const n2 = makeNote('n2', 'B');
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1, n2]} spy={spy} />);

    const handles = screen.getAllByRole('button', { name: /Arrastar nota/i });
    const handle1 = handles[0] as HTMLElement; // index 0

    await act(async () => {
      handle1.focus();
      handle1.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowUp',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    // onChange should NOT be called — boundary no-op
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Notes keyboard reorder — Alt+ArrowDown (AC-022, AC-023)', () => {
  it('AC-022: Alt+ArrowDown on drag handle of index 0 moves it down; onChange called with swapped order', async () => {
    const n1 = makeNote('n1', 'A');
    const n2 = makeNote('n2', 'B');
    const n3 = makeNote('n3', 'C');
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1, n2, n3]} spy={spy} />);

    const handles = screen.getAllByRole('button', { name: /Arrastar nota/i });
    const handle1 = handles[0] as HTMLElement; // index 0

    await act(async () => {
      handle1.focus();
      handle1.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls[spy.mock.calls.length - 1]?.[0] as Note[];
    expect(emitted).toHaveLength(3);
    expect(emitted[0]?.id).toBe('n2');
    expect(emitted[1]?.id).toBe('n1');
    expect(emitted[2]?.id).toBe('n3');
  });

  it('AC-023: Alt+ArrowDown on last drag handle is no-op; onChange NOT called', async () => {
    const n1 = makeNote('n1', 'A');
    const n2 = makeNote('n2', 'B');
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1, n2]} spy={spy} />);

    const handles = screen.getAllByRole('button', { name: /Arrastar nota/i });
    const lastHandle = handles[handles.length - 1] as HTMLElement; // last index

    await act(async () => {
      lastHandle.focus();
      lastHandle.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          bubbles: true,
          cancelable: true,
        }),
      );
    });

    // onChange should NOT be called — boundary no-op
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('Notes keyboard reorder — canReorder=false (AC-013, AC-014)', () => {
  it('drag handle NOT rendered when only 1 note (canReorder=false)', () => {
    const note = makeNote('n1', 'solo');
    renderWithProviders(<Container initial={[note]} />);

    expect(screen.queryByRole('button', { name: /Arrastar nota/i })).not.toBeInTheDocument();
  });
});

describe('Notes keyboard reorder — focus follows item after Alt+↑/↓ (AC-024)', () => {
  async function doKeyReorder(handle: HTMLElement, key: 'ArrowUp' | 'ArrowDown') {
    await act(async () => {
      handle.focus();
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key, altKey: true, bubbles: true, cancelable: true }),
      );
    });
  }

  it('AC-024: Alt+ArrowDown — focus follows item to new index', async () => {
    const spy = jest.fn();
    renderWithProviders(
      <Container initial={[makeNote('n1', 'A'), makeNote('n2', 'B')]} spy={spy} />,
    );
    const handles = screen.getAllByRole('button', { name: /Arrastar nota/i });
    await doKeyReorder(handles[0] as HTMLElement, 'ArrowDown');
    await waitFor(() => expect(spy).toHaveBeenCalled());
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getAllByRole('button', { name: /Arrastar nota/i })[1],
      );
    });
  });

  it('AC-024: Alt+ArrowUp — focus follows item to new index', async () => {
    const spy = jest.fn();
    renderWithProviders(
      <Container initial={[makeNote('n1', 'A'), makeNote('n2', 'B')]} spy={spy} />,
    );
    const handles = screen.getAllByRole('button', { name: /Arrastar nota/i });
    await doKeyReorder(handles[1] as HTMLElement, 'ArrowUp');
    await waitFor(() => expect(spy).toHaveBeenCalled());
    await waitFor(() => {
      expect(document.activeElement).toBe(
        screen.getAllByRole('button', { name: /Arrastar nota/i })[0],
      );
    });
  });
});

describe('Notes — PT-BR DnD announcements (AC-026)', () => {
  // Spy on DndContext.type (inner fn of React.memo) to capture the
  // accessibility.announcements prop Notes.tsx passes to DndContext.
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

  it('AC-026: announcements prop has PT-BR onDragEnd "Item solto em posição {pos}."', () => {
    renderWithProviders(<Container initial={[makeNote('n1'), makeNote('n2')]} />);
    expect(capturedAnnouncements).not.toBeNull();
    const msg = capturedAnnouncements!.onDragEnd?.({
      active: { id: 'n1' },
      over: { id: 'n2' },
    } as unknown as Record<string, unknown>);
    expect(msg).toMatch(/Item solto em posição \d+\./);
  });

  it('AC-026: announcements prop has PT-BR onDragCancel "Reordenação cancelada."', () => {
    renderWithProviders(<Container initial={[makeNote('n1'), makeNote('n2')]} />);
    expect(capturedAnnouncements).not.toBeNull();
    expect(capturedAnnouncements!.onDragCancel?.({} as unknown as Record<string, unknown>)).toBe(
      'Reordenação cancelada.',
    );
  });

  it('AC-026: announcements prop has PT-BR onDragStart and onDragOver strings', () => {
    renderWithProviders(<Container initial={[makeNote('n1'), makeNote('n2')]} />);
    expect(capturedAnnouncements).not.toBeNull();
    const startMsg = capturedAnnouncements!.onDragStart?.({
      active: { id: 'n1' },
    } as unknown as Record<string, unknown>);
    expect(startMsg).toMatch(/Item levantado\. Posição atual 1 de 2/);
    expect(startMsg).toMatch(/Escape para cancelar/);
    const overMsg = capturedAnnouncements!.onDragOver?.({
      active: { id: 'n1' },
      over: { id: 'n2' },
    } as unknown as Record<string, unknown>);
    expect(overMsg).toMatch(/Item movido para posição \d+ de \d+\./);
  });
});

describe('Notes — aria-roledescription on drag handles (AC-025)', () => {
  it('AC-025: drag handle buttons have aria-roledescription (set by @dnd-kit attributes)', async () => {
    const n1 = makeNote('n1', 'A');
    const n2 = makeNote('n2', 'B');
    renderWithProviders(<Container initial={[n1, n2]} />);

    const handles = screen.getAllByRole('button', { name: /Arrastar nota/i });
    // AC-025: roleDescription overridden to PT-BR 'reordenável' via useSortable attributes.
    handles.forEach((handle) => {
      expect(handle).toHaveAttribute('aria-roledescription', 'reordenável');
    });
  });
});
