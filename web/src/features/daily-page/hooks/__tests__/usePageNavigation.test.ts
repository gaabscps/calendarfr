/**
 * Unit tests for usePageNavigation.ts
 *
 * Covers: AC-013 (goToPrev/Next), AC-014 (Cmd/Ctrl+ArrowLeft/Right),
 *         AC-015 (keyboard guard for editables), AC-016 (KEYBOARD_SHORTCUTS constant),
 *         AC-017 (swipeProps pointer events integration with swipeDetector),
 *         AC-018 (swipe guard for editables), AC-019 (UTC-safe date math),
 *         AC-020 (onBeforeChange awaited before state change).
 */

/* global PointerEvent */

import { renderHook, act } from '@testing-library/react';

import {
  usePageNavigation,
  ANIMATION_DURATION_MS,
  KEYBOARD_SHORTCUTS,
} from '../usePageNavigation.js';
import type {
  UsePageNavigationOptions,
  UsePageNavigationReturn,
} from '../usePageNavigation.types.js';

// Validate public types are re-exported from the main module (type-only check).
// If these fail to import at compile time the build catches it.
type _CheckOptions = UsePageNavigationOptions;
type _CheckReturn = UsePageNavigationReturn;

// ─── PointerEvent polyfill ───────────────────────────────────────────────────
// jsdom does not implement PointerEvent. We provide a minimal polyfill that
// extends MouseEvent with pointer-specific properties (pointerId, clientX/Y).
// We define an init shape inline to avoid referencing TS DOM lib types in
// ESLint's no-undef scope (test files don't use projectService type checking).
type PointerEventInit = {
  pointerId?: number;
  bubbles?: boolean;
  cancelable?: boolean;
  clientX?: number;
  clientY?: number;
};
if (typeof PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    readonly pointerId: number;
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
    }
  }
  // globalThis.PointerEvent does not exist in jsdom — assign the polyfill class.
  (globalThis as any).PointerEvent = PointerEventPolyfill;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dispatchKeydown(key: string, modifiers: { metaKey?: boolean; ctrlKey?: boolean } = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    metaKey: modifiers.metaKey ?? false,
    ctrlKey: modifiers.ctrlKey ?? false,
  });
  document.dispatchEvent(event);
  return event;
}

// ─── Constants ───────────────────────────────────────────────────────────────

describe('exported constants', () => {
  it('ANIMATION_DURATION_MS is 300', () => {
    expect(ANIMATION_DURATION_MS).toBe(300);
  });

  it('KEYBOARD_SHORTCUTS.prev contains Control+ArrowLeft and Meta+ArrowLeft', () => {
    expect(KEYBOARD_SHORTCUTS.prev).toContain('Control+ArrowLeft');
    expect(KEYBOARD_SHORTCUTS.prev).toContain('Meta+ArrowLeft');
  });

  it('KEYBOARD_SHORTCUTS.next contains Control+ArrowRight and Meta+ArrowRight', () => {
    expect(KEYBOARD_SHORTCUTS.next).toContain('Control+ArrowRight');
    expect(KEYBOARD_SHORTCUTS.next).toContain('Meta+ArrowRight');
  });
});

// ─── Initial state ────────────────────────────────────────────────────────────

describe('usePageNavigation — initial state', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('exposes the initialDate as date', () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    expect(result.current.date).toBe('2026-05-11');
  });

  it('starts with direction null', () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    expect(result.current.direction).toBeNull();
  });

  it('starts with isAnimating false', () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    expect(result.current.isAnimating).toBe(false);
  });
});

// ─── goToPrev ────────────────────────────────────────────────────────────────

