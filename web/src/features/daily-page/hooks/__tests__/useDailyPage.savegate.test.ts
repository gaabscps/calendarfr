/**
 * Unit tests for useDailyPage `gateOpen` arg (FEAT-022 / undo-delete, T-007).
 *
 * Covers AC-003 (autosave is gated while gate is closed) and AC-004 (autosave
 * re-arms when gate flips false→true while saveStatus === 'dirty').
 *
 * IMPORTANT: existing useDailyPage.test.ts is NOT touched. This file follows
 * the same fetch-spy pattern (no MSW).
 */

import type { DailyPageData } from '@calendarfr/shared';
import { renderHook, act } from '@testing-library/react';

import { useDailyPage, AUTOSAVE_DEBOUNCE_MS } from '../useDailyPage.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const DATE = '2026-05-11';

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
    intention: null,
    gratitude: [],
    createdAt: null,
    updatedAt: null,
  };
}

const MOCK_DATA = makeData(DATE);

// ---------------------------------------------------------------------------
// fetch mock helpers (mirror useDailyPage.test.ts patterns)
// ---------------------------------------------------------------------------

type MockInit = { method?: string; keepalive?: boolean; body?: string; signal?: unknown };

function asFetchResponse(v: unknown): Promise<any> {
  return v as unknown as Promise<any>;
}
function asFetchFn(fn: (..._args: any[]) => unknown): typeof globalThis.fetch {
  return fn as unknown as typeof globalThis.fetch;
}
function okResponse(data: DailyPageData) {
  return Promise.resolve({ ok: true, json: () => Promise.resolve(data) });
}
function getPutCalls(spy: jest.SpyInstance): [unknown, MockInit][] {
  return (spy.mock.calls as [unknown, MockInit][]).filter(
    ([, init]) => (init?.method ?? 'GET').toUpperCase() === 'PUT',
  );
}
function makeFetch(): jest.SpyInstance {
  return jest.spyOn(globalThis, 'fetch').mockImplementation(
    asFetchFn((_input: unknown, init?: MockInit) => {
      const method = (init?.method ?? 'GET').toUpperCase();
      if (method === 'GET') return asFetchResponse(okResponse(MOCK_DATA));
      return asFetchResponse(okResponse(MOCK_DATA));
    }),
  );
}

// ---------------------------------------------------------------------------
// Setup — same console.error suppression as sibling tests (parity)
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
// Tests
// ---------------------------------------------------------------------------

describe('useDailyPage gateOpen (FEAT-022 T-007)', () => {
  it('AC-003: gateOpen=false → debounce does NOT arm; no PUT fires', async () => {
    const spy = makeFetch();

    const { result } = renderHook(
      ({ d, gate }: { d: string; gate: boolean }) => useDailyPage(d, { gateOpen: gate }),
      { initialProps: { d: DATE, gate: false } },
    );

    // Wait for initial load (GET only)
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(result.current.saveStatus).toBe('saved');

    // Edit while gated → state becomes dirty, but autosave timer must NOT arm
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'gated' }]);
    });

    expect(result.current.saveStatus).toBe('dirty');

    // Advance well past debounce window — no PUT should fire
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 5);
      await jest.runAllTimersAsync();
    });

    expect(getPutCalls(spy).length).toBe(0);
    // State stays dirty (pending save not flushed)
    expect(result.current.saveStatus).toBe('dirty');
  });

  it('AC-004: gateOpen flip false→true while dirty re-arms debounce; PUT fires', async () => {
    const spy = makeFetch();

    const { result, rerender } = renderHook(
      ({ d, gate }: { d: string; gate: boolean }) => useDailyPage(d, { gateOpen: gate }),
      { initialProps: { d: DATE, gate: false } },
    );

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Edit while gated
    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'queued' }]);
    });
    expect(result.current.saveStatus).toBe('dirty');

    // Advance: still gated → no PUT
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2);
      await jest.runAllTimersAsync();
    });
    expect(getPutCalls(spy).length).toBe(0);

    // Flip gate open while still dirty
    await act(async () => {
      rerender({ d: DATE, gate: true });
    });

    // Now advance debounce — PUT must fire with the queued body
    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    const putCalls = getPutCalls(spy);
    expect(putCalls.length).toBe(1);
    const body = JSON.parse(putCalls[0]![1]!.body as string) as DailyPageData;
    expect(body.notes[0]?.text).toBe('queued');
    expect(result.current.saveStatus).toBe('saved');
  });

  it('regression: no args (default) → byte-equivalent to current behaviour; PUT fires', async () => {
    const spy = makeFetch();

    // Call WITHOUT the args param at all (default path)
    const { result } = renderHook(() => useDailyPage(DATE));

    await act(async () => {
      await jest.runAllTimersAsync();
    });

    act(() => {
      result.current.setNotes([{ id: 'n1', prefix: '•', text: 'default' }]);
    });

    await act(async () => {
      jest.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS);
      await jest.runAllTimersAsync();
    });

    expect(getPutCalls(spy).length).toBe(1);
    expect(result.current.saveStatus).toBe('saved');
  });
});
