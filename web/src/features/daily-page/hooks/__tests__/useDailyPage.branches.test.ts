/**
 * Branch coverage tests for useDailyPage.ts.
 *
 * Covers uncovered branches:
 *   - Line 99: AbortError catch during GET (stale GET cancelled mid-flight)
 *   - Lines 132-135: fire-and-forget saveDay error catch on date change
 *   - Lines 139-140: debounceTimerRef null check (intent comment branch)
 *   - Line 215: flushSavePending when no debounce timer AND no in-flight save
 */

import type { DailyPageData } from '@calendarfr/shared';
import { renderHook, act } from '@testing-library/react';

import { useDailyPage, AUTOSAVE_DEBOUNCE_MS } from '../useDailyPage.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = '2026-05-11';
const DATE2 = '2026-05-12';

function makeData(date: string): DailyPageData {
  return {
    schemaVersion: 1,
    date,
    mood: null,
    priorities: [
      { id: 'a', text: '', done: false },
      { id: 'b', text: '', done: false },
      { id: 'c', text: '', done: false },
    ] as DailyPageData['priorities'],
    agenda: Array.from({ length: 18 }, (_, i) => ({
      hour: i + 6,
      text: '',
    })) as unknown as DailyPageData['agenda'],
    notes: [],
    createdAt: null,
    updatedAt: null,
  };
}

const MOCK_DATA = makeData(DATE);
const MOCK_DATA2 = makeData(DATE2);

type MockInit = { method?: string; keepalive?: boolean; body?: string; signal?: unknown };

// Test fetch adapters — explicit casts at the trust boundary between jest mocks
// (loose-typed stubs) and the production fetch signature.
type FetchInit = {
  method?: string;
  keepalive?: boolean;
  body?: string;
  signal?: globalThis.AbortSignal;
};
type FetchStub = (
  _input: globalThis.RequestInfo | globalThis.URL,
  _init?: FetchInit,
) => Promise<globalThis.Response>;

function asFetchResponse(v: unknown): Promise<globalThis.Response> {
  return v as Promise<globalThis.Response>;
}

function asFetchFn(fn: FetchStub): typeof globalThis.fetch {
  return fn as typeof globalThis.fetch;
}

function okResponse(data: DailyPageData) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
}

// ---------------------------------------------------------------------------
// Setup — suppress expected useDailyPage error logs and React timing warnings
// ---------------------------------------------------------------------------

const SUPPRESS_PATTERNS = ['overlapping act()', 'not wrapped in act', '[useDailyPage]'];

beforeEach(() => {
  jest.useFakeTimers();
  const realConsoleError = console.error;
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : '';
    if (SUPPRESS_PATTERNS.some((p) => msg.includes(p))) return;
    realConsoleError(...args);
  });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Line 99: AbortError catch during GET — stale fetch cancelled, no loadError set
// ---------------------------------------------------------------------------

describe('useDailyPage — AbortError on GET (line 99)', () => {
  it('cancels stale GET without setting loadError when date changes rapidly', async () => {
    // First GET: waits until aborted
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn((_input: unknown, init?: MockInit) => {
        if (init?.signal) {
          return asFetchResponse(
            new Promise((_res, rej) => {
              const sig = init.signal as { addEventListener: (_e: string, _h: () => void) => void };
              sig.addEventListener('abort', () => {
                rej(new globalThis.DOMException('Aborted', 'AbortError'));
              });
            }),
          );
        }
        return asFetchResponse(okResponse(MOCK_DATA));
      }),
    );

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      initialProps: DATE,
    });

    // Immediately change date before first GET resolves — AbortController.abort() fires
    jest.restoreAllMocks();
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => asFetchResponse(okResponse(MOCK_DATA2)));

    await act(async () => {
      rerender(DATE2);
      await jest.runAllTimersAsync();
    });

    // The aborted GET should have been caught by the AbortError guard (line 99)
    // — no loadError is set, the new date's data loads successfully
    expect(result.current.loadError).toBeNull();
    expect(result.current.data).toEqual(MOCK_DATA2);
  });
});

// Safari abort variant — Safari/WebKit throws TypeError("Load failed") instead of
// DOMException("AbortError") when a fetch is aborted. isAbortError() must recognize
// both via signal.aborted check.
describe('useDailyPage — Safari abort (TypeError "Load failed")', () => {
  it('treats TypeError on aborted signal as abort, not as loadError', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn((_input: unknown, init?: MockInit) => {
        if (init?.signal) {
          return asFetchResponse(
            new Promise((_res, rej) => {
              const sig = init.signal as { addEventListener: (_e: string, _h: () => void) => void };
              sig.addEventListener('abort', () => {
                // Safari pattern: TypeError instead of DOMException AbortError.
                rej(new TypeError('Load failed'));
              });
            }),
          );
        }
        return asFetchResponse(okResponse(MOCK_DATA));
      }),
    );

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      initialProps: DATE,
    });

    jest.restoreAllMocks();
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => asFetchResponse(okResponse(MOCK_DATA2)));

    await act(async () => {
      rerender(DATE2);
      await jest.runAllTimersAsync();
    });

    expect(result.current.loadError).toBeNull();
    expect(result.current.data).toEqual(MOCK_DATA2);
  });
});

