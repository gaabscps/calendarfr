/**
 * useSwipeNavigation — extracted swipe/pointer-event handler logic.
 *
 * Responsible for:
 * - Tracking pointer gesture lifecycle (down/move/up/cancel) via a mutable ref.
 * - Computing deltaX/deltaY/duration at pointerup and delegating to detectSwipe.
 * - Calling goToPrev / goToNext based on the classification result.
 * - Guarding against editable targets (AC-018).
 *
 * Returns `swipeProps` (HTMLAttributes<HTMLElement>) to be spread onto the
 * scrollable container by the caller.
 *
 * Covers: AC-017 (swipe threshold matrix integration), AC-018 (swipe guard).
 */

import { useRef, useCallback, type HTMLAttributes } from 'react';

import { isEditableTarget } from '../lib/isEditableTarget.js';
import { detectSwipe } from '../lib/swipeDetector.js';

// ─── Swipe tracking state (mutable ref — no re-render needed) ─────────────────

interface SwipeTracking {
  active: boolean;
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
}

function makeInitialTracking(): SwipeTracking {
  return {
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    startTime: 0,
    currentX: 0,
    currentY: 0,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseSwipeNavigationOptions {
  goToPrev: () => Promise<void>;
  goToNext: () => Promise<void>;
}

export interface UseSwipeNavigationReturn {
  swipeProps: HTMLAttributes<HTMLElement>;
}

export function useSwipeNavigation({
  goToPrev,
  goToNext,
}: UseSwipeNavigationOptions): UseSwipeNavigationReturn {
  const swipeTrackingRef = useRef<SwipeTracking>(makeInitialTracking());

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLElement>) => {
    // AC-018: do not start tracking if gesture begins in editable element
    if (isEditableTarget(e.target)) {
      return;
    }
    // Skip capture for interactive elements so their onClick handlers fire normally.
    // setPointerCapture would redirect pointerup to this container, causing click
    // to be dispatched here instead of on the button/checkbox/link.
    if (
      e.target instanceof Element &&
      e.target.closest('button, a, input, select, label, [role="button"]')
    ) {
      return;
    }

    // Capture pointer so move/up still fire even if pointer leaves the element
    e.currentTarget.setPointerCapture(e.pointerId);

    const now = performance.now();
    swipeTrackingRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startTime: now,
      currentX: e.clientX,
      currentY: e.clientY,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const tracking = swipeTrackingRef.current;
    if (!tracking.active || e.pointerId !== tracking.pointerId) {
      return;
    }
    // Update current position for final computation at pointerup
    tracking.currentX = e.clientX;
    tracking.currentY = e.clientY;
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLElement>) => {
      const tracking = swipeTrackingRef.current;
      if (!tracking.active || e.pointerId !== tracking.pointerId) {
        return;
      }

      // Compute final deltas and duration
      const deltaX = e.clientX - tracking.startX;
      const deltaY = e.clientY - tracking.startY;
      const duration = performance.now() - tracking.startTime;

      // Reset tracking before async navigation to avoid re-entry
      swipeTrackingRef.current = makeInitialTracking();

      // Release pointer capture
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore — pointer may already be released
      }

      const result = detectSwipe({ deltaX, deltaY, duration });
      if (result === 'prev') {
        goToPrev().catch((err: unknown) => {
          console.error('[useSwipeNavigation] swipe nav failed:', err);
        });
      } else if (result === 'next') {
        goToNext().catch((err: unknown) => {
          console.error('[useSwipeNavigation] swipe nav failed:', err);
        });
      }
    },
    [goToPrev, goToNext],
  );

  const onPointerCancel = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const tracking = swipeTrackingRef.current;
    if (!tracking.active || e.pointerId !== tracking.pointerId) {
      return;
    }

    // Reset tracking — gesture is cancelled
    swipeTrackingRef.current = makeInitialTracking();

    // Release pointer capture
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore
    }
  }, []);

  const swipeProps: HTMLAttributes<HTMLElement> = {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };

  return { swipeProps };
}
