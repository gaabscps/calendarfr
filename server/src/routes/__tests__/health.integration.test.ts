/**
 * @jest-environment node
 *
 * Integration tests for GET /api/health.
 * Covers the health route handler (unit-level via app.inject).
 * AC-025 (Content-Type application/json).
 */
import { bootApp, teardownApp } from './helpers';
import type { AppContext } from './helpers';

let ctx: AppContext;

beforeEach(async () => {
  ctx = await bootApp();
});

afterEach(async () => {
  await teardownApp(ctx);
});

it('GET /api/health returns 200 with status ok and version', async () => {
  const res = await ctx.app.inject({
    method: 'GET',
    url: '/api/health',
  });

  expect(res.statusCode).toBe(200);
  const body = res.json<{ status: string; version: string }>();
  expect(body.status).toBe('ok');
  expect(typeof body.version).toBe('string');
});
