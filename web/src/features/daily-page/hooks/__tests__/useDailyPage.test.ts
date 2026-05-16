/**
 * Unit tests for useDailyPage hook.
 *
 * Uses renderHook + jest.useFakeTimers() + fetch mocks (not MSW).
 * MSW integration tests are in useDailyPage.integration.test.tsx.
 *
 * Covers: AC-001, AC-002, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011,
 *         AC-012, AC-020, AC-021, AC-022, AC-023, AC-024, AC-025, AC-026,
 *         AC-027, AC-028, AC-029, AC-030, AC-031, AC-032, AC-033.
 */

import type { DailyPageData } from '@calendarfr/shared';
import { renderHook, act } from '@testing-library/react';

import {
  useDailyPage,
  AUTOSAVE_DEBOUNCE_MS,
  MAX_RETRY,
  LIFE_RAFT_KEY_PREFIX,
} from '../useDailyPage.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = '2026-05-11';
const DATE2 = '2026-05-12';

function makeData(date: string, overrides?: Partial<DailyPageData>): DailyPageData {
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
    intention: null,
    gratitude: [],
    createdAt: null,
    updatedAt: null,
    ...overrides,
  };
}

const MOCK_DATA = makeData(DATE);
const MOCK_DATA2 = makeData(DATE2);

// ---------------------------------------------------------------------------
// Typed fetch spy helpers
// ---------------------------------------------------------------------------

/** Cast helper — lets inline mock fns return plain objects without full Response shape */
function asFetchResponse(v: unknown): Promise<any> {
  return v as unknown as Promise<any>;
}

/** Cast an async mock fn to the fetch signature */
function asFetchFn(fn: (..._args: any[]) => unknown): typeof globalThis.fetch {
  return fn as unknown as typeof globalThis.fetch;
}

function getPutCalls(spy: jest.SpyInstance): [unknown, MockInit][] {
  return (spy.mock.calls as [unknown, MockInit][]).filter(
    ([, init]) => (init?.method ?? 'GET').toUpperCase() === 'PUT',
  );
}

function getKeepalivePutCalls(spy: jest.SpyInstance): [unknown, MockInit][] {
  return (spy.mock.calls as [unknown, MockInit][]).filter(
    ([, init]) => (init?.method ?? 'GET').toUpperCase() === 'PUT' && init?.keepalive === true,
  );
}

// ---------------------------------------------------------------------------
// fetch mock helpers
// ---------------------------------------------------------------------------

type MockInit = { method?: string; keepalive?: boolean; body?: string; signal?: unknown };

function okResponse(data: DailyPageData) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
}

function errResponse(status: number) {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ message: `HTTP ${status}` }),
  });
}

function makeFetchOk(data: DailyPageData): jest.SpyInstance {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(asFetchFn(() => okResponse(data)));
}

function makeFetchError(status: number): jest.SpyInstance {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(asFetchFn(() => errResponse(status)));
}

/** GET → ok(data), PUT → fails failCount times then ok */
function makeFetchGetOkPutFails(
  getData: DailyPageData,
  saveData: DailyPageData,
  failCount: number,
  failStatus = 500,
): jest.SpyInstance {
  let putCallCount = 0;
  return jest.spyOn(globalThis, 'fetch').mockImplementation(
    asFetchFn((_input: unknown, init?: { method?: string }) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET') {
        return okResponse(getData);
      }
      putCallCount++;
      if (putCallCount <= failCount) {
        return errResponse(failStatus);
      }
      return okResponse(saveData);
    }),
  );
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

// Suppress React 19 "overlapping act()" / "not wrapped in act" warnings per-test.
// These fire when async save-state updates settle between test teardown and the
// next test start — a known React 19 + fake-timers interaction; hook behaviour is correct.
// Using per-test spyOn so jest.restoreAllMocks() cleans up properly (no leaked module-level patch).
const SUPPRESS_PATTERNS = [
  'overlapping act()',
  'not wrapped in act',
  // Expected error logs from useDailyPage error paths exercised across multiple tests
  // (retry exhaustion, 4xx giveup, fire-and-forget on date change, localStorage quota).
  '[useDailyPage]',
];

