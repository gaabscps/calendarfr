/**
 * E2E smoke spec: PUT + GET /api/days/:date roundtrip.
 *
 * Runs under `--project=smoke` against the companion server on localhost:3003
 * (start with `npm run dev:server` before running this spec).
 *
 * Validates AC-030: at least one Playwright spec that does PUT + GET and
 * asserts payload roundtrip equality.
 *
 * Date: 2099-12-31 is used to avoid collisions with real-data days.
 * Cleanup: not required — data/ is gitignored; future runs overwrite.
 */

import { expect, test } from '@playwright/test';

import { validPayload } from '../_helpers/payload.js';

const TEST_DATE = '2099-12-31';

test('PUT + GET /api/days/:date roundtrip matches payload (AC-030)', async ({ request }) => {
  const payload = validPayload(TEST_DATE);

  // ---- Step 1: PUT the day ----
  const putRes = await request.put(`/api/days/${TEST_DATE}`, { data: payload });
  expect(putRes.status()).toBe(200);

  // Server fills createdAt/updatedAt (overriding the null from the payload).
  // Use Omit to drop conflicting nullable fields before intersecting.
  const putBody = (await putRes.json()) as Omit<typeof payload, 'createdAt' | 'updatedAt'> & {
    createdAt: string;
    updatedAt: string;
  };

  // Server fills createdAt and updatedAt
  expect(putBody.date).toBe(TEST_DATE);
  expect(putBody.schemaVersion).toBe(1);
  expect(putBody.priorities).toHaveLength(3);
  expect(putBody.agenda).toHaveLength(18);
  expect(typeof putBody.createdAt).toBe('string');
  expect(typeof putBody.updatedAt).toBe('string');

  // ---- Step 2: GET the day and assert roundtrip ----
  const getRes = await request.get(`/api/days/${TEST_DATE}`);
  expect(getRes.status()).toBe(200);

  const getBody = (await getRes.json()) as typeof putBody;

  // Deep equality modulo updatedAt (server may differ by a few milliseconds
  // if the second PUT triggered a timestamp refresh — but here we just GET)
  expect(getBody.date).toBe(putBody.date);
  expect(getBody.schemaVersion).toBe(putBody.schemaVersion);
  expect(getBody.mood).toEqual(putBody.mood);
  expect(getBody.priorities).toEqual(putBody.priorities);
  expect(getBody.agenda).toEqual(putBody.agenda);
  expect(getBody.notes).toEqual(putBody.notes);
  expect(getBody.createdAt).toBe(putBody.createdAt);
  // updatedAt from GET equals the PUT echo (single write, no race)
  expect(getBody.updatedAt).toBe(putBody.updatedAt);
});
