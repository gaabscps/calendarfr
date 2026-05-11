/**
 * Hook that returns true when the user prefers reduced motion.
 *
 * Reads the `(prefers-reduced-motion: reduce)` media query and re-renders
 * when the system preference changes (e.g., toggling OS accessibility setting).
 *
 * Covers: AC-035 (prefers-reduced-motion honored), WCAG 2.3.3.
 */

import { useState, useEffect } from 'react';

const MEDIA_QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Returns true if the user has enabled reduced motion in their OS settings,
 * false otherwise.
 *
 * Safe in CSR-only context (no SSR guard needed for this app). If window is
 * not available (SSR hypothetical), returns false conservatively.
 *
 * Registers a 'change' listener on the MediaQueryList using the modern
 * addEventListener API and cleans up on unmount.
 */
export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.matchMedia(MEDIA_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    // L-MINOR-5: guard against environments where matchMedia is not available
    // (e.g. jsdom without polyfill, or future SSR context).
    if (typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(MEDIA_QUERY);

    const handleChange = (event: { matches: boolean }) => {
      setPrefersReducedMotion(event.matches);
    };

    mql.addEventListener('change', handleChange);

    return () => {
      mql.removeEventListener('change', handleChange);
    };
  }, []);

  return prefersReducedMotion;
}
