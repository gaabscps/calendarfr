/**
 * Shared boot helpers for GET/PUT integration tests.
 * NOT a test file — no describe/it blocks.
 *
 * Exports:
 *   - validPayload(date?)  : minimal valid DailyPageData
 *   - bootApp()            : builds a fresh FastifyInstance + tmpDir + cwd swap
 *   - teardownApp()        : close app, restore cwd, remove tmpDir
 */
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import type { DailyPageData } from '@calendarfr/shared';
import type { FastifyInstance } from 'fastify';

import { buildApp } from '../../lib/app';

// ---------------------------------------------------------------------------
// Fixture
// ---------------------------------------------------------------------------

export function validPayload(date = '2026-05-09'): DailyPageData {
  return {
    schemaVersion: 1,
    date,
    mood: null,
    priorities: [
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZA', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZB', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZC', text: '', done: false },
    ],
    agenda: Array.from({ length: 18 }, (_, i) => ({ hour: i + 6, text: '' })),
    notes: [],
    createdAt: null,
    updatedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Boot / teardown
// ---------------------------------------------------------------------------

export interface AppContext {
  app: FastifyInstance;
  tmpDir: string;
  originalCwd: string;
}

export async function bootApp(): Promise<AppContext> {
  const originalCwd = process.cwd();
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'feat006-int-'));
  process.chdir(tmpDir);
  const app = await buildApp();
  return { app, tmpDir, originalCwd };
}

export async function teardownApp(ctx: AppContext): Promise<void> {
  await ctx.app.close();
  process.chdir(ctx.originalCwd);
  await fs.rm(ctx.tmpDir, { recursive: true, force: true });
}
