/**
 * Unit tests for useUndoQueue — FEAT-022 T-002.
 *
 * Covers AC-001 (enqueue with TTL), AC-002 (undo restores via undoFn),
 * AC-004 (TTL expires → commit, queue empty), AC-005 (independent stack).
 */

import { act, renderHook } from '@testing-library/react';

import type { EnqueueUndoOptions } from '../../types.js';
import { useUndoQueue } from '../useUndoQueue.js';

function makeOpts(overrides: Partial<EnqueueUndoOptions> = {}): EnqueueUndoOptions {
  return {
    kind: 'priority',
    label: 'Item removido',
    undoFn: jest.fn(),
    ...overrides,
  };
}

describe('useUndoQueue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('enqueueUndo adds an entry and returns its id', () => {
    const { result } = renderHook(() => useUndoQueue());

    let id = '';
    act(() => {
      id = result.current.enqueueUndo(makeOpts());
    });

    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
    expect(result.current.queue).toHaveLength(1);
    const entry = result.current.queue[0]!;
    expect(entry.id).toBe(id);
    expect(entry.kind).toBe('priority');
    expect(entry.label).toBe('Item removido');
    expect(entry.ttlMs).toBe(10_000);
    expect(typeof entry.createdAt).toBe('number');
  });

  it('respects custom ttlMs', () => {
    const { result } = renderHook(() => useUndoQueue());
    const undoFn = jest.fn();

    act(() => {
      result.current.enqueueUndo(makeOpts({ undoFn, ttlMs: 3_000 }));
    });

    expect(result.current.queue[0]!.ttlMs).toBe(3_000);

    // Advance just under the TTL — entry still present, commit not yet.
    act(() => {
      jest.advanceTimersByTime(2_999);
    });
    expect(result.current.queue).toHaveLength(1);

    // Crossing the boundary commits (undoFn must NOT be called on expire).
    act(() => {
      jest.advanceTimersByTime(2);
    });
    expect(result.current.queue).toHaveLength(0);
    expect(undoFn).not.toHaveBeenCalled();
  });

  it('cancelUndo calls undoFn and removes the entry', () => {
    const { result } = renderHook(() => useUndoQueue());
    const undoFn = jest.fn();

    let id = '';
    act(() => {
      id = result.current.enqueueUndo(makeOpts({ undoFn }));
    });

    act(() => {
      result.current.cancelUndo(id);
    });

    expect(undoFn).toHaveBeenCalledTimes(1);
    expect(result.current.queue).toHaveLength(0);

    // Even if the timer would have fired, undoFn must not be called again.
    act(() => {
      jest.advanceTimersByTime(20_000);
    });
    expect(undoFn).toHaveBeenCalledTimes(1);
  });

  it('cancelUndo with unknown id is a no-op', () => {
    const { result } = renderHook(() => useUndoQueue());
    const undoFn = jest.fn();

    act(() => {
      result.current.enqueueUndo(makeOpts({ undoFn }));
    });

    expect(() => {
      act(() => {
        result.current.cancelUndo('unknown-id');
      });
    }).not.toThrow();

    expect(undoFn).not.toHaveBeenCalled();
    expect(result.current.queue).toHaveLength(1);
  });

  it('TTL expiry removes the entry (commit) without calling undoFn', () => {
    const { result } = renderHook(() => useUndoQueue());
    const undoFn = jest.fn();

    act(() => {
      result.current.enqueueUndo(makeOpts({ undoFn }));
    });

    expect(result.current.queue).toHaveLength(1);

    act(() => {
      jest.advanceTimersByTime(10_001);
    });

    expect(result.current.queue).toHaveLength(0);
    expect(undoFn).not.toHaveBeenCalled();
  });

  it('flushAll clears all entries WITHOUT calling undoFn', () => {
    const { result } = renderHook(() => useUndoQueue());
    const undoA = jest.fn();
    const undoB = jest.fn();

    act(() => {
      result.current.enqueueUndo(makeOpts({ undoFn: undoA }));
      result.current.enqueueUndo(makeOpts({ kind: 'note', undoFn: undoB }));
    });

    expect(result.current.queue).toHaveLength(2);

    act(() => {
      result.current.flushAll();
    });

    expect(result.current.queue).toHaveLength(0);
    expect(undoA).not.toHaveBeenCalled();
    expect(undoB).not.toHaveBeenCalled();

    // Timers must have been cleared — advancing the clock does nothing.
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(undoA).not.toHaveBeenCalled();
    expect(undoB).not.toHaveBeenCalled();
  });

  it('multiple enqueues stack independently — each expires at its own TTL', () => {
    const { result } = renderHook(() => useUndoQueue());
    const undoA = jest.fn();
    const undoB = jest.fn();

    act(() => {
      result.current.enqueueUndo(makeOpts({ undoFn: undoA, ttlMs: 5_000 }));
    });

    // Stagger second enqueue 2s later — its TTL window is independent.
    act(() => {
      jest.advanceTimersByTime(2_000);
    });
    act(() => {
      result.current.enqueueUndo(makeOpts({ kind: 'note', undoFn: undoB, ttlMs: 10_000 }));
    });

    expect(result.current.queue).toHaveLength(2);

    // First entry (5s TTL, started at t=0) should expire at t=5_000.
    act(() => {
      jest.advanceTimersByTime(3_001); // now t≈5_001
    });
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0]!.kind).toBe('note');

    // Second entry (10s TTL, started at t=2_000) expires at t=12_000.
    act(() => {
      jest.advanceTimersByTime(7_000); // now t≈12_001
    });
    expect(result.current.queue).toHaveLength(0);
    expect(undoA).not.toHaveBeenCalled();
    expect(undoB).not.toHaveBeenCalled();
  });

  it('unmount clears pending timers (no leaks, no late state updates)', () => {
    const { result, unmount } = renderHook(() => useUndoQueue());
    const undoFn = jest.fn();

    act(() => {
      result.current.enqueueUndo(makeOpts({ undoFn }));
    });

    expect(jest.getTimerCount()).toBeGreaterThan(0);

    unmount();

    // After unmount, no timers should remain pending.
    expect(jest.getTimerCount()).toBe(0);

    // Advancing the clock must not call undoFn (timer cancelled).
    act(() => {
      jest.advanceTimersByTime(30_000);
    });
    expect(undoFn).not.toHaveBeenCalled();
  });

  it('returned id uses crypto.randomUUID (unique per call)', () => {
    const { result } = renderHook(() => useUndoQueue());

    let idA = '';
    let idB = '';
    act(() => {
      idA = result.current.enqueueUndo(makeOpts());
      idB = result.current.enqueueUndo(makeOpts());
    });

    expect(idA).not.toBe(idB);
    expect(result.current.queue.map((e) => e.id)).toEqual([idA, idB]);
  });
});
