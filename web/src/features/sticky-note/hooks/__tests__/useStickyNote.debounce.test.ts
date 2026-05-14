/**
 * Debounce tests for useStickyNote.
 *
 * Covers:
 * - AC-028: handleChange debounces saveSticky(color, items) at 600ms
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import type { StickyColor } from '../../types.js';
import { useStickyNote } from '../useStickyNote.js';
import type { UseStickyNoteReturn } from '../useStickyNote.js';

import { server } from '@/test-utils/msw/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STICKY_URL = '/api/sticky/y';

function makeStickyResponse(items = [{ id: '1', prefix: '•', text: 'oi' }]) {
  return { items, updatedAt: '2026-05-13T00:00:00.000Z' };
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'clearImmediate'] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// AC-028: debounced save at 600ms
// ---------------------------------------------------------------------------

describe('AC-028: debounced save at 600ms', () => {
  it('saveSticky is NOT called before 600ms', async () => {
    const payload = makeStickyResponse();
    server.use(
      http.get(STICKY_URL, () => HttpResponse.json(payload)),
      http.put(STICKY_URL, () => HttpResponse.json(payload)),
    );

    const fetchSpy = jest.spyOn(globalThis, 'fetch');
    const { result } = renderHook(() => useStickyNote('y'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Reset spy to only track calls after mount
    fetchSpy.mockClear();

    act(() => {
      result.current.notesApi.onChangeText('1', 'updated text');
    });

    // Advance less than debounce — no PUT yet
    act(() => {
      jest.advanceTimersByTime(300);
    });

    const putCalls = (fetchSpy.mock.calls as [unknown, { method?: string } | undefined][]).filter(
      ([, init]) => (init?.method ?? 'GET').toUpperCase() === 'PUT',
    );
    expect(putCalls).toHaveLength(0);
  });

  it('saveSticky is called after 600ms', async () => {
    const receivedBodies: unknown[] = [];
    const payload = makeStickyResponse([{ id: '1', prefix: '•', text: 'oi' }]);
    server.use(
      http.get(STICKY_URL, () => HttpResponse.json(payload)),
      http.put(STICKY_URL, async ({ request }) => {
        const body = await request.json();
        receivedBodies.push(body);
        return HttpResponse.json(payload);
      }),
    );

    const { result } = renderHook(() => useStickyNote('y'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.notesApi.onChangeText('1', 'updated text');
    });

    // Advance past the 600ms debounce
    await act(async () => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(receivedBodies).toHaveLength(1);
    });
  });

  it('AC-028: debounce timer is cleared on color change preventing stale save', async () => {
    const payload = makeStickyResponse([{ id: '1', prefix: '•', text: 'oi' }]);
    const yellowPayload = makeStickyResponse([{ id: '2', prefix: '•', text: 'yellow' }]);
    const receivedBodies: unknown[] = [];

    server.use(
      http.get('/api/sticky/y', () => HttpResponse.json(payload)),
      http.get('/api/sticky/g', () => HttpResponse.json(yellowPayload)),
      http.put('/api/sticky/y', async ({ request }) => {
        const body = await request.json();
        receivedBodies.push({ color: 'y', body });
        return HttpResponse.json(payload);
      }),
      http.put('/api/sticky/g', async ({ request }) => {
        const body = await request.json();
        receivedBodies.push({ color: 'g', body });
        return HttpResponse.json(yellowPayload);
      }),
    );

    const { result, rerender } = renderHook<UseStickyNoteReturn, { color: StickyColor }>(
      ({ color }) => useStickyNote(color),
      { initialProps: { color: 'y' as StickyColor } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // User edits yellow while timer pending
    act(() => {
      result.current.notesApi.onChangeText('1', 'edited yellow');
    });

    // Switch color before debounce fires — old timer must be cleared
    rerender({ color: 'g' });

    // Advance past debounce
    await act(async () => {
      jest.advanceTimersByTime(700);
    });

    // Only 0 PUTs should have fired (old timer was cleared; new color hasn't been edited)
    expect(receivedBodies).toHaveLength(0);
  });
});
