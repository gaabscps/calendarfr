/**
 * Branch coverage tests for useReducedMotion — matchMedia guard paths.
 *
 * The branches at lines 27/34 (SSR guard: typeof window === 'undefined') are
 * unreachable in jsdom and are intentionally not tested here.
 *
 * The branch at line 39 (typeof window.matchMedia !== 'function') is also
 * unreachable in isolation because the useState initializer at line 29 calls
 * window.matchMedia first (without the guard), so setting matchMedia to a
 * non-function causes a crash before the useEffect guard can run.
 *
 * These tests instead cover the full lifecycle paths that are actually testable:
 * - Fresh mount with matchMedia present (normal path)
 * - matchMedia returning false (initial false)
 * - matchMedia returning true (initial true)
 * - cleanup on unmount (removeEventListener called)
 *
 * The SSR/missing-matchMedia branches (lines 27, 34, 39) require an environment
 * where window.matchMedia is absent at useEffect time but present at useState time —
 * a timing gap impossible to create reliably in jsdom.
 */

import { renderHook, act } from '@testing-library/react';

import { useReducedMotion } from '../useReducedMotion.js';

type ChangeListener = (_event: { matches: boolean }) => void;

function makeMatchMediaMock(initialMatches: boolean) {
  let currentMatches = initialMatches;
  const listeners: ChangeListener[] = [];

  return {
    get matches() {
      return currentMatches;
    },
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
}

describe('useReducedMotion — additional lifecycle coverage', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: originalMatchMedia,
    });
  });

  it('initializes to false and responds to change event → true', () => {
    const mql = makeMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (_query: string) => mql,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mql._fire(true);
    });

    expect(result.current).toBe(true);
  });

  it('initializes to true and responds to change event → false', () => {
    const mql = makeMatchMediaMock(true);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (_query: string) => mql,
    });

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);

    act(() => {
      mql._fire(false);
    });

    expect(result.current).toBe(false);
  });

  it('removes listener on unmount preventing memory leak', () => {
    const mql = makeMatchMediaMock(false);
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (_query: string) => mql,
    });

    const { unmount } = renderHook(() => useReducedMotion());
    expect(mql._listenerCount).toBe(1);

    unmount();
    expect(mql._listenerCount).toBe(0);
  });

  it('registers the listener exactly once on mount', () => {
    const mql = makeMatchMediaMock(false);
    const addListenerSpy = jest.spyOn(mql, 'addEventListener');

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (_query: string) => mql,
    });

    renderHook(() => useReducedMotion());
    expect(addListenerSpy).toHaveBeenCalledTimes(1);
    expect(addListenerSpy).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('queries the correct media string for prefers-reduced-motion', () => {
    const capturedQueries: string[] = [];
    const mql = makeMatchMediaMock(false);

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: (query: string) => {
        capturedQueries.push(query);
        return mql;
      },
    });

    renderHook(() => useReducedMotion());
    expect(capturedQueries).toContain('(prefers-reduced-motion: reduce)');
  });
});
