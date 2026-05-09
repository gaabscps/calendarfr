/**
 * Tests for phase_coverage detection in capture-pm-session hook.
 * (agentops-cost-tracking-patch)
 */

import fs from 'fs';
import os from 'os';
import path from 'path';

import { upsertEntry, type ModelAgg } from '../hooks/capture-pm-session';
import { detectPhaseCoverage } from '../hooks/phase-coverage';

// ---------------------------------------------------------------------------
// detectPhaseCoverage
// ---------------------------------------------------------------------------

interface PhaseEntry {
  phase: string;
  started_at: string;
  completed_at?: string;
}

describe('detectPhaseCoverage', () => {
  it('returns the single phase when session overlaps exactly one phase window', () => {
    const phases: PhaseEntry[] = [
      {
        phase: 'specify',
        started_at: '2026-01-01T00:00:00Z',
        completed_at: '2026-01-01T01:00:00Z',
      },
      { phase: 'plan', started_at: '2026-01-01T01:00:00Z', completed_at: '2026-01-01T02:00:00Z' },
      {
        phase: 'implementation',
        started_at: '2026-01-01T02:00:00Z',
        completed_at: '2026-01-01T04:00:00Z',
      },
    ];
    const result = detectPhaseCoverage('2026-01-01T00:10:00Z', '2026-01-01T00:50:00Z', phases);
    expect(result.phase_coverage).toBe('specify');
    expect(result.phase_split).toBeUndefined();
  });

  it('returns "mixed" with phase_split when session spans two phases', () => {
    const phases: PhaseEntry[] = [
      { phase: 'plan', started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T02:00:00Z' },
      {
        phase: 'implementation',
        started_at: '2026-01-01T02:00:00Z',
        completed_at: '2026-01-01T04:00:00Z',
      },
    ];
    // Session spans 1h in plan + 1h in implementation
    const result = detectPhaseCoverage('2026-01-01T01:00:00Z', '2026-01-01T03:00:00Z', phases);
    expect(result.phase_coverage).toBe('mixed');
    expect(result.phase_split).toBeDefined();
    expect(result.phase_split!['plan']).toBeCloseTo(0.5, 5);
    expect(result.phase_split!['implementation']).toBeCloseTo(0.5, 5);
  });

  it('returns "implementation" as fallback when no phase overlap', () => {
    const phases: PhaseEntry[] = [
      {
        phase: 'specify',
        started_at: '2026-01-01T10:00:00Z',
        completed_at: '2026-01-01T11:00:00Z',
      },
    ];
    const result = detectPhaseCoverage('2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z', phases);
    expect(result.phase_coverage).toBe('implementation');
    expect(result.phase_split).toBeUndefined();
  });

  it('returns "implementation" as fallback for empty phase list', () => {
    const result = detectPhaseCoverage('2026-01-01T00:00:00Z', '2026-01-01T01:00:00Z', []);
    expect(result.phase_coverage).toBe('implementation');
  });

  it('handles open-ended last phase (no completed_at)', () => {
    const phases: PhaseEntry[] = [{ phase: 'implementation', started_at: '2026-01-01T00:00:00Z' }];
    const result = detectPhaseCoverage('2026-01-01T00:30:00Z', '2026-01-01T01:00:00Z', phases);
    expect(result.phase_coverage).toBe('implementation');
  });

  it('phase_split ratios sum to 1.0 when mixed', () => {
    const phases: PhaseEntry[] = [
      { phase: 'plan', started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T01:00:00Z' },
      { phase: 'tasks', started_at: '2026-01-01T01:00:00Z', completed_at: '2026-01-01T02:00:00Z' },
      {
        phase: 'implementation',
        started_at: '2026-01-01T02:00:00Z',
        completed_at: '2026-01-01T06:00:00Z',
      },
    ];
    // 30min in plan, 1h in tasks, 2h in implementation
    const result = detectPhaseCoverage('2026-01-01T00:30:00Z', '2026-01-01T04:00:00Z', phases);
    expect(result.phase_coverage).toBe('mixed');
    const split = result.phase_split!;
    const total = Object.values(split).reduce((a, b) => a + b, 0);
    expect(total).toBeCloseTo(1.0, 5);
  });
});

// ---------------------------------------------------------------------------
// upsertEntry: writes phase_coverage to manifest
// ---------------------------------------------------------------------------

function makeManifest(extra: Record<string, unknown> = {}): string {
  return JSON.stringify({
    schema_version: 1,
    task_id: 'FEAT-TEST',
    expected_pipeline: [],
    actual_dispatches: [],
    ...extra,
  });
}

function makeAgg(overrides: Partial<ModelAgg> = {}): ModelAgg {
  return {
    inputTokens: 100,
    outputTokens: 50,
    cacheCreate: 0,
    cacheRead: 0,
    toolUses: 2,
    firstTs: '2026-01-01T00:10:00Z',
    lastTs: '2026-01-01T00:50:00Z',
    turns: 10,
    ...overrides,
  };
}

describe('upsertEntry: phase_coverage written to manifest', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-session-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('writes phase_coverage="implementation" (fallback) when no session.yml exists', () => {
    const manifestPath = path.join(tmpDir, 'dispatch-manifest.json');
    fs.writeFileSync(manifestPath, makeManifest());

    const agg = makeAgg({
      firstTs: '2026-01-01T00:10:00Z',
      lastTs: '2026-01-01T00:50:00Z',
    });
    upsertEntry(manifestPath, 'sess-001', 'sonnet-4-6', agg, undefined);

    const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
    const sessions = result.pm_orchestrator_sessions as Record<string, unknown>[];
    expect(sessions).toHaveLength(1);
    expect(sessions[0]!['phase_coverage']).toBe('implementation');
    expect(sessions[0]!['phase_split']).toBeUndefined();
  });

  it('writes phase_coverage="specify" when session overlaps only specify window', () => {
    const manifestPath = path.join(tmpDir, 'dispatch-manifest.json');
    fs.writeFileSync(manifestPath, makeManifest());

    const phases = [
      {
        phase: 'specify',
        started_at: '2026-01-01T00:00:00Z',
        completed_at: '2026-01-01T01:00:00Z',
      },
      {
        phase: 'implementation',
        started_at: '2026-01-01T01:00:00Z',
        completed_at: '2026-01-01T03:00:00Z',
      },
    ];
    const agg = makeAgg({
      firstTs: '2026-01-01T00:10:00Z',
      lastTs: '2026-01-01T00:50:00Z',
    });
    upsertEntry(manifestPath, 'sess-002', 'sonnet-4-6', agg, phases);

    const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
    const sessions = result.pm_orchestrator_sessions as Record<string, unknown>[];
    expect(sessions[0]!['phase_coverage']).toBe('specify');
  });

  it('writes phase_coverage="mixed" with phase_split when session spans two phases', () => {
    const manifestPath = path.join(tmpDir, 'dispatch-manifest.json');
    fs.writeFileSync(manifestPath, makeManifest());

    const phases = [
      { phase: 'plan', started_at: '2026-01-01T00:00:00Z', completed_at: '2026-01-01T02:00:00Z' },
      {
        phase: 'implementation',
        started_at: '2026-01-01T02:00:00Z',
        completed_at: '2026-01-01T04:00:00Z',
      },
    ];
    const agg = makeAgg({
      firstTs: '2026-01-01T01:00:00Z',
      lastTs: '2026-01-01T03:00:00Z',
    });
    upsertEntry(manifestPath, 'sess-003', 'sonnet-4-6', agg, phases);

    const result = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>;
    const sessions = result.pm_orchestrator_sessions as Record<string, unknown>[];
    expect(sessions[0]!['phase_coverage']).toBe('mixed');
    const split = sessions[0]!['phase_split'] as Record<string, number>;
    expect(split).toBeDefined();
    expect(split['plan']).toBeCloseTo(0.5, 5);
    expect(split['implementation']).toBeCloseTo(0.5, 5);
  });
});
