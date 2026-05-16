/**
 * @jest-environment node
 *
 * Unit tests for jsonStore (T-005, AC-026).
 *
 * Isolation: each test gets a fresh tmpDir via os.tmpdir() + fs.mkdtemp,
 * so tests never share or pollute real "data/days/".
 *
 * 10 active scenarios (0 skipped) — T-008 real daySchema landed in BATCH-A carry-over.
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { DailyPageData } from '@calendarfr/shared';
import { jest } from '@jest/globals';

import { StorageCorruptError, StorageWriteError } from '../../lib/errors';
import { dayPath, ensureDataDir, readDay, writeDay } from '../jsonStore';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeDay(date = '2099-01-01'): DailyPageData {
  return {
    schemaVersion: 1,
    date,
    mood: null,
    priorities: [
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZA', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZB', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZC', text: '', done: false },
    ],
    agenda: Array.from({ length: 18 }, (_, i) => ({
      hour: i + 6,
      text: '',
    })) as unknown as DailyPageData['agenda'],
    notes: [],
    intention: null,
    gratitude: [],
    createdAt: null,
    updatedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feat006-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Scenario 1: readDay returns null for non-existent file
// ---------------------------------------------------------------------------
it('readDay returns null for non-existent file', async () => {
  const result = await readDay('2099-01-01', tmpDir);
  expect(result).toBeNull();
});

// ---------------------------------------------------------------------------
// Scenario 2: readDay returns parsed DailyPageData for a well-formed file
// ---------------------------------------------------------------------------
it('readDay returns DailyPageData for well-formed file', async () => {
  const day = makeDay('2099-02-02');
  const filePath = dayPath('2099-02-02', tmpDir);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(day, null, 2), 'utf-8');

  const result = await readDay('2099-02-02', tmpDir);
  expect(result).toMatchObject({ date: '2099-02-02', schemaVersion: 1 });
});

// ---------------------------------------------------------------------------
// Scenario 3: readDay throws StorageCorruptError for syntactically invalid JSON
// ---------------------------------------------------------------------------
it('readDay throws StorageCorruptError for invalid JSON syntax', async () => {
  const filePath = dayPath('2099-03-03', tmpDir);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, '{ this is not json }', 'utf-8');

  await expect(readDay('2099-03-03', tmpDir)).rejects.toBeInstanceOf(StorageCorruptError);
});

// ---------------------------------------------------------------------------
// Scenario 4: readDay throws StorageCorruptError for JSON that fails zod
// (was skipped in BATCH-A — now un-skipped after T-008 real daySchema)
// Schema is z.array(prioritySchema).min(1): 0 items is invalid.
// ---------------------------------------------------------------------------
it('readDay throws StorageCorruptError for JSON valid but failing zod (e.g. priorities array of 0)', async () => {
  const badDay = {
    ...makeDay('2099-04-04'),
    priorities: [],
  };
  const filePath = dayPath('2099-04-04', tmpDir);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(badDay, null, 2), 'utf-8');

  await expect(readDay('2099-04-04', tmpDir)).rejects.toBeInstanceOf(StorageCorruptError);
});

// ---------------------------------------------------------------------------
// Scenario 5: writeDay creates file and directory lazily
// ---------------------------------------------------------------------------
it('writeDay creates the final file and data directory lazily', async () => {
  const day = makeDay('2099-05-05');
  // tmpDir exists but no subdirs — should be created automatically
  await writeDay(day, tmpDir);

  const filePath = dayPath('2099-05-05', tmpDir);
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw) as DailyPageData;
  expect(parsed.date).toBe('2099-05-05');
});

// ---------------------------------------------------------------------------
// Scenario 6: writeDay uses tmp + rename (no .tmp file after success)
// ---------------------------------------------------------------------------
it('writeDay leaves no orphan .tmp file on success', async () => {
  const day = makeDay('2099-06-06');
  await writeDay(day, tmpDir);

  const files = await fs.readdir(tmpDir);
  const tmpFiles = files.filter((f) => f.includes('.tmp.'));
  expect(tmpFiles).toHaveLength(0);

  const finalFile = files.find((f) => f === '2099-06-06.json');
  expect(finalFile).toBeDefined();
});

// ---------------------------------------------------------------------------
// Scenario 7: writeDay fails on writeFile → throws StorageWriteError,
//             no rename called, and pre-existing file stays intact
// ---------------------------------------------------------------------------
it('writeDay throws StorageWriteError if writeFile fails and does not corrupt existing file', async () => {
  // Write a valid day first so there's something on disk to preserve
  const originalDay = makeDay('2099-07-07');
  await writeDay(originalDay, tmpDir);

  // Spy on fs.writeFile to make it fail for the tmp write
  const writeFileSpy = jest
    .spyOn(fs, 'writeFile')
    .mockRejectedValueOnce(new Error('ENOSPC: no space left on device') as never);

  const renameSpy = jest.spyOn(fs, 'rename');

  await expect(
    writeDay({ ...originalDay, updatedAt: '2099-07-07T12:00:00.000Z' }, tmpDir),
  ).rejects.toBeInstanceOf(StorageWriteError);

  // rename must NOT have been called
  expect(renameSpy).not.toHaveBeenCalled();

  // Restore and verify original file is intact
  writeFileSpy.mockRestore();
  renameSpy.mockRestore();

  const raw = await fs.readFile(dayPath('2099-07-07', tmpDir), 'utf-8');
  const preserved = JSON.parse(raw) as DailyPageData;
  expect(preserved.updatedAt).toBeNull(); // original value
});

// ---------------------------------------------------------------------------
// Scenario 8: dayPath produces expected string with injected dataRoot
// ---------------------------------------------------------------------------
it('dayPath produces correct path with absolute dataRoot', () => {
  const result = dayPath('2099-08-08', '/tmp/test-root');
  expect(result).toBe('/tmp/test-root/2099-08-08.json');
});

it('dayPath produces correct path with relative dataRoot', () => {
  const result = dayPath('2099-08-08', 'data/days');
  expect(result).toBe(path.join(process.cwd(), 'data/days', '2099-08-08.json'));
});

// ---------------------------------------------------------------------------
// Bonus: ensureDataDir is idempotent (calling twice does not throw)
// ---------------------------------------------------------------------------
it('ensureDataDir is idempotent (safe to call multiple times)', async () => {
  await ensureDataDir(tmpDir);
  await expect(ensureDataDir(tmpDir)).resolves.toBeUndefined();
});

// ---------------------------------------------------------------------------
// Scenario 9b: readDay throws StorageCorruptError on non-ENOENT readFile error
// (e.g. EACCES — file exists but is not readable)
// ---------------------------------------------------------------------------
it('readDay throws StorageCorruptError when readFile fails with non-ENOENT error', async () => {
  const eaccesError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
  const readFileSpy = jest.spyOn(fs, 'readFile').mockRejectedValueOnce(eaccesError as never);

  await expect(readDay('2099-10-10', tmpDir)).rejects.toBeInstanceOf(StorageCorruptError);

  readFileSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// Scenario 9c: ensureDataDir() with no args (default dataRoot) creates
// "data/days" relative to cwd — exercises the default-arg branch.
// ---------------------------------------------------------------------------
it('ensureDataDir() with no args creates data/days relative to cwd', async () => {
  const originalCwd = process.cwd();
  process.chdir(tmpDir);
  try {
    await ensureDataDir();
    // Verify the default path was created
    const expectedDir = path.join(tmpDir, 'data', 'days');
    const stat = await fs.stat(expectedDir);
    expect(stat.isDirectory()).toBe(true);
  } finally {
    process.chdir(originalCwd);
  }
});

// ---------------------------------------------------------------------------
// Carry-over BATCH-A (logic-reviewer finding): rename failure wraps in StorageWriteError
// ---------------------------------------------------------------------------
it('writeDay throws StorageWriteError when fs.rename fails, leaving tmp file untouched', async () => {
  const day = makeDay('2099-09-09');

  const renameSpy = jest
    .spyOn(fs, 'rename')
    .mockRejectedValueOnce(new Error('EXDEV: cross-device link') as never);

  await expect(writeDay(day, tmpDir)).rejects.toBeInstanceOf(StorageWriteError);

  // tmp file should still exist (rename never succeeded)
  const files = await fs.readdir(tmpDir);
  const tmpFiles = files.filter((f) => f.includes('.tmp.'));
  expect(tmpFiles.length).toBeGreaterThan(0);

  renameSpy.mockRestore();
});