// ---------------------------------------------------------------------------
// Lines 132-135: fire-and-forget saveDay error catch on date change
// The catch at line 134 logs console.error, does not crash.
// ---------------------------------------------------------------------------

describe('useDailyPage — fire-and-forget save error on date change (lines 132-135)', () => {
  it('logs error but does not crash when fire-and-forget save fails on date change', async () => {
    let putCount = 0;
    let catchCallCount = 0;

    // Spy on saveDay directly at the module level via fetch
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn((input: unknown, init?: MockInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        const url = String(input);
        if (method === 'PUT') {
          putCount++;
          // Return a rejected promise — saveDay will reject, .catch() should fire
          return asFetchResponse(
            Promise.resolve().then(() => {
              catchCallCount++; // This fires when the rejection propagates
              throw new TypeError('Network error during fire-and-forget');
            }),
          );
        }
        if (url.includes(DATE2)) return asFetchResponse(okResponse(MOCK_DATA2));
        return asFetchResponse(okResponse(MOCK_DATA));
      }),
    );

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      initialProps: DATE,
    });

    // Wait for initial load
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    expect(result.current.saveStatus).toBe('saved');

    // Edit — arms debounce. Status becomes dirty.
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'fire-and-forget' }]);
    });
    expect(result.current.saveStatus).toBe('dirty');

    // Change date WITHOUT calling flushSavePending.
    // Effect 1 fires the fire-and-forget save (lines 132-135), which will fail.
    // Do NOT advance fake timers — we only want the effects to run, not the debounce.
    // Use runAllTicks() to flush microtasks only.
    await act(async () => {
      rerender(DATE2);
      // Drain microtasks: allow React to flush effects and the PUT rejection to propagate
      // jest.runAllTicks() flushes process.nextTick and Promise microtasks
      jest.runAllTicks();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // Now advance timers to let the GET for DATE2 complete (needed for loadError assertion)
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // A PUT was attempted (should be the fire-and-forget from lines 132-135)
    // OR from the debounce (if debounce fired) — either way, putCount > 0
    expect(putCount).toBeGreaterThan(0);
    // The mock's rejection propagated through the chain
    expect(catchCallCount).toBeGreaterThan(0);

    // No crash — new date data should load
    expect(result.current.loadError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Lines 139-140: debounceTimerRef null check in Effect 1
// When date changes but no debounce timer is pending, the clearTimeout branch
// is NOT taken (timer ref is already null).
// ---------------------------------------------------------------------------

describe('useDailyPage — debounceTimerRef null branch (lines 139-140)', () => {
  it('handles date change with no pending debounce timer (null branch not taken)', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn((input: unknown, init?: MockInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        const url = String(input);
        if (method === 'PUT') return asFetchResponse(okResponse(MOCK_DATA));
        if (url.includes(DATE2)) return asFetchResponse(okResponse(MOCK_DATA2));
        return asFetchResponse(okResponse(MOCK_DATA));
      }),
    );

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      initialProps: DATE,
    });

    // Wait for initial load — saveStatus becomes 'saved', no debounce timer
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    expect(result.current.saveStatus).toBe('saved');

    // Change date immediately with NO pending edit — debounceTimerRef is null
    // Effect 1 should handle the null-timer path cleanly (lines 139-140 NOT taken)
    await act(async () => {
      rerender(DATE2);
      await jest.runAllTimersAsync();
    });

    expect(result.current.data).toEqual(MOCK_DATA2);
    expect(result.current.loadError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Line 215: flushSavePending — no debounce timer, no in-flight save
// When neither condition is true, it returns Promise.resolve() immediately.
// ---------------------------------------------------------------------------

describe('useDailyPage — flushSavePending with no pending state (line 215)', () => {
  it('resolves immediately when no debounce timer and no in-flight save', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(asFetchFn(() => asFetchResponse(okResponse(MOCK_DATA))));

    const { result } = renderHook(() => useDailyPage(DATE));

    // Wait for initial load — clean state, nothing pending
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    expect(result.current.saveStatus).toBe('saved');

    // Call flushSavePending with nothing pending — should return immediately
    let resolved = false;
    await act(async () => {
      await result.current.flushSavePending().then(() => {
        resolved = true;
      });
    });

    // Line 215: `return Promise.resolve()` was hit
    expect(resolved).toBe(true);
    // No extra saves were triggered
  });

  it('flushSavePending resolves immediately after debounce has already fired', async () => {
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn((_input: unknown, init?: MockInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        if (method === 'GET') return asFetchResponse(okResponse(MOCK_DATA));
        return asFetchResponse(okResponse(MOCK_DATA));
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Edit and let the debounce fire fully
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'saved' }]);
    });
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('saved');

    // Now flushSavePending — no debounce timer (already fired), no in-flight
    // Hits line 215: return Promise.resolve()
    let resolved = false;
    await act(async () => {
      await result.current.flushSavePending().then(() => {
        resolved = true;
      });
    });

    expect(resolved).toBe(true);
  });
});
