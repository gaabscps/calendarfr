/**
 * Unit tests for dailyPageApi.
 *
 * Strategy: Use MSW handlers for all HTTP scenario tests (errors, happy path, URLs).
 * Use jest.spyOn(globalThis, 'fetch') for tests that need to inspect fetch init
 * options (keepalive). MSW intercepts at the network layer; the spy captures
 * the init object when mockResolvedValueOnce bypasses MSW.
 *
 * Covers: AC-043, AC-044, AC-045, AC-046, AC-047.
 */

import type { DailyPageData } from '@calendarfr/shared';
import { http, HttpResponse } from 'msw';

import { API_BASE_URL, fetchDay, HttpError, saveDay } from '../dailyPageApi';

import { server } from '@/test-utils/msw/server';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SKELETON_DAY: DailyPageData = {
  schemaVersion: 1,
  date: '2026-05-11',
  mood: null,
  priorities: [
    { id: '', text: '', done: false },
    { id: '', text: '', done: false },
    { id: '', text: '', done: false },
  ],
  agenda: Array.from({ length: 18 }, (_, i) => ({
    hour: i + 6,
    text: '',
  })) as unknown as DailyPageData['agenda'],
  notes: [],
  createdAt: null,
  updatedAt: null,
};

// ---------------------------------------------------------------------------
// Tests: fetchDay
// ---------------------------------------------------------------------------

