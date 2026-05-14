/**
 * Unit tests for useStickyNote with MSW.
 *
 * Covers:
 * - AC-023: fallback to 1 empty item on fetch error
 * - AC-026: fetchSticky uses color-specific endpoint /api/sticky/:color
 * - AC-027: GET /api/sticky/:color returns StickyResponse
 * - AC-028: race guard — abort on unmount / color change
 * - AC-032: isLoading cleared in finally (success + error)
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
  // doNotFake: MSW/undici uses nextTick/setImmediate internally — faking those
  // would deadlock the fetch pipeline and hang every test.
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'clearImmediate'] });
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// 1. AC-017 / AC-026 / AC-027: Fetch on mount — items populated from GET /api/sticky/:color
// ---------------------------------------------------------------------------

describe('AC-017 / AC-026 / AC-027: fetch on mount', () => {
  it('populates items from GET /api/sticky/y response', async () => {
    const payload = makeStickyResponse([{ id: '1', prefix: '•', text: 'oi' }]);
    server.use(http.get(STICKY_URL, () => HttpResponse.json(payload)));

    const { result } = renderHook(() => useStickyNote('y'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.text).toBe('oi');
    expect(result.current.items[0]?.id).toBe('1');
  });

  it('sets items to all items returned by the server', async () => {
    const payload = makeStickyResponse([
      { id: 'a', prefix: '•', text: 'first' },
      { id: 'b', prefix: '→', text: 'second' },
    ]);
    server.use(http.get(STICKY_URL, () => HttpResponse.json(payload)));

    const { result } = renderHook(() => useStickyNote('y'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// 2. AC-022 + AC-023: Error from server => isLoading=false, items=1 empty item
// ---------------------------------------------------------------------------

describe('AC-022 + AC-023: error fallback', () => {
  it('AC-023: GET 500 => items falls back to 1 empty item', async () => {
    server.use(
      http.get(STICKY_URL, () => HttpResponse.json({ message: 'server error' }, { status: 500 })),
    );

    const { result } = renderHook(() => useStickyNote('y'));

    // AC-022: isLoading eventually clears
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // AC-023: fallback to exactly 1 empty item
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.text).toBe('');
  });

  it('AC-022: isLoading becomes false even on network error', async () => {
    server.use(
      http.get(STICKY_URL, () => HttpResponse.json({ message: 'internal' }, { status: 500 })),
    );

    const { result } = renderHook(() => useStickyNote('y'));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// 3. AC-017: GET 200 with empty items array => minimum-1 item created
// ---------------------------------------------------------------------------

describe('AC-017 + AC-013: empty server response => minimum 1 item', () => {
  it('GET returns empty items array => items stays at 1 empty item', async () => {
    server.use(http.get(STICKY_URL, () => HttpResponse.json({ items: [], updatedAt: null })));

    const { result } = renderHook(() => useStickyNote('y'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0]?.text).toBe('');
  });
});

// ---------------------------------------------------------------------------
// 4. AC-023: hasUserEdited race guard — fetch settling late must not overwrite
// ---------------------------------------------------------------------------

describe('AC-023: hasUserEdited race guard', () => {
  it('fetch resolution after user edit does not overwrite items', async () => {
    // Use a resolver we can release manually to simulate a slow fetch
    let resolveGet!: (_r: Response) => void;
    const delayedGet = new Promise<Response>((res) => {
      resolveGet = res;
    });

    server.use(http.get(STICKY_URL, () => delayedGet));

    const { result } = renderHook(() => useStickyNote('y'));

    // User edits BEFORE fetch resolves — sets hasUserEdited.current = true
    act(() => {
      result.current.notesApi.onChangeText('some-id', 'user typed this');
    });

    // Capture what the user set
    const userItems = result.current.items.map((i) => ({ ...i }));

    // Now let the fetch resolve with server data
    act(() => {
      resolveGet(
        HttpResponse.json(makeStickyResponse([{ id: 'srv', prefix: '•', text: 'server data' }])),
      );
    });

    // Wait until loading clears (fetch settled)
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // items must reflect the user's edits, NOT the server payload
    expect(result.current.items.some((i) => i.text === 'server data')).toBe(false);
    expect(result.current.items).toHaveLength(userItems.length);
  });
});

// ---------------------------------------------------------------------------
// 5. AC-032: isLoading is true while fetch is pending
// ---------------------------------------------------------------------------

describe('AC-032: isLoading true while fetch pending', () => {
  it('isLoading starts as true before fetch completes', () => {
    let resolveGet!: (_r: Response) => void;
    const delayedGet = new Promise<Response>((res) => {
      resolveGet = res;
    });
    server.use(http.get(STICKY_URL, () => delayedGet));

    const { result } = renderHook(() => useStickyNote('y'));

    // immediately after mount, fetch is still in-flight
    expect(result.current.isLoading).toBe(true);

    // cleanup — resolve to avoid open handles
    act(() => {
      resolveGet(HttpResponse.json({ items: [], updatedAt: null }));
    });
  });
});

// ---------------------------------------------------------------------------
// 6. AC-026: hasUserEdited resets on color change so new color's fetch populates items
// ---------------------------------------------------------------------------

describe('AC-026: hasUserEdited resets on color change', () => {
  it('after user edits yellow, switching to green re-enables fetch population', async () => {
    const yellowPayload = {
      items: [{ id: 'y1', prefix: '•', text: 'yellow data' }],
      updatedAt: null,
    };
    const greenPayload = {
      items: [{ id: 'g1', prefix: '•', text: 'green data' }],
      updatedAt: null,
    };

    server.use(
      http.get('/api/sticky/y', () => HttpResponse.json(yellowPayload)),
      http.get('/api/sticky/g', () => HttpResponse.json(greenPayload)),
    );

    const { result, rerender } = renderHook<UseStickyNoteReturn, { color: StickyColor }>(
      ({ color }) => useStickyNote(color),
      { initialProps: { color: 'y' as StickyColor } },
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // User edits on yellow — sets hasUserEdited=true
    act(() => {
      result.current.notesApi.onChangeText('y1', 'user edited yellow');
    });

    // Switch to green
    rerender({ color: 'g' as StickyColor });

    // Wait for green fetch to resolve
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Green fetch data must populate items (hasUserEdited was reset)
    expect(result.current.items.some((i) => i.text === 'green data')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. AC-032: unmount during fetch — no state updates on unmounted instance
// ---------------------------------------------------------------------------

describe('AC-032: unmount guard on fetch', () => {
  it('isLoading stays true then component unmounts without error', async () => {
    // Delayed fetch that we control manually
    let resolveGet!: (_r: Response) => void;
    const delayedGet = new Promise<Response>((res) => {
      resolveGet = res;
    });
    server.use(http.get(STICKY_URL, () => delayedGet));

    const { result, unmount } = renderHook(() => useStickyNote('y'));

    expect(result.current.isLoading).toBe(true);

    // Unmount while fetch is still in-flight
    unmount();

    // Resolve the fetch AFTER unmount — cancelled flag prevents state updates
    act(() => {
      resolveGet(
        new Response(
          JSON.stringify({ items: [{ id: '1', prefix: '•', text: 'late' }], updatedAt: null }),
          {
            headers: { 'Content-Type': 'application/json' },
          },
        ),
      );
    });

    // No error/warning thrown — test passes if no console.error is triggered
    // (jest.setup.js turns console.error into a test failure)
  });
});