describe('usePageNavigation — goToPrev', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('navigates to previous day (UTC-safe arithmetic)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await act(async () => {
      await result.current.goToPrev();
    });
    expect(result.current.date).toBe('2026-05-10');
  });

  it('sets direction to "prev"', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await act(async () => {
      await result.current.goToPrev();
    });
    expect(result.current.direction).toBe('prev');
  });

  it('sets isAnimating to true immediately after navigation', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await act(async () => {
      await result.current.goToPrev();
    });
    expect(result.current.isAnimating).toBe(true);
  });

  it('sets isAnimating to false after ANIMATION_DURATION_MS', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await act(async () => {
      await result.current.goToPrev();
    });
    expect(result.current.isAnimating).toBe(true);

    act(() => {
      jest.advanceTimersByTime(ANIMATION_DURATION_MS);
    });
    expect(result.current.isAnimating).toBe(false);
  });

  it('navigates across month boundary correctly (April 1 → March 31)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-04-01' }));
    await act(async () => {
      await result.current.goToPrev();
    });
    expect(result.current.date).toBe('2026-03-31');
  });

  it('navigates across year boundary correctly (Jan 1 → Dec 31)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-01-01' }));
    await act(async () => {
      await result.current.goToPrev();
    });
    expect(result.current.date).toBe('2025-12-31');
  });
});

// ─── goToNext ────────────────────────────────────────────────────────────────

describe('usePageNavigation — goToNext', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('navigates to next day', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await act(async () => {
      await result.current.goToNext();
    });
    expect(result.current.date).toBe('2026-05-12');
  });

  it('sets direction to "next"', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await act(async () => {
      await result.current.goToNext();
    });
    expect(result.current.direction).toBe('next');
  });

  it('navigates across month boundary correctly (May 31 → June 1)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-31' }));
    await act(async () => {
      await result.current.goToNext();
    });
    expect(result.current.date).toBe('2026-06-01');
  });

  it('navigates across year boundary correctly (Dec 31 → Jan 1)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-12-31' }));
    await act(async () => {
      await result.current.goToNext();
    });
    expect(result.current.date).toBe('2027-01-01');
  });
});

// ─── goToDate ────────────────────────────────────────────────────────────────

describe('usePageNavigation — goToDate', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('navigates to an arbitrary future date with direction "next"', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await act(async () => {
      await result.current.goToDate('2026-06-15');
    });
    expect(result.current.date).toBe('2026-06-15');
    expect(result.current.direction).toBe('next');
  });

  it('navigates to an arbitrary past date with direction "prev"', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await act(async () => {
      await result.current.goToDate('2026-04-01');
    });
    expect(result.current.date).toBe('2026-04-01');
    expect(result.current.direction).toBe('prev');
  });

  it('is a no-op when navigating to the same date', async () => {
    const onBeforeChange = jest.fn();
    const { result } = renderHook(() =>
      usePageNavigation({ initialDate: '2026-05-11', onBeforeChange }),
    );
    await act(async () => {
      await result.current.goToDate('2026-05-11');
    });
    expect(result.current.date).toBe('2026-05-11');
    // onBeforeChange should NOT be called for same-date no-op
    expect(onBeforeChange).not.toHaveBeenCalled();
  });

  it('throws (or is rejected) for invalid date format', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await expect(
      act(async () => {
        await result.current.goToDate('garbage');
      }),
    ).rejects.toThrow();
  });

  it('throws (or is rejected) for partial date string', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await expect(
      act(async () => {
        await result.current.goToDate('2026-05');
      }),
    ).rejects.toThrow();
  });

  it('throws for out-of-range month (2026-13-99)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await expect(
      act(async () => {
        await result.current.goToDate('2026-13-99');
      }),
    ).rejects.toThrow();
  });

  it('throws for impossible calendar date (2026-02-30)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));
    await expect(
      act(async () => {
        await result.current.goToDate('2026-02-30');
      }),
    ).rejects.toThrow();
  });
});

// ─── onBeforeChange ──────────────────────────────────────────────────────────

