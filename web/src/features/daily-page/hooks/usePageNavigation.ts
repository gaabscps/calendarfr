/**
 * Hook that manages daily-page navigation state: current date, direction,
 * animation timing, keyboard shortcuts, and swipe gesture handling.
 *
 * Design decisions:
 * - onBeforeChange is awaited BEFORE applying the date state change.
 *   This ensures the caller (BATCH-C useDailyPage) can flush any pending
 *   save for the outgoing day before the new day loads (race protection AC-020).
 * - direction in goToDate: 'next' if newDate > currentDate, 'prev' if <, no-op if equal.
 * - goToDate with invalid format throws immediately (defensive; caller must supply YYYY-MM-DD).
 * - Keyboard: both Meta (Mac) and Ctrl (Win/Linux) accepted on all platforms.
 * - Swipe: pointer capture ensures move events keep firing even if pointer leaves element.
 *   Swipe handler logic is extracted to useSwipeNavigation (file size rule, FEAT-012 L2).
 *
 * Covers: AC-013–AC-020 (partial), AC-035 (animation flag consumed by BATCH-D/useReducedMotion).
 */

import { useState, useEffect, useRef, useCallback } from 'react';

import { addDays } from '../lib/dateMath.js';
import { isEditableTarget } from '../lib/isEditableTarget.js';

import {
  ANIMATION_DURATION_MS,
  KEYBOARD_SHORTCUTS,
  type UsePageNavigationOptions,
  type UsePageNavigationReturn,
} from './usePageNavigation.types.js';
import { useSwipeNavigation } from './useSwipeNavigation.js';

// Re-export constants + types so callers keep the same import surface.
export { ANIMATION_DURATION_MS, KEYBOARD_SHORTCUTS };
export type { UsePageNavigationOptions, UsePageNavigationReturn };

// ─── Validation ───────────────────────────────────────────────────────────────

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function validateIsoDate(s: string): void {
  if (!ISO_DATE_REGEX.test(s)) {
    throw new Error(`usePageNavigation: invalid date format "${s}". Expected YYYY-MM-DD.`);
  }
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  if (m < 1 || m > 12 || d < 1 || d > 31) {
    throw new Error(`usePageNavigation: invalid date value "${s}".`);
  }
  // Round-trip parse to catch impossible calendar dates (e.g. 2026-02-30).
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    throw new Error(`usePageNavigation: invalid date value "${s}".`);
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePageNavigation(opts: UsePageNavigationOptions): UsePageNavigationReturn {
  const { initialDate, onBeforeChange } = opts;

  const [date, setDate] = useState<string>(initialDate);
  const [direction, setDirection] = useState<'prev' | 'next' | null>(null);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  // Stable ref to avoid stale closure in effects
  const onBeforeChangeRef = useRef(onBeforeChange);
  useEffect(() => {
    onBeforeChangeRef.current = onBeforeChange;
  });

  // Ref to hold the current date for use inside event handlers
  // (avoids stale closure in keydown listener)
  const dateRef = useRef(date);
  useEffect(() => {
    dateRef.current = date;
  });

  // Timer ref for animation cleanup
  const animationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ref mirror of isAnimating so event handlers (keyboard, swipe) can read
  // the current value without a stale closure (L-MAJOR-1 race guard).
  const isAnimatingRef = useRef(false);
  useEffect(() => {
    isAnimatingRef.current = isAnimating;
  });

  // ─── Core navigation ────────────────────────────────────────────────────────

  /**
   * Shared transition logic:
   * 0. Early-return if animation is already in progress (L-MAJOR-1 race guard).
   *    Keyboard and swipe handlers all go through here, so the guard is central.
   * 1. Await onBeforeChange (flush pending save for outgoing day)
   * 2. Apply new date + direction to state
   * 3. Start animation, clear previous timer
   * 4. Set isAnimating=false after ANIMATION_DURATION_MS
   */
  const applyTransition = useCallback(
    async (nextDate: string, nextDirection: 'prev' | 'next') => {
      // L-MAJOR-1: guard — if an animation is already running, drop the input.
      // This prevents keyboard/swipe from corrupting the two-layer state mid-flight.
      if (isAnimatingRef.current) {
        return;
      }

      // Flush pending save before applying state change (race protection AC-020)
      await onBeforeChangeRef.current?.();

      // Clear any existing animation timer
      if (animationTimerRef.current !== null) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }

      // Apply state changes
      setDate(nextDate);
      setDirection(nextDirection);
      setIsAnimating(true);

      // Schedule animation end
      animationTimerRef.current = setTimeout(() => {
        setIsAnimating(false);
        animationTimerRef.current = null;
      }, ANIMATION_DURATION_MS);
    },
    [], // onBeforeChangeRef is stable (it's a ref)
  );

  const goToPrev = useCallback(async () => {
    const nextDate = addDays(dateRef.current, -1);
    await applyTransition(nextDate, 'prev');
  }, [applyTransition]);

  const goToNext = useCallback(async () => {
    const nextDate = addDays(dateRef.current, +1);
    await applyTransition(nextDate, 'next');
  }, [applyTransition]);

  const goToDate = useCallback(
    async (next: string) => {
      validateIsoDate(next);
      const current = dateRef.current;
      if (next === current) {
        // Same date — no-op; do NOT call onBeforeChange
        return;
      }
      const nextDirection: 'prev' | 'next' = next > current ? 'next' : 'prev';
      await applyTransition(next, nextDirection);
    },
    [applyTransition],
  );

  // ─── Keyboard listener ───────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeydown = async (e: KeyboardEvent) => {
      // Only fire on Cmd or Ctrl
      if (!e.metaKey && !e.ctrlKey) {
        return;
      }

      // Skip if focus is inside an editable element (AC-015)
      if (isEditableTarget(document.activeElement)) {
        return;
      }

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        await goToPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        await goToNext();
      }
    };

    // Wrap async handler: errors are logged, not silently swallowed.
    const voidHandler = (e: KeyboardEvent): void => {
      handleKeydown(e).catch((err: unknown) => {
        console.error('[usePageNavigation] keyboard nav failed:', err);
      });
    };

    document.addEventListener('keydown', voidHandler);
    return () => {
      document.removeEventListener('keydown', voidHandler);
    };
  }, [goToPrev, goToNext]);

  // ─── Animation timer cleanup on unmount ─────────────────────────────────────

  useEffect(() => {
    return () => {
      if (animationTimerRef.current !== null) {
        clearTimeout(animationTimerRef.current);
        animationTimerRef.current = null;
      }
    };
  }, []);

  // ─── Swipe props (extracted to useSwipeNavigation) ───────────────────────────

  const { swipeProps } = useSwipeNavigation({ goToPrev, goToNext });

  return {
    date,
    direction,
    isAnimating,
    goToPrev,
    goToNext,
    goToDate,
    swipeProps,
  };
}
