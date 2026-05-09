/**
 * Integration tests for scripts/agentops/index.ts — T-014
 * AC-001, AC-005, AC-016, AC-019, AC-020, NFR-001, NFR-005
 *
 * Setup: AGENTOPS_ROOT → fixtures dir, AGENTOPS_OUT → temp dir.
 * Asserts: correct files written, FIXTURE-C skipped with warning,
 * idempotency (byte-identical output except timestamp line), < 5s wall-clock.
 */

/* eslint-disable no-undef */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';

const FIXTURES_ROOT = path.resolve(__dirname, '../__fixtures__/.agent-session');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Mask the "Generated at: <ISO>" line for idempotency comparison */
function maskTimestamps(md: string): string {
  return md.replace(/^> Generated at: .+$/gm, '> Generated at: <MASKED>');
}

/** Mask the "done in Xs" line for idempotency comparison */
function maskElapsed(log: string): string {
  return log.replace(/\[agentops\] done in [\d.]+s/, '[agentops] done in <ELAPSED>s');
}

// ---------------------------------------------------------------------------
// Main integration test suite
// ---------------------------------------------------------------------------

describe('agentops index.ts integration', () => {
  let tmpDir: string;

  beforeAll(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agentops-integration-'));
  });

  afterAll(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  afterEach(() => {
    // Clean env vars after each test
    delete process.env.AGENTOPS_ROOT;
    delete process.env.AGENTOPS_OUT;
  });

  // -------------------------------------------------------------------------
  // Happy path: correct files generated
  // -------------------------------------------------------------------------

  describe('happy path — fixture dir', () => {
    let outDir: string;
    let capturedLog: string;
    let capturedWarn: string;
    let elapsedMs: number;

    beforeAll(async () => {
      outDir = path.join(tmpDir, 'run1');

      const logLines: string[] = [];
      const warnLines: string[] = [];
      const logSpy = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
        logLines.push(args.join(' '));
      });
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => {
        warnLines.push(args.join(' '));
      });

      process.env.AGENTOPS_ROOT = FIXTURES_ROOT;
      process.env.AGENTOPS_OUT = outDir;

      const t0 = Date.now();
      const { main } = await import('../index');
      await main();
      elapsedMs = Date.now() - t0;

      capturedLog = logLines.join('\n');
      capturedWarn = warnLines.join('\n');

      logSpy.mockRestore();
      warnSpy.mockRestore();

      delete process.env.AGENTOPS_ROOT;
      delete process.env.AGENTOPS_OUT;
    });

    it('generates index.md', async () => {
      const indexPath = path.join(outDir, 'index.md');
      const stat = await fs.stat(indexPath);
      expect(stat.isFile()).toBe(true);
    });

    it('index.md contains cross-flow table', async () => {
      const content = await fs.readFile(path.join(outDir, 'index.md'), 'utf-8');
      expect(content).toContain('## Cross-flow snapshot');
      expect(content).toMatch(/# AgentOps observability — overview/);
    });

    it('generates FEAT-FIXTURE-A.md', async () => {
      const filePath = path.join(outDir, 'FEAT-FIXTURE-A.md');
      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
    });

    it('generates FEAT-FIXTURE-B.md', async () => {
      const filePath = path.join(outDir, 'FEAT-FIXTURE-B.md');
      const stat = await fs.stat(filePath);
      expect(stat.isFile()).toBe(true);
    });

    it('does NOT generate FEAT-FIXTURE-C.md (skipped due to corrupted manifest)', async () => {
      const filePath = path.join(outDir, 'FEAT-FIXTURE-C.md');
      await expect(fs.stat(filePath)).rejects.toThrow();
    });

    it('emitted a warning about FEAT-FIXTURE-C on stderr (console.warn)', () => {
      expect(capturedWarn).toContain('[agentops] skipped FEAT-FIXTURE-C');
    });

    it('logged scanning prefix on stdout (console.log)', () => {
      expect(capturedLog).toContain('[agentops] scanning');
    });

    it('logged "done in" completion line', () => {
      expect(capturedLog).toContain('[agentops] done in');
    });

    it('completed in < 5s (NFR-001)', () => {
      expect(elapsedMs).toBeLessThan(5000);
    });
  });

  // -------------------------------------------------------------------------
  // Idempotency: run twice, compare output (except timestamp lines)
  // -------------------------------------------------------------------------

  describe('idempotency — two consecutive runs produce byte-identical output (excluding timestamps)', () => {
    it('index.md is byte-identical except for timestamp line', async () => {
      const outDir1 = path.join(tmpDir, 'idempotency1');
      const outDir2 = path.join(tmpDir, 'idempotency2');

      const { main } = await import('../index');

      const ls1 = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const ws1 = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.AGENTOPS_ROOT = FIXTURES_ROOT;
      process.env.AGENTOPS_OUT = outDir1;
      await main();
      ls1.mockRestore();
      ws1.mockRestore();

      const ls2 = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const ws2 = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.AGENTOPS_ROOT = FIXTURES_ROOT;
      process.env.AGENTOPS_OUT = outDir2;
      await main();
      ls2.mockRestore();
      ws2.mockRestore();

      delete process.env.AGENTOPS_ROOT;
      delete process.env.AGENTOPS_OUT;

      const content1 = maskTimestamps(await fs.readFile(path.join(outDir1, 'index.md'), 'utf-8'));
      const content2 = maskTimestamps(await fs.readFile(path.join(outDir2, 'index.md'), 'utf-8'));
      expect(content1).toBe(content2);
    });

    it('FEAT-FIXTURE-A.md is byte-identical except for timestamp line', async () => {
      const outDir1 = path.join(tmpDir, 'idempotency3');
      const outDir2 = path.join(tmpDir, 'idempotency4');

      const { main } = await import('../index');

      const ls1 = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const ws1 = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.AGENTOPS_ROOT = FIXTURES_ROOT;
      process.env.AGENTOPS_OUT = outDir1;
      await main();
      ls1.mockRestore();
      ws1.mockRestore();

      const ls2 = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const ws2 = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.AGENTOPS_ROOT = FIXTURES_ROOT;
      process.env.AGENTOPS_OUT = outDir2;
      await main();
      ls2.mockRestore();
      ws2.mockRestore();

      delete process.env.AGENTOPS_ROOT;
      delete process.env.AGENTOPS_OUT;

      const content1 = maskTimestamps(
        await fs.readFile(path.join(outDir1, 'FEAT-FIXTURE-A.md'), 'utf-8'),
      );
      const content2 = maskTimestamps(
        await fs.readFile(path.join(outDir2, 'FEAT-FIXTURE-A.md'), 'utf-8'),
      );
      expect(content1).toBe(content2);
    });
  });

  // -------------------------------------------------------------------------
  // Empty root dir — AC-005
  // -------------------------------------------------------------------------

  describe('empty root — AC-005', () => {
    let emptyRoot: string;
    let outDir: string;

    beforeAll(async () => {
      emptyRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'agentops-empty-root-'));
      outDir = path.join(tmpDir, 'empty-run');

      const ls = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const ws = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.AGENTOPS_ROOT = emptyRoot;
      process.env.AGENTOPS_OUT = outDir;
      const { main } = await import('../index');
      await main();
      ls.mockRestore();
      ws.mockRestore();
      delete process.env.AGENTOPS_ROOT;
      delete process.env.AGENTOPS_OUT;
      await fs.rm(emptyRoot, { recursive: true, force: true });
    });

    it('still generates index.md with "(no flows yet)"', async () => {
      const content = await fs.readFile(path.join(outDir, 'index.md'), 'utf-8');
      expect(content).toContain('(no flows yet)');
    });

    it('does not generate any flow-specific .md files', async () => {
      const files = await fs.readdir(outDir);
      const flowFiles = files.filter((f) => f !== 'index.md');
      expect(flowFiles).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Non-existent root dir — AC-005
  // -------------------------------------------------------------------------

  describe('non-existent root — AC-005', () => {
    let outDir: string;

    beforeAll(async () => {
      outDir = path.join(tmpDir, 'nonexistent-run');

      const ls = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const ws = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.AGENTOPS_ROOT = '/tmp/__does_not_exist_agentops__';
      process.env.AGENTOPS_OUT = outDir;
      const { main } = await import('../index');
      await main();
      ls.mockRestore();
      ws.mockRestore();
      delete process.env.AGENTOPS_ROOT;
      delete process.env.AGENTOPS_OUT;
    });

    it('generates index.md with "(no flows yet)"', async () => {
      const content = await fs.readFile(path.join(outDir, 'index.md'), 'utf-8');
      expect(content).toContain('(no flows yet)');
    });
  });

  // -------------------------------------------------------------------------
  // Performance assertion (standalone) — NFR-001
  // -------------------------------------------------------------------------

  describe('performance — < 5s wall-clock (NFR-001)', () => {
    it('completes within 5 seconds for the fixture set', async () => {
      const outDir2 = path.join(tmpDir, 'perf-run');

      const ls = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const ws = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.AGENTOPS_ROOT = FIXTURES_ROOT;
      process.env.AGENTOPS_OUT = outDir2;
      const { main } = await import('../index');
      const t0 = Date.now();
      await main();
      const elapsed = Date.now() - t0;
      ls.mockRestore();
      ws.mockRestore();
      delete process.env.AGENTOPS_ROOT;
      delete process.env.AGENTOPS_OUT;

      expect(elapsed).toBeLessThan(5000);
    });
  });

  // -------------------------------------------------------------------------
  // Twelve-Factor logs — NFR-005: stdout for progress, stderr for warnings
  // -------------------------------------------------------------------------

  describe('Twelve-Factor logs — NFR-005', () => {
    it('uses console.log (stdout) for progress messages', async () => {
      const outDir2 = path.join(tmpDir, 'tf-log-run');
      const capturedLog: string[] = [];

      const ls = jest
        .spyOn(console, 'log')
        .mockImplementation((...args: unknown[]) => capturedLog.push(args.join(' ')));
      const ws = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      process.env.AGENTOPS_ROOT = FIXTURES_ROOT;
      process.env.AGENTOPS_OUT = outDir2;
      const { main } = await import('../index');
      await main();
      ls.mockRestore();
      ws.mockRestore();
      delete process.env.AGENTOPS_ROOT;
      delete process.env.AGENTOPS_OUT;

      const allLog = capturedLog.join('\n');
      expect(allLog).toContain('[agentops] scanning');
      expect(allLog).toMatch(/\[agentops\] wrote /);
      expect(allLog).toContain('[agentops] done in');
    });

    it('uses console.warn (stderr) for skipped sessions warning', async () => {
      const outDir2 = path.join(tmpDir, 'tf-warn-run');
      const capturedWarn: string[] = [];

      const ls = jest.spyOn(console, 'log').mockImplementation(() => undefined);
      const ws = jest
        .spyOn(console, 'warn')
        .mockImplementation((...args: unknown[]) => capturedWarn.push(args.join(' ')));
      process.env.AGENTOPS_ROOT = FIXTURES_ROOT;
      process.env.AGENTOPS_OUT = outDir2;
      const { main } = await import('../index');
      await main();
      ls.mockRestore();
      ws.mockRestore();
      delete process.env.AGENTOPS_ROOT;
      delete process.env.AGENTOPS_OUT;

      const allWarn = capturedWarn.join('\n');
      expect(allWarn).toContain('[agentops] skipped FEAT-FIXTURE-C');
    });
  });

  // -------------------------------------------------------------------------
  // Mask helper — maskElapsed is tested to ensure utility function works
  // -------------------------------------------------------------------------

  describe('maskElapsed helper', () => {
    it('masks elapsed time in log output', () => {
      const log = '[agentops] done in 0.42s';
      expect(maskElapsed(log)).toBe('[agentops] done in <ELAPSED>s');
    });
  });
});

/* eslint-enable no-undef */