describe('usePageNavigation — onBeforeChange race protection', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('awaits onBeforeChange before applying state change', async () => {
    const order: string[] = [];
    let resolveBeforeChange!: () => void;

    const onBeforeChange = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveBeforeChange = resolve;
          order.push('beforeChange_started');
        }),
    );

    const { result } = renderHook(() =>
      usePageNavigation({ initialDate: '2026-05-11', onBeforeChange }),
    );

    // Start navigation — should await onBeforeChange
    let navDone = false;
    act(() => {
      result.current.goToPrev().then(() => {
        order.push('nav_done');
        navDone = true;
      });
    });

    // Date should NOT have changed yet
    expect(result.current.date).toBe('2026-05-11');
    expect(navDone).toBe(false);

    // Resolve the beforeChange promise
    await act(async () => {
      order.push('resolving');
      resolveBeforeChange();
      // Allow microtasks to flush
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(order).toEqual(['beforeChange_started', 'resolving', 'nav_done']);
    expect(result.current.date).toBe('2026-05-10');
  });

  it('calls onBeforeChange on goToNext', async () => {
    const onBeforeChange = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePageNavigation({ initialDate: '2026-05-11', onBeforeChange }),
    );

    await act(async () => {
      await result.current.goToNext();
    });

    expect(onBeforeChange).toHaveBeenCalledTimes(1);
  });

  it('calls onBeforeChange on goToDate', async () => {
    const onBeforeChange = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      usePageNavigation({ initialDate: '2026-05-11', onBeforeChange }),
    );

    await act(async () => {
      await result.current.goToDate('2026-06-01');
    });

    expect(onBeforeChange).toHaveBeenCalledTimes(1);
  });
});

// ─── isAnimating timer cleanup ────────────────────────────────────────────────

describe('usePageNavigation — animation timer cleanup', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('clears pending animation timer on new navigation', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    // First nav
    await act(async () => {
      await result.current.goToPrev();
    });
    expect(result.current.isAnimating).toBe(true);

    // Second nav before timer fires — should still be animating
    await act(async () => {
      await result.current.goToNext();
    });
    expect(result.current.isAnimating).toBe(true);

    // Advance time — should stop animating
    act(() => {
      jest.advanceTimersByTime(ANIMATION_DURATION_MS);
    });
    expect(result.current.isAnimating).toBe(false);
  });

  it('clears timer on unmount without error', async () => {
    const { result, unmount } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      await result.current.goToPrev();
    });

    // Unmount while animation timer is pending
    unmount();

    // Advancing time after unmount should not cause errors
    act(() => {
      jest.advanceTimersByTime(ANIMATION_DURATION_MS);
    });
    // No error = pass
  });
});

// ─── Keyboard shortcuts ───────────────────────────────────────────────────────

describe('usePageNavigation — keyboard shortcuts', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('triggers goToPrev on Cmd+ArrowLeft (Mac)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      dispatchKeydown('ArrowLeft', { metaKey: true });
      // Flush microtasks for the async handler
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-10');
  });

  it('triggers goToPrev on Ctrl+ArrowLeft (Win/Linux)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      dispatchKeydown('ArrowLeft', { ctrlKey: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-10');
  });

  it('triggers goToNext on Cmd+ArrowRight (Mac)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      dispatchKeydown('ArrowRight', { metaKey: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-12');
  });

  it('triggers goToNext on Ctrl+ArrowRight (Win/Linux)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      dispatchKeydown('ArrowRight', { ctrlKey: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-12');
  });

  it('does NOT trigger navigation on plain ArrowLeft (no modifier)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      dispatchKeydown('ArrowLeft');
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');
  });

  it('does NOT trigger navigation on plain ArrowRight (no modifier)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      dispatchKeydown('ArrowRight');
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');
  });

  it('does NOT trigger when activeElement is a contenteditable', async () => {
    const editor = document.createElement('div');
    editor.setAttribute('contenteditable', 'true');
    document.body.appendChild(editor);
    editor.focus();

    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      dispatchKeydown('ArrowLeft', { metaKey: true });
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');

    document.body.removeChild(editor);
  });

  it('does NOT trigger when activeElement is an input', async () => {
    const input = document.createElement('input');
    input.type = 'text';
    document.body.appendChild(input);
    input.focus();

    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    await act(async () => {
      dispatchKeydown('ArrowLeft', { metaKey: true });
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');

    document.body.removeChild(input);
  });

  it('calls preventDefault only when shortcut is handled', async () => {
    renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const handledEvent = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      metaKey: true,
      bubbles: true,
      cancelable: true,
    });
    const preventDefaultSpy = jest.spyOn(handledEvent, 'preventDefault');

    await act(async () => {
      document.dispatchEvent(handledEvent);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(preventDefaultSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT call preventDefault for unhandled keys', async () => {
    renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const unhandledEvent = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      bubbles: true,
      cancelable: true,
      // no modifier
    });
    const preventDefaultSpy = jest.spyOn(unhandledEvent, 'preventDefault');

    act(() => {
      document.dispatchEvent(unhandledEvent);
    });

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });

  it('removes keydown listener on unmount — no error after unmount', async () => {
    const { unmount } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    unmount();

    // Dispatch after unmount — should not cause any side effects or errors
    act(() => {
      dispatchKeydown('ArrowLeft', { metaKey: true });
    });
    // No error = pass
  });

  it('logs error and leaves date unchanged when onBeforeChange rejects via keyboard', async () => {
    const onBeforeChange = jest.fn().mockRejectedValue(new Error('flush failed'));
    // Suppress the expected console.error (global interceptor would fail the test otherwise).
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      usePageNavigation({ initialDate: '2026-05-11', onBeforeChange }),
    );

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', metaKey: true }));

    // Wait for microtasks to flush the .catch handler
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('keyboard nav failed'),
      expect.any(Error),
    );

    errorSpy.mockRestore();
  });
});

