/**
 * Pure function for detecting horizontal swipe gestures from Pointer Events.
 *
 * Implements the three-gate threshold pattern (distance, velocity, horizontal dominance)
 * used by iOS UIPanGestureRecognizer and Hammer.js to avoid accidental triggers.
 *
 * No DOM or React dependencies — safe to unit test without a browser environment.
 *
 * Covers: AC-017 (swipe threshold matrix), AC-018 (directional mapping).
 */

/** Minimum horizontal travel distance in pixels. */
export const SWIPE_MIN_DISTANCE_PX = 80;

/** Minimum horizontal velocity in px/ms. */
export const SWIPE_MIN_VELOCITY = 0.5;

/**
 * |deltaX| must be at least SWIPE_VERTICAL_RATIO times |deltaY|.
 * Ensures the gesture is predominantly horizontal (not diagonal or vertical).
 */
export const SWIPE_VERTICAL_RATIO = 2;

export interface SwipeInput {
  /** Horizontal displacement: positive = rightward, negative = leftward. */
  deltaX: number;
  /** Vertical displacement. */
  deltaY: number;
  /** Elapsed time in ms between pointerdown and pointerup. */
  duration: number;
}

/**
 * Direction result:
 * - 'prev': swipe right (finger moved right, revealing previous day) — deltaX > 0
 * - 'next': swipe left  (finger moved left, advancing to next day)   — deltaX < 0
 * - null:   gesture did not pass all three thresholds
 */
export type SwipeResult = 'prev' | 'next' | null;

/**
 * Classifies a Pointer Events gesture as a navigation intent or null.
 *
 * All three conditions must hold:
 * 1. |deltaX| >= SWIPE_MIN_DISTANCE_PX (distance gate)
 * 2. |deltaX| / duration >= SWIPE_MIN_VELOCITY (velocity gate)
 * 3. |deltaX| >= SWIPE_VERTICAL_RATIO * |deltaY| (horizontal dominance gate)
 *
 * Defensive: returns null for zero or negative duration (avoids Infinity/NaN
 * from division by zero).
 */
export function detectSwipe(input: SwipeInput): SwipeResult {
  const { deltaX, deltaY, duration } = input;

  // Defensive: invalid timing
  if (duration <= 0) {
    return null;
  }

  const absDx = Math.abs(deltaX);
  const absDy = Math.abs(deltaY);

  // Gate 1: distance threshold
  if (absDx < SWIPE_MIN_DISTANCE_PX) {
    return null;
  }

  // Gate 2: velocity threshold
  const velocity = absDx / duration;
  if (velocity < SWIPE_MIN_VELOCITY) {
    return null;
  }

  // Gate 3: horizontal dominance — |dx| must be >= 2 * |dy|
  if (absDx < SWIPE_VERTICAL_RATIO * absDy) {
    return null;
  }

  // Direction: positive deltaX = rightward swipe → 'prev' (user goes back)
  //            negative deltaX = leftward swipe  → 'next' (user advances)
  return deltaX > 0 ? 'prev' : 'next';
}
