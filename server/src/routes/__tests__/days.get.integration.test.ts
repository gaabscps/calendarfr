/**
 * @jest-environment node
 *
 * Integration tests for GET /api/days/:date (scenarios 1-5).
 * T-013, AC-001, AC-002, AC-004, AC-023, AC-028.
 *
 * Strategy: app.inject (Fastify in-memory — no port, no network).
 * Isolation: bootApp() creates a tmpDir and process.chdir to it so jsonStore's
 * relative "data/days" path resolves inside the isolated directory.
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import type { DailyPageData } from '@calendarfr/shared';
import { jest } from '@jest/globals';

import { dayPath } from '../../storage/jsonStore';

import { bootApp, teardownApp, validPayload } from './helpers';
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
// Scenario 1: GET day that doesn't exist returns 200 skeleton + NO file created
// ---------------------------------------------------------------------------
it('GET /api/days/2030-12-31 returns 200 skeleton and creates no file (AC-002)', async () => {
  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/days/2030-12-31',
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<DailyPageData>();
  expect(body.date).toBe('2030-12-31');
  expect(body.schemaVersion).toBe(1);
  expect(body.mood).toBeNull();
  expect(body.priorities).toHaveLength(3);
  expect(body.agenda).toHaveLength(18);
  expect(body.notes).toHaveLength(0);
  expect(body.createdAt).toBeNull();
  expect(body.updatedAt).toBeNull();

  // No file should be written (AC-002)
  await expect(fs.access(dayPath('2030-12-31'))).rejects.toMatchObject({ code: 'ENOENT' });
});

// ---------------------------------------------------------------------------
// Scenario 2: GET day after PUT returns persisted data
// ---------------------------------------------------------------------------
it('GET /api/days/2026-05-09 after PUT returns persisted content', async () => {
  const payload = validPayload('2026-05-09');

  const putRes = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/2026-05-09',
    payload,
  });
  expect(putRes.statusCode).toBe(200);

  const getRes = await ctx.app.inject({
    method: 'GET',
    url: '/api/days/2026-05-09',
  });
  expect(getRes.statusCode).toBe(200);
  const body = getRes.json<DailyPageData>();
  expect(body.date).toBe('2026-05-09');
});

// ---------------------------------------------------------------------------
// Scenario 3: GET with invalid date format returns 400 INVALID_DATE_FORMAT
// ---------------------------------------------------------------------------
it('GET /api/days/foo returns 400 INVALID_DATE_FORMAT', async () => {
  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/days/foo',
  });

  expect(res.statusCode).toBe(400);
  const body = res.json<{ error: { code: string; details: { received: string } } }>();
  expect(body.error.code).toBe('INVALID_DATE_FORMAT');
  expect(body.error.details.received).toBe('foo');
});

// ---------------------------------------------------------------------------
// Scenario 4: GET day with corrupt JSON file returns 500 STORAGE_CORRUPT
// ---------------------------------------------------------------------------
it('GET /api/days/2026-05-09 with corrupt file returns 500 STORAGE_CORRUPT (AC-004)', async () => {
  // Write a corrupt file manually
  const dir = path.join(ctx.tmpDir, 'data', 'days');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, '2026-05-09.json'), '{ corrupted json }', 'utf-8');

  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/days/2026-05-09',
  });

  expect(res.statusCode).toBe(500);
  const body = res.json<{ error: { code: string } }>();
  expect(body.error.code).toBe('STORAGE_CORRUPT');
});

// ---------------------------------------------------------------------------
// Scenario 5: PUT valid payload returns 200 echo with createdAt/updatedAt
// ---------------------------------------------------------------------------
it('PUT /api/days/2026-05-09 with valid payload returns 200 echo with timestamps', async () => {
  const payload = validPayload('2026-05-09');

  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/2026-05-09',
    payload,
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<DailyPageData>();
  expect(body.date).toBe('2026-05-09');
  expect(typeof body.createdAt).toBe('string');
  expect(typeof body.updatedAt).toBe('string');

  // File should be on disk
  const raw = await fs.readFile(dayPath('2026-05-09'), 'utf-8');
  const stored = JSON.parse(raw) as DailyPageData;
  expect(stored.date).toBe('2026-05-09');
});
