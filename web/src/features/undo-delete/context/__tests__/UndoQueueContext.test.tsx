/**
 * Unit tests for UndoQueueContext — FEAT-022 T-003.
 *
 * Covers AC-001 (Provider expõe state da queue) e AC-002 (consumer hook
 * com guard "must be inside Provider").
 */

import { act, render, renderHook, screen } from '@testing-library/react';
import type { JSX, ReactNode } from 'react';

import { UndoQueueProvider, useUndoQueueContext } from '../UndoQueueContext.js';

function Wrapper({ children }: { children: ReactNode }): JSX.Element {
  return <UndoQueueProvider>{children}</UndoQueueProvider>;
}

describe('UndoQueueContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('UndoQueueProvider renders its children', () => {
    render(
      <UndoQueueProvider>
        <span data-testid="child">hello</span>
      </UndoQueueProvider>,
    );

    expect(screen.getByTestId('child')).toHaveTextContent('hello');
  });

  it('useUndoQueueContext returns the same shape as useUndoQueue inside Provider', () => {
    const { result } = renderHook(() => useUndoQueueContext(), { wrapper: Wrapper });

    expect(result.current).toEqual(
      expect.objectContaining({
        queue: expect.any(Array),
        enqueueUndo: expect.any(Function),
        cancelUndo: expect.any(Function),
        flushAll: expect.any(Function),
      }),
    );
    expect(result.current.queue).toHaveLength(0);
  });

  it('throws an Error mentioning Provider when used outside UndoQueueProvider', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => renderHook(() => useUndoQueueContext())).toThrow(/Provider/i);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it('enqueueUndo via context updates queue accessible via context', () => {
    const { result } = renderHook(() => useUndoQueueContext(), { wrapper: Wrapper });
    const undoFn = jest.fn();

    let id = '';
    act(() => {
      id = result.current.enqueueUndo({
        kind: 'priority',
        label: 'Item removido',
        undoFn,
      });
    });

    expect(id).toEqual(expect.any(String));
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0]!.id).toBe(id);
    expect(result.current.queue[0]!.kind).toBe('priority');

    act(() => {
      result.current.cancelUndo(id);
    });

    expect(undoFn).toHaveBeenCalledTimes(1);
    expect(result.current.queue).toHaveLength(0);
  });
});