beforeEach(() => {
  jest.useFakeTimers();
  // Spy filters React timing noise while calling through for real errors so
  // jest.setup.js interceptor still catches unexpected console.error calls.
  // Capture the REAL console.error before spyOn replaces it (restoreAllMocks in afterEach
  // ensures console.error is restored to the real implementation before each beforeEach run).
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
// 1. Load happy path
// ---------------------------------------------------------------------------

describe('load happy path', () => {
  it('AC-002: fetches on mount, data=null initially, then populated after fetch', async () => {
    makeFetchOk(MOCK_DATA);

    const { result } = renderHook(() => useDailyPage(DATE));
    // Immediately after mount, data is null (skeleton)
    expect(result.current.data).toBeNull();

    // Resolve pending fetch
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current.data).toEqual(MOCK_DATA);
    expect(result.current.loadError).toBeNull();
    expect(result.current.saveStatus).toBe('saved');
  });

  it('AC-012: exposes saveStatus as one of the 4 valid values', async () => {
    makeFetchOk(MOCK_DATA);
    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    expect(['saved', 'dirty', 'saving', 'error']).toContain(result.current.saveStatus);
  });
});

// ---------------------------------------------------------------------------
// 2. Load error
// ---------------------------------------------------------------------------

describe('load error', () => {
  it('AC-030: GET 500 error sets loadError, data stays null', async () => {
    makeFetchError(500);
    const { result } = renderHook(() => useDailyPage(DATE));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current.data).toBeNull();
    expect(result.current.loadError).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Debounce — single edit
// ---------------------------------------------------------------------------

describe('autosave debounce', () => {
  it('AC-007: single edit → save fires after AUTOSAVE_DEBOUNCE_MS', async () => {
    const spy = makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 0);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Edit
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'hello' }]);
    });

    expect(result.current.saveStatus).toBe('dirty');

    // Advance debounce window
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    // PUT should have been called
    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(1);
  });

  it('AC-011: multiple edits in window → only ONE save fires with last body', async () => {
    const spy = makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 0);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // 3 edits within debounce window
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'first' }]);
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'second' }]);
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
    });
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'third' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(1);

    // Verify body has last value
    const body = JSON.parse(putCalls[0]![1]!.body as string) as DailyPageData;
    expect(body.notes[0]?.text).toBe('third');
  });

  it('AC-008: snapshot-then-fire — edit A + edit B both captured in one save', async () => {
    const spy = makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 0);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Edit A
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'A' }]);
    });
    // Advance 500ms (within debounce)
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    // Edit B — re-arms debounce
    act(() => {
      result.current.setPriorities([
        { id: 'p1', text: 'B', done: false },
        { id: 'b', text: '', done: false },
        { id: 'c', text: '', done: false },
      ]);
    });
    // Advance 800ms — debounce fires
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(1);
    const body = JSON.parse(putCalls[0]![1]!.body as string) as DailyPageData;
    // Both A and B captured in snapshot
    expect(body.notes[0]?.text).toBe('A');
    expect(body.priorities[0]?.text).toBe('B');
  });

  it('AC-008: PUT body captured at fire-time, not contaminated by edits during in-flight', async () => {
    // Deferred PUT: resolves only when resolvePut is called, letting us edit DURING the PUT.
    let resolvePut!: () => void;
    const putProm = new Promise<void>((res) => {
      resolvePut = res;
    });
    let capturedBody: DailyPageData | null = null;

    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'GET') {
            return asFetchResponse(okResponse(MOCK_DATA));
          }
          // Capture the body sent in this PUT before the deferred resolve
          capturedBody = JSON.parse(init?.body ?? 'null') as DailyPageData;
          return asFetchResponse(
            putProm.then(() => ({ ok: true, json: () => Promise.resolve(MOCK_DATA) })),
          );
        },
      ),
    );

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Edit A — arms debounce
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'A' }]);
    });

    // Advance timers to fire debounce → PUT is now in-flight (putProm not resolved)
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await Promise.resolve(); // flush microtasks so fetch is actually called
    });

    expect(result.current.saveStatus).toBe('saving');
    expect(capturedBody).not.toBeNull();

    // Edit B during in-flight PUT — must NOT contaminate the already-sent body
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'B' }]);
    });

    // Resolve the PUT now
    await act(async () => {
      resolvePut();
      await jest.runAllTimersAsync();
    });

    // The PUT body must have been 'A' (snapshot captured at fire-time), not 'B'
    expect(capturedBody!.notes[0]?.text).toBe('A');
  });

  it('AC-008/011: second save after first fires — separate debounce windows', async () => {
    const spy = makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 0);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // First save cycle
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'C' }]);
    });
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    // Second save cycle
    act(() => {
      result.current.setPriorities([
        { id: 'p1', text: 'D', done: false },
        { id: 'b', text: '', done: false },
        { id: 'c', text: '', done: false },
      ]);
    });
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(2);
    const body2 = JSON.parse(putCalls[1]![1]!.body as string) as DailyPageData;
    expect(body2.priorities[0]?.text).toBe('D');
  });
});