describe('fetchDay', () => {
  describe('happy path', () => {
    it('GETs /api/days/:date and returns DailyPageData on 200', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json(SKELETON_DAY, { status: 200 }),
        ),
      );

      const result = await fetchDay('2026-05-11');
      expect(result).toEqual(SKELETON_DAY);
    });

    it('constructs the correct URL from the date parameter', async () => {
      let capturedUrl: string | undefined;
      server.use(
        http.get(`${API_BASE_URL}/api/days/2026-05-12`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(SKELETON_DAY, { status: 200 });
        }),
      );

      await fetchDay('2026-05-12');
      expect(capturedUrl).toBe(`${API_BASE_URL}/api/days/2026-05-12`);
    });

    it('returns a different date correctly', async () => {
      const otherDay: DailyPageData = { ...SKELETON_DAY, date: '2026-06-01' };
      server.use(
        http.get(`${API_BASE_URL}/api/days/2026-06-01`, () =>
          HttpResponse.json(otherDay, { status: 200 }),
        ),
      );

      const result = await fetchDay('2026-06-01');
      expect(result.date).toBe('2026-06-01');
    });
  });

  describe('HTTP errors', () => {
    it('throws HttpError with status 400 on 4xx response', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/days/bad-date`, () =>
          HttpResponse.json({ message: 'Bad Request' }, { status: 400 }),
        ),
      );

      await expect(fetchDay('bad-date')).rejects.toThrow(HttpError);
      await expect(fetchDay('bad-date')).rejects.toMatchObject({ status: 400 });
    });

    it('throws HttpError with status 500 on 5xx response', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
        ),
      );

      await expect(fetchDay('2026-05-11')).rejects.toThrow(HttpError);
      await expect(fetchDay('2026-05-11')).rejects.toMatchObject({ status: 500 });
    });

    it('includes the error message from response body', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json({ message: 'Validation failed' }, { status: 422 }),
        ),
      );

      await expect(fetchDay('2026-05-11')).rejects.toMatchObject({
        message: 'Validation failed',
        status: 422,
      });
    });

    it('falls back to generic message when response body is not parseable JSON', async () => {
      server.use(
        http.get(
          `${API_BASE_URL}/api/days/2026-05-11`,
          () =>
            new HttpResponse('not json', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            }),
        ),
      );

      await expect(fetchDay('2026-05-11')).rejects.toMatchObject({
        status: 503,
        message: 'HTTP 503',
      });
    });
  });

  describe('network errors', () => {
    it('propagates network errors when fetch connection fails', async () => {
      server.use(http.get(`${API_BASE_URL}/api/days/2026-05-11`, () => HttpResponse.error()));

      await expect(fetchDay('2026-05-11')).rejects.toThrow();
    });
  });

  describe('AbortController', () => {
    it('propagates AbortError when signal is aborted before request', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json(SKELETON_DAY, { status: 200 }),
        ),
      );

      // Use globalThis.AbortController to satisfy no-undef in test ESLint config
      const controller = new globalThis.AbortController();
      controller.abort();

      await expect(fetchDay('2026-05-11', { signal: controller.signal })).rejects.toMatchObject({
        name: 'AbortError',
      });
    });

    it('non-aborted signal does not interfere with successful fetch', async () => {
      server.use(
        http.get(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json(SKELETON_DAY, { status: 200 }),
        ),
      );

      const controller = new globalThis.AbortController();
      const result = await fetchDay('2026-05-11', { signal: controller.signal });
      expect(result).toEqual(SKELETON_DAY);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: saveDay
// ---------------------------------------------------------------------------

describe('saveDay', () => {
  describe('happy path', () => {
    it('PUTs /api/days/:date and returns saved DailyPageData on 200', async () => {
      const savedDay: DailyPageData = { ...SKELETON_DAY, updatedAt: '2026-05-11T10:00:00Z' };
      server.use(
        http.put(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json(savedDay, { status: 200 }),
        ),
      );

      const result = await saveDay({ date: '2026-05-11', body: SKELETON_DAY });
      expect(result).toEqual(savedDay);
    });

    it('constructs the correct URL from the date parameter', async () => {
      let capturedUrl: string | undefined;
      server.use(
        http.put(`${API_BASE_URL}/api/days/2026-05-11`, ({ request }) => {
          capturedUrl = request.url;
          return HttpResponse.json(SKELETON_DAY, { status: 200 });
        }),
      );

      await saveDay({ date: '2026-05-11', body: SKELETON_DAY });
      expect(capturedUrl).toBe(`${API_BASE_URL}/api/days/2026-05-11`);
    });

    it('serializes body as JSON', async () => {
      let capturedBody: unknown;
      server.use(
        http.put(`${API_BASE_URL}/api/days/2026-05-11`, async ({ request }) => {
          capturedBody = await request.json();
          return HttpResponse.json(SKELETON_DAY, { status: 200 });
        }),
      );

      await saveDay({ date: '2026-05-11', body: SKELETON_DAY });
      expect(capturedBody).toEqual(SKELETON_DAY);
    });
  });

  describe('keepalive option', () => {
    let fetchSpy: jest.SpyInstance;

    beforeEach(() => {
      // Use globalThis (typed in all TS environments) instead of global (Node-only)
      fetchSpy = jest.spyOn(globalThis, 'fetch');
    });

    afterEach(() => {
      fetchSpy.mockRestore();
    });

    it('forwards keepalive: true to fetch when specified', async () => {
      // Bypass MSW by providing a direct mock response via the spy.
      // This allows us to inspect the fetch init object directly.
      fetchSpy.mockResolvedValueOnce(
        new globalThis.Response(JSON.stringify(SKELETON_DAY), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await saveDay({ date: '2026-05-11', body: SKELETON_DAY }, { keepalive: true });

      const calledInit = (fetchSpy.mock.calls[0] as [string, { keepalive?: boolean }])[1];
      expect(calledInit?.keepalive).toBe(true);
    });

    it('uses keepalive: false by default', async () => {
      fetchSpy.mockResolvedValueOnce(
        new globalThis.Response(JSON.stringify(SKELETON_DAY), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      await saveDay({ date: '2026-05-11', body: SKELETON_DAY });

      const calledInit = (fetchSpy.mock.calls[0] as [string, { keepalive?: boolean }])[1];
      expect(calledInit?.keepalive).toBe(false);
    });
  });

  describe('HTTP errors', () => {
    it('throws HttpError with status 400 on 4xx response', async () => {
      server.use(
        http.put(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json({ message: 'Validation error' }, { status: 400 }),
        ),
      );

      await expect(saveDay({ date: '2026-05-11', body: SKELETON_DAY })).rejects.toThrow(HttpError);
      await expect(saveDay({ date: '2026-05-11', body: SKELETON_DAY })).rejects.toMatchObject({
        status: 400,
      });
    });

    it('throws HttpError with status 422 including message', async () => {
      server.use(
        http.put(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json({ message: 'Invalid request body' }, { status: 422 }),
        ),
      );

      await expect(saveDay({ date: '2026-05-11', body: SKELETON_DAY })).rejects.toMatchObject({
        status: 422,
        message: 'Invalid request body',
      });
    });

    it('throws HttpError with status 500 on 5xx response', async () => {
      server.use(
        http.put(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json({ message: 'Internal Server Error' }, { status: 500 }),
        ),
      );

      await expect(saveDay({ date: '2026-05-11', body: SKELETON_DAY })).rejects.toThrow(HttpError);
      await expect(saveDay({ date: '2026-05-11', body: SKELETON_DAY })).rejects.toMatchObject({
        status: 500,
      });
    });
  });

  describe('network errors', () => {
    it('propagates network errors when fetch connection fails', async () => {
      server.use(http.put(`${API_BASE_URL}/api/days/2026-05-11`, () => HttpResponse.error()));

      await expect(saveDay({ date: '2026-05-11', body: SKELETON_DAY })).rejects.toThrow();
    });
  });

  describe('AbortController', () => {
    it('propagates AbortError when signal is aborted', async () => {
      server.use(
        http.put(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json(SKELETON_DAY, { status: 200 }),
        ),
      );

      const controller = new globalThis.AbortController();
      controller.abort();

      await expect(
        saveDay({ date: '2026-05-11', body: SKELETON_DAY }, { signal: controller.signal }),
      ).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('non-aborted signal does not interfere with successful save', async () => {
      server.use(
        http.put(`${API_BASE_URL}/api/days/2026-05-11`, () =>
          HttpResponse.json(SKELETON_DAY, { status: 200 }),
        ),
      );

      const controller = new globalThis.AbortController();
      const result = await saveDay(
        { date: '2026-05-11', body: SKELETON_DAY },
        { signal: controller.signal },
      );
      expect(result).toEqual(SKELETON_DAY);
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: API_BASE_URL
// ---------------------------------------------------------------------------

describe('API_BASE_URL', () => {
  it('exports a non-empty string', () => {
    expect(typeof API_BASE_URL).toBe('string');
    expect(API_BASE_URL.length).toBeGreaterThan(0);
  });

  it('defaults to localhost:3003 in test env (no VITE_API_URL set)', () => {
    // In Jest, globalThis.__VITE_API_URL__ is not set by default,
    // so the fallback 'http://localhost:3003' is used.
    expect(API_BASE_URL).toBe('http://localhost:3003');
  });
});

// ---------------------------------------------------------------------------
// Tests: HttpError
// ---------------------------------------------------------------------------

describe('HttpError', () => {
  it('is instanceof Error', () => {
    const err = new HttpError(404, 'Not found');
    expect(err).toBeInstanceOf(Error);
  });

  it('is instanceof HttpError', () => {
    const err = new HttpError(404, 'Not found');
    expect(err).toBeInstanceOf(HttpError);
  });

  it('has the correct name', () => {
    const err = new HttpError(500, 'Server error');
    expect(err.name).toBe('HttpError');
  });

  it('has the correct status', () => {
    const err = new HttpError(422, 'Unprocessable');
    expect(err.status).toBe(422);
  });

  it('has the correct message', () => {
    const err = new HttpError(400, 'Bad request');
    expect(err.message).toBe('Bad request');
  });
});
