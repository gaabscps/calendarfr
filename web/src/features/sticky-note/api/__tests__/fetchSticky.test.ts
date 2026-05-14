/**
 * Unit tests for fetchSticky API function.
 *
 * Covers:
 * - AC-026, AC-027: fetchSticky makes GET /api/sticky/:color and returns parsed StickyResponse
 * - HTTP error (4xx/5xx) throws Error
 */

import { http, HttpResponse } from 'msw';

import { fetchSticky } from '../fetchSticky.js';

import { server } from '@/test-utils/msw/server';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STICKY_URL = '/api/sticky/y';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('fetchSticky', () => {
  it('AC-026/AC-027: returns parsed StickyResponse on 200', async () => {
    const payload = {
      items: [{ id: '1', prefix: '•', text: 'hello' }],
      updatedAt: '2026-05-13T00:00:00.000Z',
    };
    server.use(http.get(STICKY_URL, () => HttpResponse.json(payload)));

    const result = await fetchSticky('y');

    expect(result).toEqual(payload);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.text).toBe('hello');
    expect(result.updatedAt).toBe('2026-05-13T00:00:00.000Z');
  });

  it('returns StickyResponse with empty items array', async () => {
    const payload = { items: [], updatedAt: null };
    server.use(http.get(STICKY_URL, () => HttpResponse.json(payload)));

    const result = await fetchSticky('y');

    expect(result.items).toHaveLength(0);
    expect(result.updatedAt).toBeNull();
  });

  it('routes to correct color path — r', async () => {
    const payload = { items: [], updatedAt: null };
    server.use(http.get('/api/sticky/r', () => HttpResponse.json(payload)));

    const result = await fetchSticky('r');

    expect(result.items).toHaveLength(0);
  });

  it('routes to correct color path — g', async () => {
    const payload = { items: [], updatedAt: null };
    server.use(http.get('/api/sticky/g', () => HttpResponse.json(payload)));
    const result = await fetchSticky('g');
    expect(result.items).toHaveLength(0);
  });

  it('routes to correct color path — b', async () => {
    const payload = { items: [], updatedAt: null };
    server.use(http.get('/api/sticky/b', () => HttpResponse.json(payload)));
    const result = await fetchSticky('b');
    expect(result.items).toHaveLength(0);
  });

  it('throws Error on HTTP 400 response', async () => {
    server.use(
      http.get(STICKY_URL, () => HttpResponse.json({ message: 'bad request' }, { status: 400 })),
    );

    await expect(fetchSticky('y')).rejects.toThrow('fetchSticky: HTTP 400');
  });

  it('throws Error on HTTP 500 response', async () => {
    server.use(
      http.get(STICKY_URL, () =>
        HttpResponse.json({ message: 'internal server error' }, { status: 500 }),
      ),
    );

    await expect(fetchSticky('y')).rejects.toThrow('fetchSticky: HTTP 500');
  });

  it('throws Error on HTTP 404 response', async () => {
    server.use(
      http.get(STICKY_URL, () => HttpResponse.json({ message: 'not found' }, { status: 404 })),
    );

    await expect(fetchSticky('y')).rejects.toThrow('fetchSticky: HTTP 404');
  });
});
