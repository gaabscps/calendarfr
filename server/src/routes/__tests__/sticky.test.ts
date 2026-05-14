/**
 * @jest-environment node
 *
 * Integration tests for GET /api/sticky and PUT /api/sticky (T-004).
 * Covers: AC-017, AC-018, AC-019, AC-020, AC-021.
 *
 * Strategy: app.inject (Fastify in-memory — no port, no network).
 * Isolation: bootApp() creates a tmpDir and process.chdir to it so stickyStore's
 * relative "data" path resolves inside the isolated directory.
 */
import type { Note } from '@calendarfr/shared';
import { jest } from '@jest/globals';

import { ErrorCode } from '../../lib/errors';

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
    text: 'global note',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: GET /api/sticky returns lazy empty response when no file exists (AC-018)
// ---------------------------------------------------------------------------
it('GET /api/sticky returns { items: [], updatedAt: null } when no file exists (AC-018)', async () => {
  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky',
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<{ items: Note[]; updatedAt: string | null }>();
  expect(body.items).toEqual([]);
  expect(body.updatedAt).toBeNull();
});

// ---------------------------------------------------------------------------
// Scenario 2: GET /api/sticky returns items after a successful PUT (AC-018)
// ---------------------------------------------------------------------------
it('GET /api/sticky returns saved items after PUT (AC-018)', async () => {
  const items = [validNote()];

  const putRes = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky',
    payload: { items },
  });
  expect(putRes.statusCode).toBe(200);

  const getRes = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky',
  });
  expect(getRes.statusCode).toBe(200);
  const body = getRes.json<{ items: Note[]; updatedAt: string }>();
  expect(body.items).toHaveLength(1);
  expect(body.items[0]!.text).toBe('global note');
  expect(typeof body.updatedAt).toBe('string');
});

// ---------------------------------------------------------------------------
// Scenario 3: PUT /api/sticky with valid body → 200 with { items, updatedAt } (AC-020, AC-021)
// updatedAt is an ISO 8601 string.
// ---------------------------------------------------------------------------
it('PUT /api/sticky with valid body returns 200 with items and ISO updatedAt (AC-020, AC-021)', async () => {
  const items = [
    validNote({ id: '01HZZZZZZZZZZZZZZZZZZZZZZA', text: 'first' }),
    validNote({ id: '01HZZZZZZZZZZZZZZZZZZZZZZB', prefix: '→', text: 'second' }),
  ];

  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky',
    payload: { items },
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<{ items: Note[]; updatedAt: string }>();
  expect(body.items).toHaveLength(2);
  expect(body.items[0]!.text).toBe('first');
  expect(body.items[1]!.prefix).toBe('→');
  // updatedAt must be an ISO 8601 string (AC-021)
  expect(typeof body.updatedAt).toBe('string');
  expect(body.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
});

// ---------------------------------------------------------------------------
// Scenario 4: PUT /api/sticky with invalid body → 400 VALIDATION_FAILED (AC-021)
// Invalid: prefix not in enum, missing id.
// ---------------------------------------------------------------------------
it('PUT /api/sticky with invalid body returns 400 VALIDATION_FAILED (AC-021)', async () => {
  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky',
    payload: { items: [{ id: '', prefix: 'INVALID', text: 'oops' }] },
  });

  expect(res.statusCode).toBe(400);
  const body = res.json<{ error: { code: string } }>();
  expect(body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
});

// ---------------------------------------------------------------------------
// Scenario 5: PUT /api/sticky sanitizes HTML — <script> removed, <b> preserved (AC-019)
// ---------------------------------------------------------------------------
it('PUT /api/sticky strips <script> but preserves <b> in item.text (AC-019)', async () => {
  const items = [validNote({ text: '<script>alert(1)</script><b>safe</b>' })];

  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky',
    payload: { items },
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<{ items: Note[]; updatedAt: string }>();
  expect(body.items[0]!.text).toBe('<b>safe</b>');
  expect(body.items[0]!.text).not.toContain('<script>');

  // Subsequent GET also returns sanitized text (file on disk is clean)
  const getRes = await ctx.app.inject({
    method: 'GET',
    url: '/api/sticky',
  });
  const getBody = getRes.json<{ items: Note[] }>();
  expect(getBody.items[0]!.text).toBe('<b>safe</b>');
});

// ---------------------------------------------------------------------------
// Scenario 6: PUT /api/sticky with empty items array → 200 (valid — 0 items is allowed)
// ---------------------------------------------------------------------------
it('PUT /api/sticky with empty items array returns 200 (AC-020)', async () => {
  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/sticky',
    payload: { items: [] },
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<{ items: Note[]; updatedAt: string }>();
  expect(body.items).toEqual([]);
  expect(typeof body.updatedAt).toBe('string');
});
