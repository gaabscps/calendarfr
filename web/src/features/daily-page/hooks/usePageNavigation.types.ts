/**
 * Public types and constants for usePageNavigation.
 *
 * Extracted to a separate module to keep usePageNavigation.ts ≤ 250 lines
 * (inviolable rule #6).
 */

import { type HTMLAttributes } from 'react';

// ─── Public constants ─────────────────────────────────────────────────────────

/** Duration in ms for the page-turn animation. isAnimating stays true for this window. */
export const ANIMATION_DURATION_MS = 300;

/**
 * ARIA key shortcut strings for screen reader discovery (AC-016).
 * BATCH-D exposes these via aria-keyshortcuts on the nav container.
 */
export const KEYBOARD_SHORTCUTS = {
  prev: 'Control+ArrowLeft Meta+ArrowLeft',
  next: 'Control+ArrowRight Meta+ArrowRight',
} as const;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface UsePageNavigationOptions {
  /** Starting date in YYYY-MM-DD format. */
  initialDate: string;
  /**
   * Called and awaited BEFORE the date state is applied.
   * BATCH-C passes flushSavePending here to flush any pending autosave
   * for the outgoing day before the new day's GET is initiated. (AC-020)
   */
  onBeforeChange?: () => void | Promise<void>;
}

export interface UsePageNavigationReturn {
  /** Current date in YYYY-MM-DD. */
  date: string;
  /**
   * Last navigation direction. null on first mount (no nav has happened).
   * Stays as last direction after animation completes — DayLayer uses it to
   * determine slide direction for in/out animation.
   */
  direction: 'prev' | 'next' | null;
  /** True for ANIMATION_DURATION_MS after a date change. */
  isAnimating: boolean;
  /** Navigate to previous day. Awaits onBeforeChange first. */
  goToPrev: () => Promise<void>;
  /** Navigate to next day. Awaits onBeforeChange first. */
  goToNext: () => Promise<void>;
  /**
   * Navigate to an explicit date. Throws if format is not YYYY-MM-DD.
   * Direction: 'next' if next > current, 'prev' if next < current, no-op if equal.
   * Awaits onBeforeChange first (skipped on same-date no-op).
   */
  goToDate: (next: string) => Promise<void>;
  /**
   * Spread onto the scrollable container for swipe gesture detection.
   * Includes: onPointerDown, onPointerMove, onPointerUp, onPointerCancel.
   */
  swipeProps: HTMLAttributes<HTMLElement>;
}