// ─── swipeProps ───────────────────────────────────────────────────────────────

describe('usePageNavigation — swipeProps', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  function getContainer() {
    const div = document.createElement('div');
    document.body.appendChild(div);
    // Mock setPointerCapture / releasePointerCapture (jsdom doesn't implement them)
    div.setPointerCapture = jest.fn();
    div.releasePointerCapture = jest.fn();
    return div;
  }

  function simulateSwipe(
    container: HTMLElement,
    swipeProps: React.HTMLAttributes<HTMLElement>,
    {
      startX,
      startY,
      endX,
      endY,
      duration,
    }: { startX: number; startY: number; endX: number; endY: number; duration: number },
  ) {
    const pointerId = 1;
    const downEvent = new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      pointerId,
      clientX: startX,
      clientY: startY,
    });
    Object.defineProperty(downEvent, 'currentTarget', { value: container });
    swipeProps.onPointerDown?.(downEvent as unknown as React.PointerEvent<HTMLElement>);

    const moveEvent = new PointerEvent('pointermove', {
      bubbles: true,
      cancelable: true,
      pointerId,
      clientX: endX,
      clientY: endY,
    });
    swipeProps.onPointerMove?.(moveEvent as unknown as React.PointerEvent<HTMLElement>);

    // Simulate duration by manipulating timing — we use duration directly
    const upEvent = new PointerEvent('pointerup', {
      bubbles: true,
      cancelable: true,
      pointerId,
      clientX: endX,
      clientY: endY,
    });
    // Override timestamp if needed — swipeDetector computes duration from stored time
    // We need to advance time to simulate duration
    jest.advanceTimersByTime(duration);
    swipeProps.onPointerUp?.(upEvent as unknown as React.PointerEvent<HTMLElement>);
  }

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('triggers goToPrev on right swipe (large deltaX positive, fast)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const container = getContainer();

    await act(async () => {
      simulateSwipe(container, result.current.swipeProps, {
        startX: 200,
        startY: 300,
        endX: 350, // deltaX = +150 (right swipe → prev)
        endY: 300,
        duration: 200, // velocity = 150/200 = 0.75 px/ms
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-10');
    expect(result.current.direction).toBe('prev');

    document.body.removeChild(container);
  });

  it('triggers goToNext on left swipe (large deltaX negative, fast)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const container = getContainer();

    await act(async () => {
      simulateSwipe(container, result.current.swipeProps, {
        startX: 300,
        startY: 300,
        endX: 150, // deltaX = -150 (left swipe → next)
        endY: 300,
        duration: 200, // velocity = 150/200 = 0.75 px/ms
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-12');
    expect(result.current.direction).toBe('next');

    document.body.removeChild(container);
  });

  it('does NOT navigate on short swipe (below 80px threshold)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const container = getContainer();

    await act(async () => {
      simulateSwipe(container, result.current.swipeProps, {
        startX: 200,
        startY: 300,
        endX: 230, // deltaX = +30 (below 80px threshold)
        endY: 300,
        duration: 50,
      });
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');

    document.body.removeChild(container);
  });

  it('does NOT navigate on slow swipe (below velocity threshold)', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const container = getContainer();

    await act(async () => {
      simulateSwipe(container, result.current.swipeProps, {
        startX: 200,
        startY: 300,
        endX: 350, // deltaX = +150
        endY: 300,
        duration: 1000, // velocity = 150/1000 = 0.15 px/ms (below 0.5)
      });
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');

    document.body.removeChild(container);
  });

  it('does NOT navigate when swipe starts on editable target', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const container = getContainer();
    const input = document.createElement('input');
    input.type = 'text';
    container.appendChild(input);

    await act(async () => {
      const pointerId = 1;
      const downEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId,
        clientX: 200,
        clientY: 300,
      });
      // Simulate event.target being the input
      Object.defineProperty(downEvent, 'target', { value: input });
      Object.defineProperty(downEvent, 'currentTarget', { value: container });
      result.current.swipeProps.onPointerDown?.(
        downEvent as unknown as React.PointerEvent<HTMLElement>,
      );

      jest.advanceTimersByTime(200);

      const upEvent = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId,
        clientX: 350,
        clientY: 300,
      });
      result.current.swipeProps.onPointerUp?.(
        upEvent as unknown as React.PointerEvent<HTMLElement>,
      );

      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');

    document.body.removeChild(container);
  });

  it('logs error and leaves date unchanged when onBeforeChange rejects via swipe', async () => {
    const onBeforeChange = jest.fn().mockRejectedValue(new Error('flush failed'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() =>
      usePageNavigation({ initialDate: '2026-05-11', onBeforeChange }),
    );

    const container = getContainer();

    await act(async () => {
      simulateSwipe(container, result.current.swipeProps, {
        startX: 300,
        startY: 300,
        endX: 180, // deltaX = -120 (left swipe → next)
        endY: 300,
        duration: 200, // velocity = 120/200 = 0.6 px/ms (above 0.5 threshold)
      });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('swipe nav failed'),
      expect.any(Error),
    );

    errorSpy.mockRestore();
    document.body.removeChild(container);
  });

  it('resets tracking on pointercancel', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const container = getContainer();

    await act(async () => {
      const pointerId = 1;
      // Start swipe
      const downEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        pointerId,
        clientX: 200,
        clientY: 300,
      });
      Object.defineProperty(downEvent, 'currentTarget', { value: container });
      result.current.swipeProps.onPointerDown?.(
        downEvent as unknown as React.PointerEvent<HTMLElement>,
      );

      // Cancel
      const cancelEvent = new PointerEvent('pointercancel', {
        bubbles: true,
        pointerId,
        clientX: 400,
        clientY: 300,
      });
      result.current.swipeProps.onPointerCancel?.(
        cancelEvent as unknown as React.PointerEvent<HTMLElement>,
      );

      jest.advanceTimersByTime(200);

      // Up after cancel — should NOT navigate
      const upEvent = new PointerEvent('pointerup', {
        bubbles: true,
        pointerId,
        clientX: 400,
        clientY: 300,
      });
      result.current.swipeProps.onPointerUp?.(
        upEvent as unknown as React.PointerEvent<HTMLElement>,
      );

      await Promise.resolve();
    });

    expect(result.current.date).toBe('2026-05-11');

    document.body.removeChild(container);
  });
});

// ─── isAnimating guard (L2-NEW-1) ─────────────────────────────────────────────
// These tests prove that the early-return in applyTransition (isAnimatingRef.current)
// drops the second navigation attempt. Each test would FAIL if the guard were removed.

describe('usePageNavigation — isAnimating guard drops concurrent nav (L2-NEW-1)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    document.body.innerHTML = '';
  });

  /**
   * L2-NEW-1a: drops second goToNext while isAnimating.
   * Call goToNext twice without advancing the timer — the second call must be
   * silently dropped so date stops at the FIRST target (2026-05-12), not the second.
   */
  it('drops second goToNext while isAnimating — date stays at first target', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    // First navigation — sets isAnimating=true; timer does NOT fire yet.
    await act(async () => {
      await result.current.goToNext();
    });

    // Verify: isAnimating is true, date is first target.
    expect(result.current.isAnimating).toBe(true);
    expect(result.current.date).toBe('2026-05-12');

    // Second navigation attempt while animation is still in flight.
    // applyTransition must early-return because isAnimatingRef.current === true.
    await act(async () => {
      await result.current.goToNext();
    });

    // Date MUST still be the first target — second nav was dropped.
    // If the guard were absent, date would be '2026-05-13'.
    expect(result.current.date).toBe('2026-05-12');
  });

  /**
   * L2-NEW-1b: keyboard Cmd+ArrowRight ignored during animation.
   * Dispatch Cmd+ArrowRight once (nav fires), advance time only partially
   * so isAnimating stays true, then dispatch again — date must not move further.
   */
  it('keyboard Cmd+ArrowRight ignored while isAnimating — date stays at first target', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    // First keyboard nav — moves to next day, starts animation.
    await act(async () => {
      dispatchKeydown('ArrowRight', { metaKey: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isAnimating).toBe(true);
    expect(result.current.date).toBe('2026-05-12');

    // Advance time by less than ANIMATION_DURATION_MS so animation keeps running.
    act(() => {
      jest.advanceTimersByTime(ANIMATION_DURATION_MS - 50);
    });
    expect(result.current.isAnimating).toBe(true);

    // Second keyboard nav while animation in flight — must be dropped.
    await act(async () => {
      dispatchKeydown('ArrowRight', { metaKey: true });
      await Promise.resolve();
      await Promise.resolve();
    });

    // Date must NOT advance to '2026-05-13'.
    expect(result.current.date).toBe('2026-05-12');
  });

  /**
   * L2-NEW-1c: swipe gesture ignored during animation.
   * Execute a valid swipe (first nav), then immediately perform another valid swipe
   * while animation is still in flight — date must not move further.
   */
  it('swipe gesture ignored while isAnimating — date stays at first target', async () => {
    const { result } = renderHook(() => usePageNavigation({ initialDate: '2026-05-11' }));

    const container = document.createElement('div');
    document.body.appendChild(container);
    container.setPointerCapture = jest.fn();
    container.releasePointerCapture = jest.fn();

    // Helper to fire a swipe gesture via swipeProps directly.
    function fireLeftSwipe(swipeProps: React.HTMLAttributes<HTMLElement>) {
      const pointerId = 1;
      const downEvent = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        pointerId,
        clientX: 300,
        clientY: 300,
      });
      Object.defineProperty(downEvent, 'currentTarget', { value: container });
      swipeProps.onPointerDown?.(downEvent as unknown as React.PointerEvent<HTMLElement>);

      const moveEvent = new PointerEvent('pointermove', {
        bubbles: true,
        cancelable: true,
        pointerId,
        clientX: 150, // deltaX = -150 → left swipe → goToNext
        clientY: 300,
      });
      swipeProps.onPointerMove?.(moveEvent as unknown as React.PointerEvent<HTMLElement>);

      jest.advanceTimersByTime(200); // duration 200ms → velocity 0.75 px/ms > 0.5 threshold

      const upEvent = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        pointerId,
        clientX: 150,
        clientY: 300,
      });
      swipeProps.onPointerUp?.(upEvent as unknown as React.PointerEvent<HTMLElement>);
    }

    // First swipe — triggers goToNext, sets isAnimating=true.
    await act(async () => {
      fireLeftSwipe(result.current.swipeProps);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.isAnimating).toBe(true);
    expect(result.current.date).toBe('2026-05-12');

    // Second swipe while animation in flight — goToNext → applyTransition guard fires.
    await act(async () => {
      fireLeftSwipe(result.current.swipeProps);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Date MUST remain at first target — second swipe was dropped.
    expect(result.current.date).toBe('2026-05-12');

    document.body.removeChild(container);
  });
});
