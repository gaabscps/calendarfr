/**
 * Unit tests for useReducedMotion.ts
 *
 * Covers: AC-035 (prefers-reduced-motion honored via matchMedia).
 *
 * jsdom does not implement window.matchMedia, so we provide a manual mock
 * that returns configurable matches and exposes the listener so we can
 * simulate system preference changes.
 */

import { renderHook, act } from '@testing-library/react';

import { useReducedMotion } from '../useReducedMotion.js';

// ─── matchMedia mock factory ─────────────────────────────────────────────────

type ChangeListener = (_event: { matches: boolean }) => void;

function makeMatchMediaMock(initialMatches: boolean) {
  let currentMatches = initialMatches;
  const listeners: ChangeListener[] = [];

  const mql = {
    get matches() {
      return currentMatches;
    },
    // Simulate system preference change — call registered listeners
    _fire(matches: boolean) {
      currentMatches = matches;
      listeners.forEach((fn) => fn({ matches }));
    },
    addEventListener(_type: string, listener: ChangeListener) {
      listeners.push(listener);
    },
    removeEventListener(_type: string, listener: ChangeListener) {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    },
    get _listenerCount() {
      return listeners.length;
    },
  };

  return mql;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useReducedMotion', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: originalMatchMedia,
    });
  });

  it('returns true when matchMedia matches prefers-reduced-motion', () => {
    const mql = makeMatchMediaMock(true);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (_query: string) => mql,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it('returns false when matchMedia does not match prefers-reduced-motion', () => {
    const mql = makeMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (_query: string) => mql,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it('re-renders with true when system preference changes to reduce', () => {
    const mql = makeMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (_query: string) => mql,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mql._fire(true);
    });

    expect(result.current).toBe(true);
  });

  it('re-renders with false when system preference changes back to no-preference', () => {
    const mql = makeMatchMediaMock(true);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (_query: string) => mql,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);

    act(() => {
      mql._fire(false);
    });

    expect(result.current).toBe(false);
  });

  it('removes the change listener on unmount (no memory leak)', () => {
    const mql = makeMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (_query: string) => mql,
    });

    const { unmount } = renderHook(() => useReducedMotion());
    expect(mql._listenerCount).toBe(1);

    unmount();
    expect(mql._listenerCount).toBe(0);
  });

  it('queries with the correct media string', () => {
    const queries: string[] = [];
    const mql = makeMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => {
        queries.push(query);
        return mql;
      },
    });

    renderHook(() => useReducedMotion());
    expect(queries).toContain('(prefers-reduced-motion: reduce)');
  });
});
