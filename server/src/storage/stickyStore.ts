/**
 * stickyStore — atomic file persistence for global sticky notes.
 *
 * Pattern: write to tmp file → fs.rename (POSIX atomic) → final path.
 * Isolated from data/days/ — stored at data/sticky.json.
 *
 * Format V2: { schemaVersion: 2, colors: { [color]: { items, updatedAt } } }
 * Format V1 (legacy FEAT-020): { schemaVersion: 1, items: Note[], updatedAt }
 *
 * V1 → V2 migration is idempotent and runs on first read or write (AC-031).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import type { Note } from '@calendarfr/shared';

import { isEnoent, StorageCorruptError, StorageWriteError } from '../lib/errors.js';
import {
  stickyFileV1Schema,
  stickyFileV2Schema,
  type StickyColor,
  type StickyColorEntry,
  type StickyFileV2,
} from '../schema/stickySchema.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const DEFAULT_DATA_ROOT = 'data';
const STICKY_FILENAME = 'sticky.json';

function stickyPath(dataRoot = DEFAULT_DATA_ROOT): string {
  const root = path.isAbsolute(dataRoot) ? dataRoot : path.join(process.cwd(), dataRoot);
  return path.join(root, STICKY_FILENAME);
}

async function ensureStickyDir(dataRoot = DEFAULT_DATA_ROOT): Promise<void> {
  const dir = path.isAbsolute(dataRoot) ? dataRoot : path.join(process.cwd(), dataRoot);
  await fs.mkdir(dir, { recursive: true });
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

// Read and JSON-parse sticky.json. Returns null on ENOENT.
async function readRaw(filePath: string): Promise<unknown> {
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf-8');
  } catch (err) {
    if (isEnoent(err)) return null;
    throw new StorageCorruptError(filePath, err);
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    throw new StorageCorruptError(filePath, err);
  }
}

// Detect V1 format: root items array, no colors field, schemaVersion === 1.
function isV1Format(parsed: unknown): boolean {
  return (
    typeof parsed === 'object' &&
    parsed !== null &&
    'items' in parsed &&
    Array.isArray((parsed as Record<string, unknown>).items) &&
    !('colors' in parsed) &&
    (parsed as Record<string, unknown>).schemaVersion === 1
  );
}

// Write a StickyFileV2 atomically (tmp+rename).
async function writeV2Atomic(filePath: string, file: StickyFileV2): Promise<void> {
  const rand = Math.random().toString(36).slice(2, 8);
  const tmpPath = `${filePath}.tmp.${process.pid}.${rand}`;

  try {
    await fs.writeFile(tmpPath, JSON.stringify(file, null, 2), 'utf-8');
  } catch (err) {
    throw new StorageWriteError(tmpPath, err);
  }

  try {
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    // Best-effort cleanup of tmp file — ignore secondary errors
    await fs.unlink(tmpPath).catch(() => undefined);
    throw new StorageWriteError(filePath, err);
  }
}

// Migrate a V1 parsed object to StickyFileV2, write atomically, return V2.
async function migrateV1ToV2(parsed: unknown, filePath: string): Promise<StickyFileV2> {
  const v1Result = stickyFileV1Schema.safeParse(parsed);
  if (!v1Result.success) {
    throw new StorageCorruptError(
      filePath,
      new Error(`V1 schema validation failed: ${v1Result.error.message}`),
    );
  }

  const v2: StickyFileV2 = {
    schemaVersion: 2,
    colors: {
      y: {
        items: v1Result.data.items,
        updatedAt: v1Result.data.updatedAt,
      },
    },
  };

  await writeV2Atomic(filePath, v2);
  return v2;
}

// ---------------------------------------------------------------------------
// Write queue — serializes concurrent writeStickyColor calls (AC-029)
// ---------------------------------------------------------------------------

let _writeQueue: Promise<void> = Promise.resolve();

// ---------------------------------------------------------------------------
// Public API — V2 (multi-color)
// ---------------------------------------------------------------------------

/** Read the StickyColorEntry for color from data/sticky.json. AC-026, AC-027, AC-031 */
export async function readStickyColor(
  color: StickyColor,
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<StickyColorEntry | null> {
  const filePath = stickyPath(dataRoot);
  const parsed = await readRaw(filePath);

  if (parsed === null) return null;

  const v2Result = stickyFileV2Schema.safeParse(parsed);
  if (v2Result.success) {
    return v2Result.data.colors[color] ?? null;
  }

  if (isV1Format(parsed)) {
    const v2 = await migrateV1ToV2(parsed, filePath);
    return v2.colors[color] ?? null;
  }

  throw new StorageCorruptError(filePath, new Error('File is neither V1 nor V2 format'));
}

/** Write items for color into data/sticky.json (V2), serialized. Returns updatedAt. AC-029, AC-031 */
export async function writeStickyColor(
  color: StickyColor,
  items: Note[],
  dataRoot = DEFAULT_DATA_ROOT,
): Promise<string> {
  let updatedAt!: string;
  let caughtErr: unknown;
  _writeQueue = _writeQueue
    .then(async () => {
      updatedAt = await _writeStickyColorInner(color, items, dataRoot);
    })
    .catch((err: unknown) => {
      caughtErr = err;
    });
  await _writeQueue;
  if (caughtErr !== undefined)
    throw caughtErr instanceof Error ? caughtErr : new Error('writeStickyColor: unknown error');
  return updatedAt;
}

async function _writeStickyColorInner(
  color: StickyColor,
  items: Note[],
  dataRoot: string,
): Promise<string> {
  await ensureStickyDir(dataRoot);
  const filePath = stickyPath(dataRoot);
  const parsed = await readRaw(filePath);

  let file: StickyFileV2;

  if (parsed === null) {
    file = { schemaVersion: 2, colors: {} };
  } else {
    const v2Result = stickyFileV2Schema.safeParse(parsed);
    if (v2Result.success) {
      file = v2Result.data;
    } else if (isV1Format(parsed)) {
      file = await migrateV1ToV2(parsed, filePath);
    } else {
      throw new StorageCorruptError(filePath, new Error('File is neither V1 nor V2 format'));
    }
  }

  const updatedAt = new Date().toISOString();
  file.colors[color] = { items, updatedAt };

  await writeV2Atomic(filePath, file);
  return updatedAt;
}

// ---------------------------------------------------------------------------
// Backward-compat wrappers (FEAT-020 / legacy routes)
// ---------------------------------------------------------------------------

/** Read sticky notes (Yellow only). Returns null if missing. AC-018 (legacy) */
export async function readSticky(dataRoot = DEFAULT_DATA_ROOT): Promise<{
  schemaVersion: number;
  items: Note[];
  updatedAt: string;
} | null> {
  const entry = await readStickyColor('y', dataRoot);
  if (entry === null) return null;
  return {
    schemaVersion: 1,
    items: entry.items,
    updatedAt: entry.updatedAt,
  };
}

/** Write sticky notes (Yellow only) atomically. Returns updatedAt. AC-020 (legacy) */
export async function writeSticky(items: Note[], dataRoot = DEFAULT_DATA_ROOT): Promise<string> {
  return writeStickyColor('y', items, dataRoot);
}
