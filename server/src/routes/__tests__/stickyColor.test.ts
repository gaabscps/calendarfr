/**
 * @jest-environment node
 *
 * Integration tests for GET /api/sticky/:color and PUT /api/sticky/:color (FEAT-021).
 * Covers: AC-026, AC-027, AC-029, AC-030, AC-031.
 *
 * Strategy: app.inject (Fastify in-memory — no port, no network).
 * Isolation: bootApp() creates a tmpDir and process.chdir to it so stickyStore's
 * relative "data" path resolves inside the isolated directory.
 */
import type { Note } from '@calendarfr/shared';
import { jest } from '@jest/globals';

import { bootApp, teardownApp } from './helpers';
import type { AppContext } from './helpers';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let ctx: AppContext;

beforeEach(async () => {
  ctx = await bootApp();
});

afterEach(async () => {
  await teardownApp(ctx);
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function validNote(overrides?: Partial<Note>): Note {
  return {
    id: '01HZZZZZZZZZZZZZZZZZZZZZZA',
    prefix: '•',
    text: 'color note',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: GET /api/sticky/:color returns lazy empty when no data (AC-026, AC-027)
// ---------------------------------------------------------------------------
it('GET /api/sticky/r returns { items: [], updatedAt: null } when no data (AC-026, AC-027)', async () => {
  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky/r',
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<{ items: Note[]; updatedAt: string | null }>();
  expect(body.items).toEqual([]);
  expect(body.updatedAt).toBeNull();
});

// ---------------------------------------------------------------------------
// Scenario 2: GET /api/sticky/:color returns stored items after PUT (AC-026, AC-027)
// ---------------------------------------------------------------------------
it('GET /api/sticky/g returns saved items after PUT /api/sticky/g (AC-026, AC-027)', async () => {
  const items = [validNote({ id: '01HZZZZZZZZZZZZZZZZZZZZZZ1', text: 'green note' })];

  const putRes = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky/g',
    payload: { items },
  });
  expect(putRes.statusCode).toBe(200);

  const getRes = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky/g',
  });
  expect(getRes.statusCode).toBe(200);
  const body = getRes.json<{ items: Note[]; updatedAt: string }>();
  expect(body.items).toHaveLength(1);
  expect(body.items[0]!.text).toBe('green note');
  expect(typeof body.updatedAt).toBe('string');
});

// ---------------------------------------------------------------------------
// Scenario 3: PUT /api/sticky/:color stores and returns { items, updatedAt } (AC-029)
// ---------------------------------------------------------------------------
it('PUT /api/sticky/b stores items and returns { items, updatedAt } (AC-029)', async () => {
  const items = [
    validNote({ id: '01HZZZZZZZZZZZZZZZZZZZZZZ2', text: 'blue note 1' }),
    validNote({ id: '01HZZZZZZZZZZZZZZZZZZZZZZ3', prefix: '→', text: 'blue note 2' }),
  ];

  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky/b',
    payload: { items },
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<{ items: Note[]; updatedAt: string }>();
  expect(body.items).toHaveLength(2);
  expect(body.items[0]!.text).toBe('blue note 1');
  expect(body.items[1]!.prefix).toBe('→');
  expect(typeof body.updatedAt).toBe('string');
  expect(body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

// ---------------------------------------------------------------------------
// Scenario 4: GET /api/sticky/x returns 400 { error: 'invalid color' } (AC-030)
// ---------------------------------------------------------------------------
it('GET /api/sticky/x returns 400 with invalid color error (AC-030)', async () => {
  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky/x',
  });

  expect(res.statusCode).toBe(400);
  const body = res.json<{ error: string }>();
  expect(body.error).toBe('invalid color');
});

// ---------------------------------------------------------------------------
// Scenario 5: PUT /api/sticky/x returns 400 { error: 'invalid color' } (AC-030)
// ---------------------------------------------------------------------------
it('PUT /api/sticky/x returns 400 with invalid color error (AC-030)', async () => {
  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky/x',
    payload: { items: [] },
  });

  expect(res.statusCode).toBe(400);
  const body = res.json<{ error: string }>();
  expect(body.error).toBe('invalid color');
});

// ---------------------------------------------------------------------------
// Scenario 6: Legacy GET /api/sticky delegates to 'y' color (AC-031)
// Yellow data written via /api/sticky/y must be readable via /api/sticky.
// ---------------------------------------------------------------------------
it('Legacy GET /api/sticky reads yellow data written via PUT /api/sticky/y (AC-031)', async () => {
  const items = [validNote({ id: '01HZZZZZZZZZZZZZZZZZZZZZZ4', text: 'yellow via color route' })];

  await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky/y',
    payload: { items },
  });

  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky',
  });
  expect(res.statusCode).toBe(200);
  const body = res.json<{ items: Note[]; updatedAt: string }>();
  expect(body.items[0]!.text).toBe('yellow via color route');
});

// ---------------------------------------------------------------------------
// Scenario 7b: Legacy PUT /api/sticky writes yellow data and responds correctly (AC-031)
// ---------------------------------------------------------------------------
it('PUT /api/sticky stores items and returns { items, updatedAt }, GET /api/sticky returns same (AC-031)', async () => {
  const items = [validNote({ id: '01HZZZZZZZZZZZZZZZZZZZZZZ6', text: 'legacy put yellow' })];

  const putRes = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky',
    payload: { items },
  });

  expect(putRes.statusCode).toBe(200);
  const putBody = putRes.json<{ items: Note[]; updatedAt: string }>();
  expect(putBody.items).toHaveLength(1);
  expect(putBody.items[0]!.text).toBe('legacy put yellow');
  expect(typeof putBody.updatedAt).toBe('string');
  expect(putBody.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

  const getRes = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky',
  });
  expect(getRes.statusCode).toBe(200);
  const getBody = getRes.json<{ items: Note[]; updatedAt: string }>();
  expect(getBody.items).toHaveLength(1);
  expect(getBody.items[0]!.text).toBe('legacy put yellow');
});

// ---------------------------------------------------------------------------
// Scenario 7: Colors are independent — PUT /api/sticky/r does not affect /api/sticky/b (AC-026)
// ---------------------------------------------------------------------------
it('PUT /api/sticky/r does not affect GET /api/sticky/b data (AC-026)', async () => {
  const redItems = [validNote({ id: '01HZZZZZZZZZZZZZZZZZZZZZZ5', text: 'red only' })];
  await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky/r',
    payload: { items: redItems },
  });

  const blueRes = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky/b',
  });
  expect(blueRes.statusCode).toBe(200);
  const body = blueRes.json<{ items: Note[]; updatedAt: null }>();
  expect(body.items).toEqual([]);
  expect(body.updatedAt).toBeNull();
});
