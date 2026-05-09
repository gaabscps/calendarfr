/**
 * Unit tests for scan.ts
 * T-007: 4 unit tests covering happy path, missing rootDir, empty rootDir,
 * and subdirectory without session.yml.
 */

import path from 'path';

import { scan } from '../scan';

/* eslint-disable no-undef */
const FIXTURES_ROOT = path.resolve(__dirname, '../__fixtures__/.agent-session');
/* eslint-enable no-undef */

describe('scan', () => {
  it('returns sorted absolute paths for all valid FEAT-* fixtures', async () => {
    const result = await scan(FIXTURES_ROOT);
    expect(result).toHaveLength(3);
    expect(result[0]).toMatch(/FEAT-FIXTURE-A$/);
    expect(result[1]).toMatch(/FEAT-FIXTURE-B$/);
    expect(result[2]).toMatch(/FEAT-FIXTURE-C$/);
    // sorted ascending
    expect(result).toEqual([...result].sort());
    // all paths are absolute
    result.forEach((p) => expect(path.isAbsolute(p)).toBe(true));
  });

  it('returns [] when rootDir does not exist', async () => {
    const result = await scan('/tmp/__does_not_exist_agentops_test__');
    expect(result).toEqual([]);
  });

  it('returns [] when rootDir exists but is empty', async () => {
    const os = await import('os');
    const fs = await import('fs/promises');
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentops-scan-'));
    try {
      const result = await scan(tmpDir);
      expect(result).toEqual([]);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('skips FEAT-* subdirs that lack session.yml', async () => {
    const os = await import('os');
    const fs = await import('fs/promises');
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentops-scan-'));
    try {
      // Create a FEAT-* dir without session.yml
      await fs.mkdir(path.join(tmpDir, 'FEAT-NO-SESSION'));
      // Create one with session.yml
      const validDir = path.join(tmpDir, 'FEAT-VALID');
      await fs.mkdir(validDir);
      await fs.writeFile(path.join(validDir, 'session.yml'), 'task_id: test\n');

      const result = await scan(tmpDir);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatch(/FEAT-VALID$/);
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
