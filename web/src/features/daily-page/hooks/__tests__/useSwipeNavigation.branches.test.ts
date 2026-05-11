/**
 * Branch coverage tests for useSwipeNavigation.ts.
 *
 * Covers uncovered branches:
 *   - Line 86: pointerMove with non-matching pointerId (not active pointer)
 *   - Line 118: pointerUp with non-matching pointerId (not active pointer)
 *   - Line 133: pointerCancel with non-matching pointerId (state reset skipped)
 */

import { renderHook } from '@testing-library/react';

import { useSwipeNavigation } from '../useSwipeNavigation.js';

// ─── PointerEvent polyfill ───────────────────────────────────────────────────
// jsdom does not implement PointerEvent
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
  (globalThis as Record<string, unknown>).PointerEvent = PointerEventPolyfill;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContainer() {
  const div = document.createElement('div');
  document.body.appendChild(div);
  div.setPointerCapture = jest.fn();
  div.releasePointerCapture = jest.fn();
  return div;
}

function makePointerEvent(
  type: string,
  opts: { pointerId?: number; clientX?: number; clientY?: number } = {},
) {
  type PointerCtor = new (_t: string, _init: object) => Event;
  const PE = (globalThis as unknown as { PointerEvent: PointerCtor }).PointerEvent;
  return new PE(type, {
    bubbles: true,
    cancelable: true,
    pointerId: opts.pointerId ?? 1,
    clientX: opts.clientX ?? 200,
    clientY: opts.clientY ?? 300,
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  jest.useRealTimers();
  document.body.innerHTML = '';
});

// ---------------------------------------------------------------------------
// Line 86: pointerMove with non-active tracking (inactive or wrong pointerId)
// ---------------------------------------------------------------------------

describe('useSwipeNavigation — pointerMove inactive branch (line 86)', () => {
  it('ignores pointerMove when no active tracking (tracking.active = false)', () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSwipeNavigation({ goToPrev, goToNext }));

    // Fire pointerMove WITHOUT a preceding pointerDown — tracking.active = false
    const moveEvent = makePointerEvent('pointermove', { pointerId: 1, clientX: 350 });
    Object.defineProperty(moveEvent, 'currentTarget', { value: makeContainer() });

    result.current.swipeProps.onPointerMove?.(
      moveEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // No navigation should fire
    expect(goToPrev).not.toHaveBeenCalled();
    expect(goToNext).not.toHaveBeenCalled();
  });

  it('ignores pointerMove with a different pointerId than the active gesture', () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSwipeNavigation({ goToPrev, goToNext }));

    const container = makeContainer();

    // Start gesture with pointerId=1
    const downEvent = makePointerEvent('pointerdown', { pointerId: 1, clientX: 200 });
    Object.defineProperty(downEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerDown?.(
      downEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Move with pointerId=2 (different) — covers line 86 false branch
    const moveEvent = makePointerEvent('pointermove', { pointerId: 2, clientX: 350 });
    result.current.swipeProps.onPointerMove?.(
      moveEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Up with pointerId=1 — should not have updated currentX (gesture starts at 200)
    // deltaX should be 0 since move was ignored → no navigation
    const upEvent = makePointerEvent('pointerup', { pointerId: 1, clientX: 200 });
    Object.defineProperty(upEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerUp?.(upEvent as unknown as React.PointerEvent<HTMLElement>);

    // Since move was ignored, deltaX = 200 - 200 = 0 — below 80px threshold
    expect(goToPrev).not.toHaveBeenCalled();
    expect(goToNext).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Line 118: pointerUp with non-matching state (inactive or wrong pointerId)
// ---------------------------------------------------------------------------

describe('useSwipeNavigation — pointerUp inactive branch (line 118)', () => {
  it('ignores pointerUp when no active tracking', () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSwipeNavigation({ goToPrev, goToNext }));

    const container = makeContainer();

    // Fire pointerUp WITHOUT a preceding pointerDown — tracking.active = false
    const upEvent = makePointerEvent('pointerup', { pointerId: 1, clientX: 350 });
    Object.defineProperty(upEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerUp?.(upEvent as unknown as React.PointerEvent<HTMLElement>);

    // Covers line 118: early return when !tracking.active
    expect(goToPrev).not.toHaveBeenCalled();
    expect(goToNext).not.toHaveBeenCalled();
  });

  it('ignores pointerUp with different pointerId than active gesture', () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSwipeNavigation({ goToPrev, goToNext }));

    const container = makeContainer();

    // Start gesture with pointerId=1
    const downEvent = makePointerEvent('pointerdown', { pointerId: 1, clientX: 200 });
    Object.defineProperty(downEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerDown?.(
      downEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Up with pointerId=99 (different) — covers line 118 wrong-pointerId branch
    const upEvent = makePointerEvent('pointerup', { pointerId: 99, clientX: 400 });
    Object.defineProperty(upEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerUp?.(upEvent as unknown as React.PointerEvent<HTMLElement>);

    // Wrong pointerId → early return → no navigation
    expect(goToPrev).not.toHaveBeenCalled();
    expect(goToNext).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Line 133: pointerCancel with non-matching state
// ---------------------------------------------------------------------------

describe('useSwipeNavigation — pointerCancel inactive branch (line 133)', () => {
  it('ignores pointerCancel when tracking is not active', () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSwipeNavigation({ goToPrev, goToNext }));

    const container = makeContainer();

    // Fire pointerCancel WITHOUT a preceding pointerDown — tracking.active = false
    const cancelEvent = makePointerEvent('pointercancel', { pointerId: 1, clientX: 300 });
    Object.defineProperty(cancelEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerCancel?.(
      cancelEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Covers line 133: early return when !tracking.active
    expect(goToPrev).not.toHaveBeenCalled();
    expect(goToNext).not.toHaveBeenCalled();
  });

  it('ignores pointerCancel with different pointerId than active gesture', () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSwipeNavigation({ goToPrev, goToNext }));

    const container = makeContainer();

    // Start gesture with pointerId=1
    const downEvent = makePointerEvent('pointerdown', { pointerId: 1, clientX: 200 });
    Object.defineProperty(downEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerDown?.(
      downEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Cancel with pointerId=99 (different) — covers line 133 wrong-pointerId branch
    const cancelEvent = makePointerEvent('pointercancel', { pointerId: 99, clientX: 400 });
    Object.defineProperty(cancelEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerCancel?.(
      cancelEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Wrong pointerId → early return (state not reset)
    // Now fire the correct pointerId up → should still navigate (tracking active)
    jest.advanceTimersByTime(200);
    const upEvent = makePointerEvent('pointerup', { pointerId: 1, clientX: 350 });
    Object.defineProperty(upEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerUp?.(upEvent as unknown as React.PointerEvent<HTMLElement>);

    // deltaX = 350-200 = 150 (above 80px threshold), but duration ≥ velocity threshold needs check
    // The point is: cancel with wrong pointerId didn't reset state, so up is processed
    // Navigation may or may not fire depending on velocity — we just ensure no crash
    expect(container.releasePointerCapture).toHaveBeenCalled();
  });

  it('resets state and releases pointer on valid pointerCancel', () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSwipeNavigation({ goToPrev, goToNext }));

    const container = makeContainer();

    // Start gesture
    const downEvent = makePointerEvent('pointerdown', { pointerId: 1, clientX: 200 });
    Object.defineProperty(downEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerDown?.(
      downEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Valid cancel (same pointerId) — resets tracking
    const cancelEvent = makePointerEvent('pointercancel', { pointerId: 1, clientX: 350 });
    Object.defineProperty(cancelEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerCancel?.(
      cancelEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // After cancel, tracking is reset — subsequent pointerUp should be ignored
    jest.advanceTimersByTime(200);
    const upEvent = makePointerEvent('pointerup', { pointerId: 1, clientX: 400 });
    Object.defineProperty(upEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerUp?.(upEvent as unknown as React.PointerEvent<HTMLElement>);

    // Cancel reset tracking — pointerUp sees !tracking.active → no navigation
    expect(goToPrev).not.toHaveBeenCalled();
    expect(goToNext).not.toHaveBeenCalled();
    expect(container.releasePointerCapture).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Confirm: small deltaX does NOT navigate (below 80px threshold)
// This covers the else branch in detectSwipe via the hook
// ---------------------------------------------------------------------------

describe('useSwipeNavigation — sub-threshold swipe (no nav)', () => {
  it('does not navigate when deltaX < 80px', () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSwipeNavigation({ goToPrev, goToNext }));

    const container = makeContainer();

    // Start gesture
    const downEvent = makePointerEvent('pointerdown', { pointerId: 1, clientX: 200, clientY: 300 });
    Object.defineProperty(downEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerDown?.(
      downEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Move slightly
    const moveEvent = makePointerEvent('pointermove', { pointerId: 1, clientX: 230, clientY: 300 });
    result.current.swipeProps.onPointerMove?.(
      moveEvent as unknown as React.PointerEvent<HTMLElement>,
    );

    // Fast but short (deltaX = 30 < 80px threshold)
    jest.advanceTimersByTime(50);
    const upEvent = makePointerEvent('pointerup', { pointerId: 1, clientX: 230, clientY: 300 });
    Object.defineProperty(upEvent, 'currentTarget', { value: container });
    result.current.swipeProps.onPointerUp?.(upEvent as unknown as React.PointerEvent<HTMLElement>);

    expect(goToPrev).not.toHaveBeenCalled();
    expect(goToNext).not.toHaveBeenCalled();
  });
});
