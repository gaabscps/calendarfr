/**
 * @jest-environment node
 *
 * Unit tests for stickyStore (T-004, AC-018, AC-020).
 *
 * Isolation: each test gets a fresh tmpDir via os.tmpdir() + fs.mkdtemp,
 * so tests never share or pollute real "data/sticky.json".
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { jest } from '@jest/globals';

import { StorageCorruptError, StorageWriteError } from '../../lib/errors';
import { readSticky, readStickyColor, writeStickyColor, writeSticky } from '../stickyStore';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feat020-sticky-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  jest.restoreAllMocks();
});

it('readSticky returns null when sticky.json does not exist (AC-018)', async () => {
  const result = await readSticky(tmpDir);
  expect(result).toBeNull();
});

it('writeSticky creates file and readSticky returns the written items (AC-020)', async () => {
  const items = [{ id: '01HZZZZZZZZZZZZZZZZZZZZZZA', prefix: '•' as const, text: 'hello' }];

  const updatedAt = await writeSticky(items, tmpDir);
  expect(typeof updatedAt).toBe('string');
  expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

  const data = await readSticky(tmpDir);
  expect(data).not.toBeNull();
  expect(data!.items).toHaveLength(1);
  expect(data!.items[0]!.text).toBe('hello');
  expect(data!.updatedAt).toBe(updatedAt);
  expect(data!.schemaVersion).toBe(1);
});

it('writeSticky leaves no orphan .tmp. file on success', async () => {
  const items = [{ id: '01HZZZZZZZZZZZZZZZZZZZZZZA', prefix: '•' as const, text: '' }];

  await writeSticky(items, tmpDir);

  const files = await fs.readdir(tmpDir);
  const tmpFiles = files.filter((f) => f.includes('.tmp.'));
  expect(tmpFiles).toHaveLength(0);

  const finalFile = files.find((f) => f === 'sticky.json');
  expect(finalFile).toBeDefined();
});

it('readSticky throws StorageCorruptError when sticky.json contains invalid JSON', async () => {
  const filePath = path.join(tmpDir, 'sticky.json');
  await fs.writeFile(filePath, '{ this is not json }', 'utf-8');

  await expect(readSticky(tmpDir)).rejects.toBeInstanceOf(StorageCorruptError);
});

it('writeSticky throws StorageWriteError when writeFile fails', async () => {
  const writeFileSpy = jest
    .spyOn(fs, 'writeFile')
    .mockRejectedValueOnce(new Error('ENOSPC: no space left on device') as never);

  const items = [{ id: '01HZZZZZZZZZZZZZZZZZZZZZZA', prefix: '•' as const, text: '' }];

  await expect(writeSticky(items, tmpDir)).rejects.toBeInstanceOf(StorageWriteError);
  expect(writeFileSpy).toHaveBeenCalled();
});

it('readSticky throws StorageCorruptError when readFile fails with non-ENOENT error', async () => {
  const eaccesError = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
  const readFileSpy = jest.spyOn(fs, 'readFile').mockRejectedValueOnce(eaccesError as never);

  await expect(readSticky(tmpDir)).rejects.toBeInstanceOf(StorageCorruptError);

  readFileSpy.mockRestore();
});

// ---------------------------------------------------------------------------
// V2 multi-color tests — readStickyColor / writeStickyColor
// ---------------------------------------------------------------------------

// Shared items fixture
const NOTE_A = { id: '01HZZZZZZZZZZZZZZZZZZZZZZA', prefix: '•' as const, text: 'note-a' };
const NOTE_B = { id: '01HZZZZZZZZZZZZZZZZZZZZZZB', prefix: '•' as const, text: 'note-b' };

describe('readStickyColor', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'feat021-sc-r-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('returns null when sticky.json does not exist (AC-026, AC-027)', async () => {
    expect(await readStickyColor('y', dir)).toBeNull();
  });

  it('returns entry for existing V2 color (AC-026, AC-027)', async () => {
    const v2 = {
      schemaVersion: 2,
      colors: { y: { items: [NOTE_A], updatedAt: '2026-01-01T00:00:00.000Z' } },
    };
    await fs.writeFile(path.join(dir, 'sticky.json'), JSON.stringify(v2), 'utf-8');
    const entry = await readStickyColor('y', dir);
    expect(entry).not.toBeNull();
    expect(entry!.items[0]!.text).toBe('note-a');
  });

  it('returns null for color not present in V2 file (AC-027)', async () => {
    const v2 = {
      schemaVersion: 2,
      colors: { y: { items: [NOTE_A], updatedAt: '2026-01-01T00:00:00.000Z' } },
    };
    await fs.writeFile(path.join(dir, 'sticky.json'), JSON.stringify(v2), 'utf-8');
    expect(await readStickyColor('r', dir)).toBeNull();
    expect(await readStickyColor('g', dir)).toBeNull();
    expect(await readStickyColor('b', dir)).toBeNull();
  });

  it('migrates V1 on first read and returns y data (AC-031)', async () => {
    const v1 = {
      schemaVersion: 1,
      items: [NOTE_A],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await fs.writeFile(path.join(dir, 'sticky.json'), JSON.stringify(v1), 'utf-8');
    const entry = await readStickyColor('y', dir);
    expect(entry).not.toBeNull();
    expect(entry!.items[0]!.text).toBe('note-a');
  });

  it('after V1 migration, file is now V2 format (AC-031)', async () => {
    const v1 = {
      schemaVersion: 1,
      items: [NOTE_A],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await fs.writeFile(path.join(dir, 'sticky.json'), JSON.stringify(v1), 'utf-8');
    await readStickyColor('y', dir);
    const raw = JSON.parse(await fs.readFile(path.join(dir, 'sticky.json'), 'utf-8')) as Record<
      string,
      unknown
    >;
    expect(raw['schemaVersion']).toBe(2);
    expect(typeof raw['colors']).toBe('object');
  });

  it('AC-031: second read after V1 migration returns same data without re-migrating', async () => {
    const v1Data = {
      schemaVersion: 1,
      items: [{ id: '01HZZZZZZZZZZZZZZZZZZZZZZA', prefix: '•' as const, text: 'hello' }],
      updatedAt: new Date().toISOString(),
    };
    await fs.writeFile(path.join(dir, 'sticky.json'), JSON.stringify(v1Data), 'utf-8');

    const first = await readStickyColor('y', dir);
    expect(first?.items[0]?.text).toBe('hello');

    const second = await readStickyColor('y', dir);
    expect(second?.items[0]?.text).toBe('hello');
    expect(second?.updatedAt).toBe(first?.updatedAt);
  });
});

describe('writeStickyColor', () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'feat021-sc-w-'));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  it('creates a new V2 file when no file exists (AC-029)', async () => {
    const updatedAt = await writeStickyColor('y', [NOTE_A], dir);
    expect(updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const raw = JSON.parse(await fs.readFile(path.join(dir, 'sticky.json'), 'utf-8')) as Record<
      string,
      unknown
    >;
    expect(raw['schemaVersion']).toBe(2);
  });

  it('updates one color and preserves others (AC-029)', async () => {
    await writeStickyColor('y', [NOTE_A], dir);
    await writeStickyColor('r', [NOTE_B], dir);
    const entry = await readStickyColor('y', dir);
    expect(entry!.items[0]!.text).toBe('note-a');
    const entryR = await readStickyColor('r', dir);
    expect(entryR!.items[0]!.text).toBe('note-b');
  });

  it('migrates V1 to V2 on write, then sets the requested color (AC-031)', async () => {
    const v1 = {
      schemaVersion: 1,
      items: [NOTE_A],
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    await fs.writeFile(path.join(dir, 'sticky.json'), JSON.stringify(v1), 'utf-8');
    await writeStickyColor('r', [NOTE_B], dir);
    // Y data preserved from V1 migration
    const yEntry = await readStickyColor('y', dir);
    expect(yEntry!.items[0]!.text).toBe('note-a');
    // R data was written
    const rEntry = await readStickyColor('r', dir);
    expect(rEntry!.items[0]!.text).toBe('note-b');
  });

  it('AC-029: concurrent writes for different colors both persist without lost updates', async () => {
    const yItems = [{ id: '01HZZZZZZZZZZZZZZZZZZZZZZA', prefix: '•' as const, text: 'yellow' }];
    const rItems = [{ id: '01HZZZZZZZZZZZZZZZZZZZZZZB', prefix: '•' as const, text: 'red' }];

    await Promise.all([writeStickyColor('y', yItems, dir), writeStickyColor('r', rItems, dir)]);

    const yResult = await readStickyColor('y', dir);
    const rResult = await readStickyColor('r', dir);

    expect(yResult?.items[0]?.text).toBe('yellow');
    expect(rResult?.items[0]?.text).toBe('red');
  });
});
