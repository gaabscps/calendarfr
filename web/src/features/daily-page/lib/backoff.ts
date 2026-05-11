/**
 * Exponential backoff with jitter for save retry.
 *
 * Policy (per spec AC-025 and AWS Architecture Blog canon):
 *   - Base delay doubles each attempt: 200ms → 800ms → 3200ms
 *   - Jitter: ±20% randomness on the base delay
 *   - attempt 0 → 200ms ± 40ms  (range: 160–240)
 *   - attempt 1 → 800ms ± 160ms (range: 640–960)
 *   - attempt 2 → 3200ms ± 640ms (range: 2560–3840)
 *
 * Covers: AC-025 (retry backoff factor 4 with jitter).
 */

const BASE_DELAY_MS = 200;
const BACKOFF_FACTOR = 4;
const JITTER_FRACTION = 0.2; // ±20%

/**
 * Computes the delay (in ms) before retry attempt `attempt` (0-indexed).
 * Applies ±20% jitter to avoid thundering herd when many clients retry.
 *
 * `attempt` is clamped to [0, 2] defensively. The retry caller only passes
 * 0, 1, or 2, but out-of-range values are silently clamped rather than
 * allowing unbounded exponential growth.
 */
export function computeBackoffDelay(attempt: number): number {
  const clamped = Math.max(0, Math.min(2, attempt));
  const base = BASE_DELAY_MS * Math.pow(BACKOFF_FACTOR, clamped);
  const jitter = base * JITTER_FRACTION * (2 * Math.random() - 1);
  return Math.round(base + jitter);
}