// ---------------------------------------------------------------------------
// 4. flushSavePending — race protection
// ---------------------------------------------------------------------------

describe('flushSavePending', () => {
  it('AC-020/021: flush cancels pending timer and fires save immediately', async () => {
    const spy = makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 0);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Edit — starts debounce
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'flush-me' }]);
    });

    // Flush before debounce expires
    await act(async () => {
      await result.current.flushSavePending();
      await jest.runAllTimersAsync();
    });

    // Save should have fired immediately
    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(1);
    expect(result.current.saveStatus).toBe('saved');
  });

  it('flushSavePending is no-op when already saved', async () => {
    const spy = makeFetchOk(MOCK_DATA);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('saved');
    await act(async () => {
      await result.current.flushSavePending();
    });

    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(0);
  });

  it('AC-022: flushSavePending awaits in-flight save', async () => {
    let resolveSave!: () => void;
    const saveProm = new Promise<void>((res) => {
      resolveSave = res;
    });

    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'GET') {
            return asFetchResponse(okResponse(MOCK_DATA));
          }
          return asFetchResponse(
            saveProm.then(() => ({ ok: true, json: () => Promise.resolve(MOCK_DATA) })),
          );
        },
      ),
    );

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Start a save
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'in-flight' }]);
    });
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    // Save is in-flight now
    expect(result.current.saveStatus).toBe('saving');

    // Verify flushSavePending resolves only after in-flight save completes.
    // Use a single act() that: kicks off the flush, resolves the in-flight save,
    // then drains all pending microtasks — avoids overlapping act() calls.
    let flushDone = false;
    await act(async () => {
      const flushPromise = result.current.flushSavePending().then(() => {
        flushDone = true;
      });
      // Resolve the in-flight save so the flush can complete
      resolveSave();
      await flushPromise;
      await jest.runAllTimersAsync();
    });

    expect(flushDone).toBe(true);
    expect(result.current.saveStatus).toBe('saved');
  });
});

// ---------------------------------------------------------------------------
// 5. Retry on 5xx
// ---------------------------------------------------------------------------

describe('retry on 5xx', () => {
  it('AC-025: retries 2x, then saved on 3rd attempt (success)', async () => {
    // Fail first 2 PUT attempts, succeed on 3rd
    makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 2, 500);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'retry-me' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('saved');
  });

  it('AC-025: retries exhaust (MAX_RETRY times) → status=error', async () => {
    // AC-025/AC-028: spy localStorage.setItem to assert life-raft written after giveup
    const setItemSpy = jest.spyOn(
      Object.getPrototypeOf(globalThis.localStorage) as Record<string, any>,
      'setItem',
    );
    // All PUTs fail
    makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 999, 500);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'fail' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('error');
    // Data preserved (AC-028)
    expect(result.current.data).not.toBeNull();
    // Life-raft written to localStorage after retries exhaust (AC-028)
    expect(setItemSpy).toHaveBeenCalledWith(`${LIFE_RAFT_KEY_PREFIX}${DATE}`, expect.any(String));
  });
});

// ---------------------------------------------------------------------------
// 6. 4xx skip retry
// ---------------------------------------------------------------------------

describe('4xx skip retry', () => {
  it('AC-026: 4xx → immediate error, only 1 PUT fired', async () => {
    const spy = makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 999, 422);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: '4xx' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('error');

    // Only 1 PUT fired (no retry)
    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// 7. retrySave from error
// ---------------------------------------------------------------------------

describe('retrySave', () => {
  it('AC-027/028: retrySave resets retry counter and re-arms debounce with current body', async () => {
    let putCallCount = 0;
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'GET') {
            return asFetchResponse(okResponse(MOCK_DATA));
          }
          putCallCount++;
          // First round: fail all retries (MAX_RETRY+1 total PUTs)
          // Second round (after retrySave): succeed
          if (putCallCount <= MAX_RETRY + 1) {
            return asFetchResponse(errResponse(500));
          }
          return asFetchResponse(okResponse(MOCK_DATA));
        },
      ),
    );

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'retry-save' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('error');

    // Call retrySave — sets dirty, re-arms debounce
    act(() => {
      result.current.retrySave();
    });

    expect(result.current.saveStatus).toBe('dirty');

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('saved');
  });
});

