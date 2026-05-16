/**
 * Integration tests for useDailyPage with MSW.
 *
 * Uses renderHook in a React context. MSW intercepts real fetch() calls.
 * Server handlers are reset per test (global jest.setup.js lifecycle).
 *
 * Covers: AC-002, AC-006, AC-007, AC-008, AC-009, AC-010, AC-020, AC-021,
 *         AC-022, AC-025, AC-026, AC-027, AC-029, AC-030, AC-031, AC-032.
 */

import type { DailyPageData } from '@calendarfr/shared';
import { renderHook, act, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import React from 'react';

import { useDailyPage, AUTOSAVE_DEBOUNCE_MS, MAX_RETRY } from '../useDailyPage.js';

import { server } from '@/test-utils/msw/server';

// ---------------------------------------------------------------------------
// Typed fetch spy helpers
// ---------------------------------------------------------------------------

type MockFetchInit = { method?: string; keepalive?: boolean; body?: string } | undefined;

function getPutCalls(spy: jest.SpyInstance): [unknown, MockFetchInit][] {
  return (spy.mock.calls as [unknown, MockFetchInit][]).filter(
    ([, init]) => (init?.method ?? 'GET').toUpperCase() === 'PUT',
  );
}

function getKeepalivePutCalls(spy: jest.SpyInstance): [unknown, MockFetchInit][] {
  return (spy.mock.calls as [unknown, MockFetchInit][]).filter(
    ([, init]) => (init?.method ?? 'GET').toUpperCase() === 'PUT' && init?.keepalive === true,
  );
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = '2026-05-11';
const DATE2 = '2026-05-12';
const API_BASE = 'http://localhost:3003';

function makeData(date: string, overrides?: Partial<DailyPageData>): DailyPageData {
  return {
    schemaVersion: 1,
    date,
    mood: null,
    priorities: [
      { id: 'a', text: '', done: false },
      { id: 'b', text: '', done: false },
      { id: 'c', text: '', done: false },
    ] as unknown as DailyPageData['priorities'],
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

const DATA = makeData(DATE);
const DATA2 = makeData(DATE2);

function wrapper({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

function getUrl(date: string) {
  return `${API_BASE}/api/days/${date}`;
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  // doNotFake: MSW/undici uses nextTick/setImmediate internally for connection setup;
  // faking those APIs would deadlock the fetch pipeline and hang every test.
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'clearImmediate'] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. Happy path: load → loaded
// ---------------------------------------------------------------------------

describe('full happy path', () => {
  it('GET resolves → data populated, saveStatus=saved', async () => {
    server.use(http.get(getUrl(DATE), () => HttpResponse.json(DATA)));

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });

    expect(result.current.data).toBeNull();

    await waitFor(() => {
      expect(result.current.data).toEqual(DATA);
    });

    expect(result.current.loadError).toBeNull();
    expect(result.current.saveStatus).toBe('saved');
  });
});

// ---------------------------------------------------------------------------
// 2. GET error → loadError state
// ---------------------------------------------------------------------------

describe('GET error', () => {
  it('AC-030: GET 500 sets loadError, data stays null', async () => {
    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json({ message: 'server error' }, { status: 500 })),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });

    await waitFor(() => {
      expect(result.current.loadError).not.toBeNull();
    });

    expect(result.current.data).toBeNull();
  });

  it('AC-030: reload after GET error re-fetches and loads data', async () => {
    let callCount = 0;
    server.use(
      http.get(getUrl(DATE), () => {
        callCount++;
        if (callCount === 1) {
          return HttpResponse.json({ message: 'error' }, { status: 500 });
        }
        return HttpResponse.json(DATA);
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });

    await waitFor(() => {
      expect(result.current.loadError).not.toBeNull();
    });

    act(() => {
      result.current.reload();
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(DATA);
    });

    expect(result.current.loadError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 3. Edit → debounce → PUT
// ---------------------------------------------------------------------------

describe('edit → debounce → PUT', () => {
  it('AC-006/007: edit emits dirty; after debounce, PUT fires with edited body', async () => {
    const receivedBodies: DailyPageData[] = [];
    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.put(getUrl(DATE), async ({ request }) => {
        const body = (await request.json()) as DailyPageData;
        receivedBodies.push(body);
        return HttpResponse.json({ ...body, updatedAt: new Date().toISOString() });
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'integration-note' }]);
    });

    expect(result.current.saveStatus).toBe('dirty');

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });

    expect(receivedBodies.length).toBe(1);
    expect(receivedBodies[0]!.notes[0]?.text).toBe('integration-note');
  });

  it('AC-009: status=saving during in-flight PUT', async () => {
    let resolvePut!: () => void;
    const putDone = new Promise<void>((res) => {
      resolvePut = res;
    });

    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.put(getUrl(DATE), async () => {
        await putDone;
        return HttpResponse.json(DATA);
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'saving' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    expect(result.current.saveStatus).toBe('saving');

    await act(async () => {
      resolvePut();
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });
  });

  it('AC-010: edit during in-flight PUT → dirty after resolve', async () => {
    let resolvePut!: () => void;
    const putDone = new Promise<void>((res) => {
      resolvePut = res;
    });

    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.put(getUrl(DATE), async () => {
        await putDone;
        return HttpResponse.json(DATA);
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'v1' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    expect(result.current.saveStatus).toBe('saving');

    // Edit during save
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'v2' }]);
    });

    await act(async () => {
      resolvePut();
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('dirty');
    });
  });
});

// ---------------------------------------------------------------------------
// 4. Race: flushSavePending before date change (AC-020/021)
// ---------------------------------------------------------------------------

describe('race: flushSavePending', () => {
  it('AC-021: flush fires PUT for old date before switching to new date', async () => {
    const putLog: string[] = [];
    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.get(getUrl(DATE2), () => HttpResponse.json(DATA2)),
      http.put(getUrl(DATE), async ({ request }) => {
        const body = (await request.json()) as DailyPageData;
        putLog.push(`PUT-${DATE}:${body.notes[0]?.text ?? ''}`);
        return HttpResponse.json(body);
      }),
      http.put(getUrl(DATE2), async ({ request }) => {
        const body = (await request.json()) as DailyPageData;
        putLog.push(`PUT-${DATE2}:${body.notes[0]?.text ?? ''}`);
        return HttpResponse.json(body);
      }),
    );

    const { result, rerender } = renderHook((d: string) => useDailyPage(d), {
      wrapper,
      initialProps: DATE,
    });

    await waitFor(() => expect(result.current.data).not.toBeNull());

    // Edit on DATE — starts debounce
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'foo-date-x' }]);
    });

    // Flush (simulating BATCH-D nav onBeforeChange) — fires PUT immediately for DATE.
    // We don't await flushSavePending directly (direct await hangs with fake timers +
    // undici — waitFor internally advances fake timers which lets the fetch settle).
    act(() => {
      void result.current.flushSavePending();
    });

    // Wait until the save fully completes (status transitions from dirty→saving→saved)
    await waitFor(() => {
      expect(result.current.saveStatus).toBe('saved');
    });

    // PUT for DATE should have been called with the edit
    expect(putLog.some((entry) => entry.includes(`PUT-${DATE}:foo-date-x`))).toBe(true);

    // Switch to DATE2 — hook loads DATE2 data; no spurious PUT for DATE2 fires
    act(() => {
      rerender(DATE2);
    });

    await waitFor(() => {
      expect(result.current.data).toEqual(DATA2);
    });

    // No PUT fired for DATE2 (user has not edited yet)
    expect(putLog.some((entry) => entry.startsWith(`PUT-${DATE2}`))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Retry → success (AC-025)
// ---------------------------------------------------------------------------

describe('retry → success', () => {
  it('AC-025: PUT 500 twice, 200 third → status=saved', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let putCount = 0;

    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.put(getUrl(DATE), () => {
        putCount++;
        if (putCount < 3) {
          return HttpResponse.json({ message: 'err' }, { status: 500 });
        }
        return HttpResponse.json(DATA);
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'retry-msw' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('saved');
      },
      { timeout: 8000 },
    );

    expect(putCount).toBe(3);
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 6. Retry exhausted → error UI state
// ---------------------------------------------------------------------------

describe('retry exhausted → error', () => {
  it('AC-027: PUT always 500 → status=error after MAX_RETRY+1 attempts', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let putCount = 0;

    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.put(getUrl(DATE), () => {
        putCount++;
        return HttpResponse.json({ message: 'err' }, { status: 500 });
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'always-fail' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('error');
      },
      { timeout: 8000 },
    );

    // 1 initial + MAX_RETRY retries = MAX_RETRY + 1 total PUTs
    expect(putCount).toBe(MAX_RETRY + 1);
    // Data preserved (AC-028)
    expect(result.current.data).not.toBeNull();

    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 7. 4xx skip retry (AC-026)
// ---------------------------------------------------------------------------

describe('4xx skip retry', () => {
  it('AC-026: PUT 422 → immediate error, only 1 PUT call', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let putCount = 0;

    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.put(getUrl(DATE), () => {
        putCount++;
        return HttpResponse.json({ message: 'bad request' }, { status: 422 });
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: '4xx-test' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    await waitFor(() => {
      expect(result.current.saveStatus).toBe('error');
    });

    expect(putCount).toBe(1);
    consoleSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// 8. beforeunload with dirty → keepalive PUT (AC-031)
// ---------------------------------------------------------------------------

describe('beforeunload', () => {
  it('AC-031: dirty → beforeunload fires keepalive PUT', async () => {
    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.put(getUrl(DATE), () => HttpResponse.json(DATA)),
    );

    const fetchSpy = jest.spyOn(globalThis, 'fetch');

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'unload-me' }]);
    });

    expect(result.current.saveStatus).toBe('dirty');

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    // Verify fetch was called with keepalive (from fetch spy)
    const keepalivePuts = getKeepalivePutCalls(fetchSpy);
    expect(keepalivePuts.length).toBeGreaterThan(0);
  });

  it('AC-032: saved → beforeunload no-op', async () => {
    server.use(http.get(getUrl(DATE), () => HttpResponse.json(DATA)));

    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    expect(result.current.saveStatus).toBe('saved');

    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    const putCalls = getPutCalls(fetchSpy);
    expect(putCalls.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 9. AC-029: edit after error re-arms debounce
// ---------------------------------------------------------------------------

describe('edit after error', () => {
  it('AC-029: editing in error state sets dirty and re-arms debounce', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    let putCount = 0;

    server.use(
      http.get(getUrl(DATE), () => HttpResponse.json(DATA)),
      http.put(getUrl(DATE), () => {
        putCount++;
        if (putCount <= MAX_RETRY + 1) {
          return HttpResponse.json({ message: 'err' }, { status: 500 });
        }
        return HttpResponse.json(DATA);
      }),
    );

    const { result } = renderHook(() => useDailyPage(DATE), { wrapper });
    await waitFor(() => expect(result.current.data).not.toBeNull());

    // First round — all fail → error
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'will-fail' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('error');
      },
      { timeout: 8000 },
    );

    // Edit during error → dirty (AC-029)
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'edited-after-error' }]);
    });

    expect(result.current.saveStatus).toBe('dirty');

    // After debounce, new save succeeds
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
    });

    await waitFor(
      () => {
        expect(result.current.saveStatus).toBe('saved');
      },
      { timeout: 5000 },
    );

    consoleSpy.mockRestore();
  });
});
