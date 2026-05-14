/**
 * Unit tests: UndoToastHost — FEAT-022 T-005 (AC-005, AC-012, AC-013).
 *
 * Covers:
 *  - renders nothing (null) when queue is empty
 *  - renders stack of N toasts for N entries
 *  - clicking "Desfazer" on a toast calls that entry's undoFn and removes it
 *  - Cmd+Z on window keydown undoes the LAST enqueued entry (LIFO)
 *  - Ctrl+Z on window keydown undoes the LAST enqueued entry (LIFO)
 *  - Cmd+Z is ignored when focus is inside an element with data-tiptap-editor
 *  - Cmd+Shift+Z is ignored (reserved for redo)
 *  - countdown label updates as time progresses
 */

import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useEffect, type JSX } from 'react';

import { UndoQueueProvider, useUndoQueueContext } from '../../context/UndoQueueContext';
import type { UseUndoQueueReturn } from '../../hooks/useUndoQueue';
import { UndoToastHost } from '../UndoToastHost';

function TestHarness({
  exposeFns,
}: {
  exposeFns: (_fns: UseUndoQueueReturn) => void;
}): JSX.Element | null {
  const fns = useUndoQueueContext();
  useEffect(() => {
    exposeFns(fns);
  }, [fns, exposeFns]);
  return null;
}

function renderHost(extra?: JSX.Element): { getApi: () => UseUndoQueueReturn } {
  let api: UseUndoQueueReturn | null = null;
  render(
    <UndoQueueProvider>
      <TestHarness
        exposeFns={(fns) => {
          api = fns;
        }}
      />
      {extra}
      <UndoToastHost />
    </UndoQueueProvider>,
  );
  return {
    getApi: () => {
      if (api === null) {
        throw new Error('TestHarness did not expose API yet');
      }
      return api;
    },
  };
}

