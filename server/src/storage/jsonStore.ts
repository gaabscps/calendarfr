/**
 * jsonStore — atomic file persistence for DailyPageData.
 *
 * Pattern: write to tmp file → fs.rename (POSIX atomic) → final path.
 * Never leaves a half-written file on disk (covers AC-005, AC-006, AC-007).
 *
 * All functions accept an optional `dataRoot` for test isolation
 * (inject os.tmpdir() subdir in tests instead of "data/days").
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import type { DailyPageData } from '@calendarfr/shared';

import { StorageCorruptError, StorageWriteError } from '../lib/errors.js';
import { daySchema } from '../schema/daySchema.js';

const DEFAULT_DATA_ROOT = 'data/days';

/**
 * Absolute path to the JSON file for a given date. AC-003
 * If dataRoot is already absolute, uses it directly (supports test injection).
 * If dataRoot is relative, resolves against process.cwd().
 */
export const dayPath = (date: string, dataRoot = DEFAULT_DATA_ROOT): string => {
  const root = path.isAbsolute(dataRoot) ? dataRoot : path.join(process.cwd(), dataRoot);
  return path.join(root, `${date}.json`);
};

/** Idempotent directory creation. AC-006 */
export async function ensureDataDir(dataRoot = DEFAULT_DATA_ROOT): Promise<void> {
  const dir = path.isAbsolute(dataRoot) ? dataRoot : path.join(process.cwd(), dataRoot);
  await fs.mkdir(dir, { recursive: true });
}

/**
 * Read a day from disk.
 * Returns null if the file does not exist (ENOENT).
 * Throws StorageCorruptError if JSON is invalid or zod validation fails. AC-003, AC-004
 */
export async function readDay(
  date: string,
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<DailyPageData | null> {
  const filePath = dayPath(date, dataRoot);

  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (isEnoent(err)) return null;
    throw new StorageCorruptError(filePath, err);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new StorageCorruptError(filePath, err);
  }

  const result = daySchema.safeParse(parsed);
  if (!result.success) {
    throw new StorageCorruptError(filePath, result.error);
  }

  return result.data;
}

/**
 * Write a day to disk atomically.
 * 1. ensureDataDir (lazy mkdir)
 * 2. write to tmpPath (.tmp.<pid>.<rand6>)
 * 3. rename(tmp → final)  ← POSIX atomic on same filesystem
 *
 * If step 2 fails → throws StorageWriteError WITHOUT calling rename (AC-007).
 * Concurrent PUTs generate distinct tmp suffixes (NFR-005 last-write-wins). AC-005
 */
export async function writeDay(day: DailyPageData, dataRoot = DEFAULT_DATA_ROOT): Promise<void> {
  await ensureDataDir(dataRoot);

  const finalPath = dayPath(day.date, dataRoot);
  const rand = Math.random().toString(36).slice(2, 8);
  const tmpPath = `${finalPath}.tmp.${process.pid}.${rand}`;

  try {
    await fs.writeFile(tmpPath, JSON.stringify(day, null, 2), 'utf-8');
  } catch (err) {
    // Do NOT call rename — AC-007: file write failure must not corrupt finalPath.
    throw new StorageWriteError(tmpPath, err);
  }

  try {
    await fs.rename(tmpPath, finalPath);
  } catch (err) {
    throw new StorageWriteError(finalPath, err);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isEnoent(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