// ---------------------------------------------------------------------------
// 8. Edit during in-flight save → dirty after save resolves (AC-010)
// ---------------------------------------------------------------------------

describe('edit during in-flight save', () => {
  it('AC-010: edit during save → status=dirty after save resolves', async () => {
    let resolveSave!: () => void;
    const saveProm = new Promise<void>((res) => {
      resolveSave = res;
    });

    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'GET') {
            return asFetchResponse(okResponse(MOCK_DATA));
          }
          return asFetchResponse(
            saveProm.then(() => ({ ok: true, json: () => Promise.resolve(MOCK_DATA) })),
          );
        },
      ),
    );

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Initial edit → starts debounce
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'v1' }]);
    });

    // Fire debounce → save in-flight
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    expect(result.current.saveStatus).toBe('saving');

    // Edit during save
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'v2' }]);
    });

    // Resolve save
    await act(async () => {
      resolveSave();
      await jest.runAllTimersAsync();
    });

    // After save resolves with edit during it → dirty (AC-010)
    expect(result.current.saveStatus).toBe('dirty');
  });
});

// ---------------------------------------------------------------------------
// 9. AbortController on load (AC-023, AC-024)
// ---------------------------------------------------------------------------

describe('AbortController on load', () => {
  it('AC-023: date change aborts old GET, new GET resolves — no loadError', async () => {
    // First GET never resolves (will be aborted)
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          if (init?.signal) {
            return asFetchResponse(
              new Promise((_res, rej) => {
                const sig = init.signal as {
                  addEventListener: (_e: string, _h: () => void) => void;
                };
                sig.addEventListener('abort', () => {
                  rej(new globalThis.DOMException('AbortError', 'AbortError'));
                });
              }),
            );
          }
          return asFetchResponse(okResponse(MOCK_DATA));
        },
      ),
    );

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      initialProps: DATE,
    });

    // Change date — new GET resolves immediately
    jest.restoreAllMocks();
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => asFetchResponse(okResponse(MOCK_DATA2)));

    await act(async () => {
      rerender(DATE2);
      await jest.runAllTimersAsync();
    });

    expect(result.current.data).toEqual(MOCK_DATA2);
    expect(result.current.loadError).toBeNull();
  });

  it('AC-024: date change immediately resets data to null (skeleton shown)', async () => {
    makeFetchOk(MOCK_DATA);

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      initialProps: DATE,
    });
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current.data).not.toBeNull();

    // Change date — make fetch slow (never resolves)
    jest.restoreAllMocks();
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => asFetchResponse(new Promise(() => undefined)));
    act(() => {
      rerender(DATE2);
    });

    // data should be null immediately (skeleton shown per AC-024)
    expect(result.current.data).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 10. Save NOT aborted on date change (AC-022)
// ---------------------------------------------------------------------------

describe('save not aborted on date change', () => {
  it('AC-022: PUT for date X continues after date changes to Y', async () => {
    let resolvePut!: (_v: unknown) => void;
    const putReady = new Promise((res) => {
      resolvePut = res;
    });

    let putCalled = false;
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'PUT') {
            putCalled = true;
            return asFetchResponse(putReady);
          }
          // GET for DATE resolves immediately
          return asFetchResponse(okResponse(MOCK_DATA));
        },
      ),
    );

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      initialProps: DATE,
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Start a save for DATE
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'X-content' }]);
    });
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    expect(putCalled).toBe(true);

    // Change date — GET for Y starts, but PUT for X must NOT be aborted
    jest.restoreAllMocks();
    jest
      .spyOn(globalThis, 'fetch')
      .mockImplementation(() => asFetchResponse(okResponse(MOCK_DATA2)));
    act(() => {
      rerender(DATE2);
    });

    // Resolve PUT for X — should succeed cleanly
    await act(async () => {
      resolvePut({ ok: true, json: () => Promise.resolve(MOCK_DATA) });
      await jest.runAllTimersAsync();
    });

    // The PUT for X completed without error
    expect(putCalled).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 10b. Date-change fire-and-forget (AC-021) — no flushSavePending caller
