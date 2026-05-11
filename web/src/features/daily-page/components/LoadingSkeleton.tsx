/**
 * LoadingSkeleton — minimal loading placeholder shown while GET is in-flight.
 *
 * Intentionally simple: a text "Carregando…" with a visually-hidden accessible
 * label. Not a complex shimmer UI — over-engineering this adds no user value
 * given the companion responds in < 50ms locally.
 *
 * Covers: AC-002 (shows skeleton while loading, not empty 4-features).
 */

import styles from './LoadingSkeleton.module.css';

export function LoadingSkeleton() {
  return (
    <div
      className={styles.skeleton}
      data-testid="loading-skeleton"
      role="status"
      aria-label="Carregando…"
      aria-live="polite"
    >
      <span className={styles.text} aria-hidden="true">
        Carregando…
      </span>
    </div>
  );
}
