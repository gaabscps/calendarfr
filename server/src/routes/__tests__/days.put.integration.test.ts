/**
 * @jest-environment node
 *
 * Integration tests for PUT /api/days/:date (scenarios 6-10).
 * T-013, AC-007, AC-008, AC-010, AC-013, AC-018, AC-028.
 *
 * Strategy: app.inject (Fastify in-memory — no port, no network).
 * Isolation: bootApp() creates a tmpDir and process.chdir to it so jsonStore's
 * relative "data/days" path resolves inside the isolated directory.
 */
import fs from 'node:fs/promises';

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
// Scenario 6: PUT invalid payload returns 400 VALIDATION_FAILED
// ---------------------------------------------------------------------------
it('PUT /api/days/2026-05-09 with priorities=2 returns 400 VALIDATION_FAILED', async () => {
  const payload = {
    ...validPayload('2026-05-09'),
    priorities: [
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZA', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZB', text: '', done: false },
    ],
  };

  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/2026-05-09',
    payload,
  });

  expect(res.statusCode).toBe(400);
  const body = res.json<{
    error: { code: string; details: { path: string; message: string }[] };
  }>();
  expect(body.error.code).toBe('VALIDATION_FAILED');
  expect(body.error.details.some((d) => d.path.startsWith('priorities'))).toBe(true);
});

// ---------------------------------------------------------------------------
// Scenario 7: PUT with body.date !== :date returns 400 DATE_MISMATCH
// ---------------------------------------------------------------------------
it('PUT /api/days/2026-05-09 with body.date=2026-05-10 returns 400 DATE_MISMATCH (AC-013)', async () => {
  const payload = validPayload('2026-05-10'); // body date is different

  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/2026-05-09',
    payload,
  });

  expect(res.statusCode).toBe(400);
  const body = res.json<{ error: { code: string } }>();
  expect(body.error.code).toBe('DATE_MISMATCH');
});

// ---------------------------------------------------------------------------
// Scenario 8: PUT XSS payload — <script> stripped, file on disk is clean
// ---------------------------------------------------------------------------
it('PUT XSS payload: <script> stripped, stored file clean (AC-018)', async () => {
  const payload: DailyPageData = {
    ...validPayload('2026-05-09'),
    priorities: [
      {
        id: '01HZZZZZZZZZZZZZZZZZZZZZZA',
        text: '<script>alert(1)</script><b>ok</b>',
        done: false,
      },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZB', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZC', text: '', done: false },
    ],
  };

  const putRes = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/2026-05-09',
    payload,
  });

  expect(putRes.statusCode).toBe(200);
  const putBody = putRes.json<DailyPageData>();
  expect(putBody.priorities[0]?.text).toBe('<b>ok</b>');

  // Subsequent GET also returns sanitized text
  const getRes = await ctx.app.inject({
    method: 'GET',
    url: '/api/days/2026-05-09',
  });
  const getBody = getRes.json<DailyPageData>();
  expect(getBody.priorities[0]?.text).toBe('<b>ok</b>');

  // File on disk must not contain <script>
  const raw = await fs.readFile(dayPath('2026-05-09'), 'utf-8');
  expect(raw).not.toContain('<script>');
});

// ---------------------------------------------------------------------------
// Scenario 9: 2nd PUT preserves createdAt and updates updatedAt (AC-008)
// ---------------------------------------------------------------------------
it('second PUT preserves createdAt and updates updatedAt (AC-008)', async () => {
  const payload = validPayload('2026-05-09');

  const first = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/2026-05-09',
    payload,
  });
  const firstBody = first.json<DailyPageData>();
  const originalCreatedAt = firstBody.createdAt;
  const originalUpdatedAt = firstBody.updatedAt;

  // 20ms delay to ensure distinct updatedAt ISO ms (bumped from 5ms to avoid flake)
  await new Promise<void>((r) => globalThis.setTimeout(r, 20));

  const second = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/2026-05-09',
    payload,
  });
  const secondBody = second.json<DailyPageData>();

  expect(secondBody.createdAt).toBe(originalCreatedAt); // preserved
  expect(secondBody.updatedAt).not.toBe(originalUpdatedAt); // updated
});

// ---------------------------------------------------------------------------
// Scenario 10a: PUT with invalid date format → 400 INVALID_DATE_FORMAT (AC-023)
// ---------------------------------------------------------------------------
it('PUT /api/days/not-a-date returns 400 INVALID_DATE_FORMAT (AC-023)', async () => {
  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/not-a-date',
    payload: {},
  });

  expect(res.statusCode).toBe(400);
  const body = res.json<{ error: { code: string; details: { received: string } } }>();
  expect(body.error.code).toBe('INVALID_DATE_FORMAT');
  expect(body.error.details.received).toBe('not-a-date');
});

// ---------------------------------------------------------------------------
// Scenario 10: PUT with fs.writeFile mock failing → 500 STORAGE_WRITE_FAILED
// ---------------------------------------------------------------------------
it('PUT with writeFile failure returns 500 STORAGE_WRITE_FAILED (AC-007)', async () => {
  const { default: fsPromises } = await import('node:fs/promises');
  const writeFileSpy = jest
    .spyOn(fsPromises, 'writeFile')
    .mockRejectedValueOnce(new Error('ENOSPC: no space left') as never);

  const payload = validPayload('2026-05-09');

  const res = await ctx.app.inject({
    method: 'PUT',
    url: '/api/days/2026-05-09',
    payload,
  });

  expect(res.statusCode).toBe(500);
  const body = res.json<{ error: { code: string } }>();
  expect(body.error.code).toBe('STORAGE_WRITE_FAILED');

  writeFileSpy.mockRestore();
});