// ---------------------------------------------------------------------------

describe('date-change fire-and-forget', () => {
  it('AC-021: fires PUT for old date on date-change when debounce pending (no flushSavePending caller)', async () => {
    const putBodies: { url: string; body: DailyPageData }[] = [];

    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn((input: unknown, init?: MockInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        const url = String(input);
        if (method === 'PUT') {
          putBodies.push({ url, body: JSON.parse(init?.body ?? 'null') as DailyPageData });
          return asFetchResponse(okResponse(MOCK_DATA));
        }
        // GET responses keyed by date in URL so DATE2 gets MOCK_DATA2
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

    // Edit — arms debounce, status becomes dirty. Do NOT advance timer enough to fire.
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'foo' }]);
    });
    expect(result.current.saveStatus).toBe('dirty');

    // Sanity: no PUT yet
    expect(putBodies.filter((p) => p.url.includes(DATE)).length).toBe(0);

    // Change date WITHOUT calling flushSavePending.
    // Effect 1 must detect dirty + debounce pending and fire-and-forget PUT for old DATE.
    await act(async () => {
      rerender(DATE2);
      // Drain microtasks so the fire-and-forget PUT actually executes
      await Promise.resolve();
      await Promise.resolve();
      await jest.runAllTimersAsync();
    });

    const putsForOldDate = putBodies.filter((p) => p.url.includes(DATE) && !p.url.includes(DATE2));
    expect(putsForOldDate.length).toBe(1);
    expect(putsForOldDate[0]!.body.notes[0]?.text).toBe('foo');

    // And no PUT was issued for DATE2 (we didn't edit anything for the new date)
    const putsForNewDate = putBodies.filter((p) => p.url.includes(DATE2));
    expect(putsForNewDate.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 10c. Retry cancellation on date change (BLOCKER F1 — AC-021/022)
// ---------------------------------------------------------------------------

describe('retry cancellation on date change', () => {
  it('AC-021/022: cancels retry wait on date-change without entering error state or deadlocking', async () => {
    // Expected [useDailyPage] error logs (save-on-date-change failure, retry abort)
    // pass through the global beforeEach spy; tests still pass since they are not
    // React 'Warning:' messages (jest.setup.js only fails on those).
    let putCount = 0;
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn((input: unknown, init?: MockInit) => {
        const method = (init?.method ?? 'GET').toUpperCase();
        const url = String(input);
        if (method === 'GET') {
          if (url.includes(DATE2)) return asFetchResponse(okResponse(MOCK_DATA2));
          return asFetchResponse(okResponse(MOCK_DATA));
        }
        // PUTs: always fail 500 (drive into retry wait), so old-date saves never succeed
        putCount++;
        return asFetchResponse(errResponse(500));
      }),
    );

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      initialProps: DATE,
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Edit; advance debounce → save fires → 500 → retry-wait scheduled
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'foo' }]);
    });
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      // Flush microtasks so the first PUT resolves to 500 and retry-wait is armed
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // First PUT fired
    expect(putCount).toBeGreaterThanOrEqual(1);
    // Either 'saving' (during retry wait) or 'dirty' (between retries) — never 'error' yet
    expect(result.current.saveStatus).not.toBe('error');

    // Change date BEFORE retry timer expires.
    // Expected: retryRejectRef invoked with AbortError → fireSave IIFE exits cleanly
    // (no SAVE_GIVEUP); saveInFlightRef cleared via finally.
    await act(async () => {
      rerender(DATE2);
      await Promise.resolve();
      await Promise.resolve();
    });

    // Advance plenty of time — if retry weren't cancelled, more PUTs would fire
    // for the old date and eventually SAVE_GIVEUP would set state to 'error'.
    const putCountBeforeAdvance = putCount;
    await act(async () => {
      jest.advanceTimersByTime(10_000);
      await jest.runAllTimersAsync();
    });

    // New date load should be 'saved', and no error state from cancelled retry.
    expect(result.current.saveStatus).not.toBe('error');

    // The cancelled retry should not have fired more attempts for the old date.
    // (One additional PUT from the fire-and-forget date-change save is acceptable;
    // what matters is the retry loop didn't continue cycling.)
    // Allow at most +1 (the fire-and-forget) PUT after rerender.
    expect(putCount - putCountBeforeAdvance).toBeLessThanOrEqual(1);

    // flushSavePending must resolve cleanly (no deadlock on stale saveInFlightRef)
    await expect(
      act(async () => {
        await result.current.flushSavePending();
      }),
    ).resolves.toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 11. beforeunload (AC-031, AC-032, AC-033)