describe('UndoToastHost', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders nothing when queue is empty', () => {
    const { container } = render(
      <UndoQueueProvider>
        <UndoToastHost />
      </UndoQueueProvider>,
    );

    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('renders one toast per enqueued entry (stack of 3)', () => {
    const { getApi } = renderHost();

    act(() => {
      getApi().enqueueUndo({ kind: 'priority', label: 'Prioridade A removida', undoFn: jest.fn() });
      getApi().enqueueUndo({ kind: 'priority', label: 'Prioridade B removida', undoFn: jest.fn() });
      getApi().enqueueUndo({ kind: 'note', label: 'Nota C removida', undoFn: jest.fn() });
    });

    expect(screen.getAllByRole('button', { name: 'Desfazer remoção' })).toHaveLength(3);
    expect(screen.getByText('Prioridade A removida')).toBeInTheDocument();
    expect(screen.getByText('Prioridade B removida')).toBeInTheDocument();
    expect(screen.getByText('Nota C removida')).toBeInTheDocument();
  });

  it('clicking Desfazer on a toast calls that entry undoFn and removes the toast', async () => {
    jest.useRealTimers(); // userEvent needs real timers
    const user = userEvent.setup();

    let api: UseUndoQueueReturn | null = null;
    render(
      <UndoQueueProvider>
        <TestHarness
          exposeFns={(fns) => {
            api = fns;
          }}
        />
        <UndoToastHost />
      </UndoQueueProvider>,
    );

    const undoA = jest.fn();
    const undoB = jest.fn();
    act(() => {
      api!.enqueueUndo({ kind: 'priority', label: 'A removida', undoFn: undoA });
      api!.enqueueUndo({ kind: 'note', label: 'B removida', undoFn: undoB });
    });

    const buttons = screen.getAllByRole('button', { name: 'Desfazer remoção' });
    expect(buttons).toHaveLength(2);

    // First button = first entry (A)
    await user.click(buttons[0]!);

    expect(undoA).toHaveBeenCalledTimes(1);
    expect(undoB).not.toHaveBeenCalled();
    expect(screen.getAllByRole('button', { name: 'Desfazer remoção' })).toHaveLength(1);
    expect(screen.queryByText('A removida')).toBeNull();
    expect(screen.getByText('B removida')).toBeInTheDocument();
  });

  it('Cmd+Z on window undoes the LAST enqueued entry (LIFO)', () => {
    const { getApi } = renderHost();

    const undoA = jest.fn();
    const undoB = jest.fn();
    const undoC = jest.fn();
    act(() => {
      getApi().enqueueUndo({ kind: 'priority', label: 'A', undoFn: undoA });
      getApi().enqueueUndo({ kind: 'priority', label: 'B', undoFn: undoB });
      getApi().enqueueUndo({ kind: 'note', label: 'C', undoFn: undoC });
    });

    act(() => {
      fireEvent.keyDown(window, { key: 'z', metaKey: true });
    });

    expect(undoC).toHaveBeenCalledTimes(1);
    expect(undoA).not.toHaveBeenCalled();
    expect(undoB).not.toHaveBeenCalled();
    expect(screen.queryByText('C')).toBeNull();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('Ctrl+Z on window also undoes the LAST entry (non-Mac)', () => {
    const { getApi } = renderHost();

    const undoA = jest.fn();
    const undoB = jest.fn();
    act(() => {
      getApi().enqueueUndo({ kind: 'priority', label: 'A', undoFn: undoA });
      getApi().enqueueUndo({ kind: 'note', label: 'B', undoFn: undoB });
    });

    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });

    expect(undoB).toHaveBeenCalledTimes(1);
    expect(undoA).not.toHaveBeenCalled();
  });

  it('Cmd+Z is ignored when focus is inside a [data-tiptap-editor] element', () => {
    const editorSibling = (
      <div data-tiptap-editor>
        <input data-testid="tiptap-input" />
      </div>
    );
    const { getApi } = renderHost(editorSibling);

    const undoFn = jest.fn();
    act(() => {
      getApi().enqueueUndo({ kind: 'priority', label: 'X removida', undoFn });
    });

    const input = screen.getByTestId('tiptap-input') as HTMLInputElement;
    input.focus();
    expect(document.activeElement).toBe(input);

    act(() => {
      fireEvent.keyDown(window, { key: 'z', metaKey: true });
    });

    expect(undoFn).not.toHaveBeenCalled();
    expect(screen.getByText('X removida')).toBeInTheDocument();
  });

  it('Cmd+Shift+Z is ignored (reserved for redo)', () => {
    const { getApi } = renderHost();

    const undoFn = jest.fn();
    act(() => {
      getApi().enqueueUndo({ kind: 'priority', label: 'X', undoFn });
    });

    act(() => {
      fireEvent.keyDown(window, { key: 'z', metaKey: true, shiftKey: true });
    });

    expect(undoFn).not.toHaveBeenCalled();
  });

  it('countdown text decreases as time advances', () => {
    const { getApi } = renderHost();

    act(() => {
      getApi().enqueueUndo({
        kind: 'priority',
        label: 'Item removido',
        undoFn: jest.fn(),
        ttlMs: 10_000,
      });
    });

    // Initially shows ~10s (ceil of remaining 10000ms).
    expect(screen.getByText('10s')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(2_100);
    });

    // After 2.1s, remaining ≈ 7.9s → ceil = 8s. Accept 8s or 9s due to timing edges.
    const after = screen.queryByText('8s') ?? screen.queryByText('9s');
    expect(after).not.toBeNull();
    // No "10s" anymore.
    expect(screen.queryByText('10s')).toBeNull();
  });

  it('container has role="status" and aria-live="polite" when entries are present', () => {
    const { getApi } = renderHost();

    act(() => {
      getApi().enqueueUndo({ kind: 'priority', label: 'X', undoFn: jest.fn() });
    });

    const hosts = screen.getAllByRole('status');
    // Host container is at least one of these; ensure aria-live polite exists.
    const polite = hosts.find((node) => node.getAttribute('aria-live') === 'polite');
    expect(polite).toBeDefined();
  });
});
