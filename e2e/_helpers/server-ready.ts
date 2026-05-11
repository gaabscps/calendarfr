/**
 * server-ready.ts — Companion server health-check helper.
 *
 * Polls GET /api/health until 200 OK before real specs proceed.
 * This avoids race conditions where Playwright starts tests before the
 * companion Fastify server has finished booting.
 *
 * Usage in spec beforeAll:
 *   import { waitForCompanion } from '../_helpers/server-ready.js';
 *   test.beforeAll(async () => { await waitForCompanion(); });
 */

/* global fetch, setTimeout */

const DEFAULT_BASE_URL = 'http://localhost:3003';
const POLL_INTERVAL_MS = 250;
const TIMEOUT_MS = 10_000;

/**
 * Polls `GET <baseURL>/api/health` every 250ms until it returns HTTP 200,
 * or throws if the timeout (default 10s) is exceeded.
 *
 * @param baseURL - Companion server base URL. Defaults to `http://localhost:3003`.
 */
export async function waitForCompanion(baseURL: string = DEFAULT_BASE_URL): Promise<void> {
  const healthURL = `${baseURL}/api/health`;
  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const res = await fetch(healthURL);
      if (res.ok) {
        return; // Companion is ready.
      }
    } catch {
      // Network error — companion not up yet. Keep polling.
    }
    await sleep(POLL_INTERVAL_MS);
  }

  throw new Error(
    `waitForCompanion: companion server at ${healthURL} did not respond with 200 within ${TIMEOUT_MS}ms.\n` +
      'Make sure the companion is running: npm run dev:server',
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