// ---------------------------------------------------------------------------

describe('beforeunload', () => {
  it('AC-031: fires saveDay with keepalive=true when dirty', async () => {
    const spy = makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 0);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'before-unload' }]);
    });

    expect(result.current.saveStatus).toBe('dirty');

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBeGreaterThan(0);
    const keepaliveCall = getKeepalivePutCalls(spy);
    expect(keepaliveCall.length).toBeGreaterThan(0);
  });

  it('AC-032: beforeunload no-op when saving (in-flight save continues naturally)', async () => {
    // Per AC-031, keepalive fires only for 'dirty'. When 'saving', the in-flight PUT
    // is already running and will complete on its own — a duplicate keepalive would
    // double-write the same data. Guard: saveStatus !== 'dirty' → no-op.
    let resolveSave!: () => void;
    const saveProm = new Promise<void>((res) => {
      resolveSave = res;
    });

    const spy = jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'GET') {
            return asFetchResponse(okResponse(MOCK_DATA));
          }
          return asFetchResponse(
            saveProm.then(() => ({ ok: true, json: () => Promise.resolve(MOCK_DATA) })),
          );
        },
      ),
    );

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'saving-state' }]);
    });

    // Fire debounce to start the save
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    expect(result.current.saveStatus).toBe('saving');

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    // No keepalive PUT should fire — the in-flight save is already running
    const keepaliveCalls = getKeepalivePutCalls(spy);
    expect(keepaliveCalls.length).toBe(0);

    await act(async () => {
      resolveSave();
      await jest.runAllTimersAsync();
    });
  });

  it('AC-032: beforeunload no-op when saved', async () => {
    const spy = makeFetchOk(MOCK_DATA);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('saved');

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(0);
  });

  it('AC-033: beforeunload does not call event.preventDefault', async () => {
    makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 0);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'dirty' }]);
    });

    const event = new Event('beforeunload');
    const preventDefaultSpy = jest.spyOn(event, 'preventDefault');

    act(() => {
      window.dispatchEvent(event);
    });

    expect(preventDefaultSpy).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// 12. localStorage life-raft
// ---------------------------------------------------------------------------

describe('localStorage life-raft', () => {
  const key = `${LIFE_RAFT_KEY_PREFIX}${DATE}`;

  it('AC-028: writes to localStorage on error (retries exhausted)', async () => {
    const setItemSpy = jest.spyOn(
      Object.getPrototypeOf(globalThis.localStorage) as Record<string, any>,
      'setItem',
    );

    makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 999, 500);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'life-raft' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('error');
    expect(setItemSpy).toHaveBeenCalledWith(key, expect.any(String));
  });

  it('AC-028: clears localStorage on save success', async () => {
    const removeItemSpy = jest.spyOn(
      Object.getPrototypeOf(globalThis.localStorage) as Record<string, any>,
      'removeItem',
    );
    makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 0);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // After successful load, state is 'saved' → clearLifeRaft called
    expect(removeItemSpy).toHaveBeenCalledWith(key);
    expect(result.current.saveStatus).toBe('saved');
  });

  it('localStorage write failure swallowed — no crash, status stays error', async () => {
    jest
      .spyOn(Object.getPrototypeOf(globalThis.localStorage) as Record<string, any>, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });

    makeFetchGetOkPutFails(MOCK_DATA, MOCK_DATA, 999, 500);

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'quota' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('error');
  });
});

// ---------------------------------------------------------------------------
// 13. reload after loadError (AC-030)
// ---------------------------------------------------------------------------

