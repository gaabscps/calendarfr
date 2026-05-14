/**
 * Unit tests for saveSticky API function.
 *
 * Covers:
 * - AC-026, AC-028: saveSticky makes PUT /api/sticky/:color with { items } in the body
 * - AC-021: throws Error on HTTP error (status >= 400)
 */

import { http, HttpResponse } from 'msw';

import { saveSticky } from '../saveSticky.js';

import type { Note } from '@/features/notes';
import { server } from '@/test-utils/msw/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STICKY_URL = '/api/sticky/y';

function makeItems(overrides?: Partial<Note>[]): Note[] {
  return (overrides ?? []).map((o) => ({ id: 'id-1', prefix: '•' as const, text: '', ...o }));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('saveSticky', () => {
  it('AC-026/AC-028: makes PUT /api/sticky/:color and returns parsed StickyResponse', async () => {
    const items = makeItems([{ id: '1', text: 'note content' }]);
    const responsePayload = { items, updatedAt: '2026-05-13T00:00:00.000Z' };

    let receivedBody: unknown;
    server.use(
      http.put(STICKY_URL, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json(responsePayload);
      }),
    );

    const result = await saveSticky('y', items);

    expect(result).toEqual(responsePayload);
    expect(receivedBody).toEqual({ items });
  });

  it('AC-026/AC-028: sends correct Content-Type header', async () => {
    const items = makeItems([{ id: '1', text: 'test' }]);
    const responsePayload = { items, updatedAt: null };

    let receivedContentType: string | null = null;
    server.use(
      http.put(STICKY_URL, ({ request }) => {
        receivedContentType = request.headers.get('content-type');
        return HttpResponse.json(responsePayload);
      }),
    );

    await saveSticky('y', items);

    expect(receivedContentType).toContain('application/json');
  });

  it('AC-026/AC-028: sends multiple items correctly', async () => {
    const items = makeItems([
      { id: 'a', text: 'first' },
      { id: 'b', prefix: '→', text: 'second' },
    ]);
    const responsePayload = { items, updatedAt: '2026-05-13T00:00:00.000Z' };

    let receivedBody: unknown;
    server.use(
      http.put(STICKY_URL, async ({ request }) => {
        receivedBody = await request.json();
        return HttpResponse.json(responsePayload);
      }),
    );

    const result = await saveSticky('y', items);

    expect(result.items).toHaveLength(2);
    expect(receivedBody).toEqual({ items });
  });

  it('routes to correct color path — r', async () => {
    const items = makeItems([{ id: '1', text: 'red note' }]);
    const responsePayload = { items, updatedAt: null };

    let capturedUrl: string | undefined;
    server.use(
      http.put('/api/sticky/r', ({ request }) => {
        capturedUrl = new URL(request.url).pathname;
        return HttpResponse.json(responsePayload);
      }),
    );

    await saveSticky('r', items);

    expect(capturedUrl).toBe('/api/sticky/r');
  });

  it('routes to correct color path — g', async () => {
    const items = makeItems([{ id: '1', text: 'green note' }]);
    const responsePayload = { items, updatedAt: null };
    let capturedUrl: string | undefined;
    server.use(
      http.put('/api/sticky/g', ({ request }) => {
        capturedUrl = new URL(request.url).pathname;
        return HttpResponse.json(responsePayload);
      }),
    );
    await saveSticky('g', items);
    expect(capturedUrl).toBe('/api/sticky/g');
  });

  it('routes to correct color path — b', async () => {
    const items = makeItems([{ id: '1', text: 'blue note' }]);
    const responsePayload = { items, updatedAt: null };
    let capturedUrl: string | undefined;
    server.use(
      http.put('/api/sticky/b', ({ request }) => {
        capturedUrl = new URL(request.url).pathname;
        return HttpResponse.json(responsePayload);
      }),
    );
    await saveSticky('b', items);
    expect(capturedUrl).toBe('/api/sticky/b');
  });

  it('throws Error on HTTP 500 response', async () => {
    const items = makeItems([{ id: '1', text: 'fail' }]);
    server.use(
      http.put(STICKY_URL, () =>
        HttpResponse.json({ message: 'internal server error' }, { status: 500 }),
      ),
    );

    await expect(saveSticky('y', items)).rejects.toThrow('saveSticky: HTTP 500');
  });

  it('throws Error on HTTP 400 response', async () => {
    const items = makeItems([{ id: '1', text: 'bad' }]);
    server.use(
      http.put(STICKY_URL, () => HttpResponse.json({ message: 'bad request' }, { status: 400 })),
    );

    await expect(saveSticky('y', items)).rejects.toThrow('saveSticky: HTTP 400');
  });

  it('throws Error on HTTP 422 response', async () => {
    const items = makeItems([{ id: '1', text: 'invalid' }]);
    server.use(
      http.put(STICKY_URL, () =>
        HttpResponse.json({ message: 'unprocessable entity' }, { status: 422 }),
      ),
    );

    await expect(saveSticky('y', items)).rejects.toThrow('saveSticky: HTTP 422');
  });
});
