/**
 * cleanup.ts — Filesystem cleanup helpers for real E2E specs.
 *
 * Provides best-effort deletion of day data files created during tests.
 * Uses date `2099-12-31` (and adjacent dates) to avoid collisions with
 * real user data. `data/` is gitignored so no leftover files pollute VCS.
 */

import * as fs from 'fs/promises';
import * as path from 'path';

// Playwright test runner is always invoked from the repo root (where
// playwright.config.ts lives), so process.cwd() reliably resolves to
// the monorepo root. This avoids import.meta.url / __dirname gymnastics
// that conflict with Playwright's esbuild CJS transform.
export const REPO_ROOT: string = process.cwd();

// The companion server runs via `npm --workspace server run dev`, which sets
// process.cwd() to the `server/` workspace directory. Day files are therefore
// written to `server/data/days/` relative to the monorepo root — NOT `data/days/`.
const DATA_DAYS_DIR = path.join(REPO_ROOT, 'server', 'data', 'days');

/**
 * Deletes `data/days/<date>.json` relative to the repo root.
 *
 * Safety net: refuses to delete dates within ±30 days of today to prevent
 * accidental data loss if a spec uses a real/current date as fixture.
 * E2E specs must use fixture dates far in the future (e.g., 2099-12-31).
 *
 * Best-effort: ENOENT is silently ignored (file may not have been created
 * if the test was skipped or failed before the PUT). All other errors are
 * re-thrown so they surface in afterAll output.
 */
export async function cleanupDay(date: string): Promise<void> {
  const MS_PER_DAY = 86_400_000;
  const todayUtc = new Date();
  todayUtc.setUTCHours(0, 0, 0, 0);
  const targetUtc = new Date(`${date}T00:00:00Z`);
  const daysSinceToday = (targetUtc.getTime() - todayUtc.getTime()) / MS_PER_DAY;
  if (Math.abs(daysSinceToday) <= 30) {
    throw new Error(
      `cleanupDay: refusing to delete fixture date too close to today: ${date} ` +
        `(${Math.round(daysSinceToday)} days from today). ` +
        'Use a fixture date far from today (e.g., 2099-12-31).',
    );
  }

  const filePath = path.join(DATA_DAYS_DIR, `${date}.json`);
  try {
    await fs.rm(filePath, { force: true });
  } catch (err: unknown) {
    // force:true already suppresses ENOENT on Node ≥ 14.14, but be defensive.
    if (isNodeError(err) && err.code === 'ENOENT') {
      return;
    }
    throw err;
  }
}

/**
 * Reads and parses `data/days/<date>.json` relative to the repo root.
 * Returns `null` if the file does not exist (ENOENT).
 * Throws on any other FS or parse error.
 */
export async function readDayFile(date: string): Promise<unknown> {
  const filePath = path.join(DATA_DAYS_DIR, `${date}.json`);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as unknown;
  } catch (err: unknown) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      return null;
    }
    throw err;
  }
}

interface NodeErrnoException extends Error {
  code?: string;
}

function isNodeError(err: unknown): err is NodeErrnoException {
  return err instanceof Error && 'code' in err;
}