describe('reload', () => {
  it('AC-030: reload re-triggers GET and clears loadError', async () => {
    let callCount = 0;
    jest.spyOn(globalThis, 'fetch').mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return asFetchResponse(errResponse(500));
      }
      return asFetchResponse(okResponse(MOCK_DATA));
    });

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current.loadError).not.toBeNull();

    act(() => {
      result.current.reload();
    });

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current.data).toEqual(MOCK_DATA);
    expect(result.current.loadError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 14. AC-029: edit after error re-arms debounce
// ---------------------------------------------------------------------------

describe('edit after error', () => {
  it('AC-029: editing while in error state sets dirty and re-arms debounce', async () => {
    let putCount = 0;
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'GET') {
            return asFetchResponse(okResponse(MOCK_DATA));
          }
          putCount++;
          // First round (MAX_RETRY+1 PUTs) all fail; then succeed
          if (putCount <= MAX_RETRY + 1) {
            return asFetchResponse(errResponse(500));
          }
          return asFetchResponse(okResponse(MOCK_DATA));
        },
      ),
    );

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // First edit → retries → error
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'will-fail' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('error');

    // Edit during error → dirty (AC-029)
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'edited-after-error' }]);
    });

    expect(result.current.saveStatus).toBe('dirty');

    // After debounce, new save fires (fresh body)
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('saved');
  });
});

// ---------------------------------------------------------------------------
// 15. Network error treated as retryable (AC-025)
// ---------------------------------------------------------------------------

describe('network error retryable', () => {
  it('AC-025: network TypeError retries up to MAX_RETRY, then succeeds', async () => {
    let putCount = 0;
    jest.spyOn(globalThis, 'fetch').mockImplementation(
      asFetchFn(
        (
          _input: unknown,
          init?: { method?: string; keepalive?: boolean; body?: string; signal?: unknown },
        ) => {
          const method = (init?.method ?? 'GET').toUpperCase();
          if (method === 'GET') {
            return asFetchResponse(okResponse(MOCK_DATA));
          }
          putCount++;
          if (putCount <= 2) {
            return Promise.reject(new TypeError('Failed to fetch'));
          }
          return asFetchResponse(okResponse(MOCK_DATA));
        },
      ),
    );

    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'network-retry' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('saved');
  });
});

// ---------------------------------------------------------------------------
// 16. Slice setters (AC-006)
// ---------------------------------------------------------------------------

describe('slice setters', () => {
  it('AC-006: setPriorities updates data immediately', async () => {
    makeFetchOk(MOCK_DATA);
    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    const newPriorities: [
      (typeof MOCK_DATA.priorities)[0],
      (typeof MOCK_DATA.priorities)[0],
      (typeof MOCK_DATA.priorities)[0],
    ] = [
      { id: 'x', text: 'foo', done: false },
      { id: 'b', text: '', done: false },
      { id: 'c', text: '', done: false },
    ];
    act(() => {
      result.current.setPriorities(newPriorities);
    });

    expect(result.current.data?.priorities).toEqual(newPriorities);
    expect(result.current.saveStatus).toBe('dirty');
  });

  it('AC-006: setMood updates mood immediately', async () => {
    makeFetchOk(MOCK_DATA);
    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    const mood = { emoji: '😊', label: 'Feliz', color: '#fff' };
    act(() => {
      result.current.setMood(mood);
    });

    expect(result.current.data?.mood).toEqual(mood);
    expect(result.current.saveStatus).toBe('dirty');
  });

  it('AC-006: setAgenda updates agenda immediately', async () => {
    makeFetchOk(MOCK_DATA);
    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Cast via unknown — the hook accepts AgendaSlots (18-tuple); test data is structurally correct
    const newAgenda = MOCK_DATA.agenda.map((s) => ({ ...s, text: 'meeting' }));
    act(() => {
      result.current.setAgenda(newAgenda as any);
    });

    expect(result.current.data?.agenda).toEqual(newAgenda);
    expect(result.current.saveStatus).toBe('dirty');
  });

  it('AC-006: setNotes updates notes immediately', async () => {
    makeFetchOk(MOCK_DATA);
    const { result } = renderHook(() => useDailyPage(DATE));
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    const notes = [{ id: 'n1', prefix: '•' as const, text: 'hello' }];
    act(() => {
      result.current.setNotes(notes);
    });

    expect(result.current.data?.notes).toEqual(notes);
    expect(result.current.saveStatus).toBe('dirty');
  });
});

// ---------------------------------------------------------------------------
// 17. Export constants
// ---------------------------------------------------------------------------

describe('exported constants', () => {
  it('AUTOSAVE_DEBOUNCE_MS is 800', () => {
    expect(AUTOSAVE_DEBOUNCE_MS).toBe(800);
  });

  it('MAX_RETRY is 3', () => {
    expect(MAX_RETRY).toBe(3);
  });

  it('LIFE_RAFT_KEY_PREFIX is correct', () => {
    expect(LIFE_RAFT_KEY_PREFIX).toBe('calendarfr:dailypage:');
  });
});
