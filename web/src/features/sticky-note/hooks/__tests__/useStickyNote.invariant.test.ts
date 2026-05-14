/**
 * Minimum-1 item invariant tests for useStickyNote.
 *
 * Covers:
 * - AC-012: minimum-1 item invariant enforced in handleChange
 * - AC-013: handleChange([]) keeps at least 1 item
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';

import { useStickyNote } from '../useStickyNote.js';

import { server } from '@/test-utils/msw/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STICKY_GET_URL = '/api/sticky/y';
const STICKY_PUT_URL = '/api/sticky/y';

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
// AC-012 + AC-013: Minimum-1 invariant in handleChange
// ---------------------------------------------------------------------------

describe('AC-012 + AC-013: minimum-1 invariant', () => {
  it('removing all items does not reduce items below 1', async () => {
    const payload = makeStickyResponse([{ id: '1', prefix: '•', text: 'existing' }]);
    server.use(
      http.get(STICKY_GET_URL, () => HttpResponse.json(payload)),
      http.put(STICKY_PUT_URL, () =>
        HttpResponse.json({ items: [{ id: 'x', prefix: '•', text: '' }], updatedAt: null }),
      ),
    );

    const { result } = renderHook(() => useStickyNote('y'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Simulate removing the only item
    act(() => {
      result.current.notesApi.onRemove('1');
    });

    // items must remain >= 1 (AC-012 / AC-013)
    expect(result.current.items.length).toBeGreaterThanOrEqual(1);
  });
});
