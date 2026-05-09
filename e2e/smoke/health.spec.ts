import { expect, test } from '@playwright/test';

test('GET /api/health returns ok', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  const body = (await res.json()) as { status: string; version: string };
  expect(body.status).toBe('ok');
  expect(body).toHaveProperty('version');
});
