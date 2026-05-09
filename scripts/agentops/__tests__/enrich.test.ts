/**
 * Unit tests for enrich.ts
 * T-009: 5+ tests covering all ACs in scope.
 */

import path from 'path';

import { enrich } from '../enrich';
import { parse } from '../parse';
import type { RawSession } from '../types';

/* eslint-disable no-undef */
const FIXTURES_ROOT = path.resolve(__dirname, '../__fixtures__/.agent-session');
/* eslint-enable no-undef */
const FIXTURE_A = path.join(FIXTURES_ROOT, 'FEAT-FIXTURE-A');
const FIXTURE_B = path.join(FIXTURES_ROOT, 'FEAT-FIXTURE-B');
const FIXTURE_C = path.join(FIXTURES_ROOT, 'FEAT-FIXTURE-C');

describe('enrich', () => {
  it('fixture A: extracts ACs [AC-001..AC-005] from specMd', async () => {
    const raw = await parse(FIXTURE_A);
    const session = enrich(raw);
    expect(session.acs).toEqual(['AC-001', 'AC-002', 'AC-003', 'AC-004', 'AC-005']);
  });

  it('fixture A: dispatches are normalised with typed Role', async () => {
    const raw = await parse(FIXTURE_A);
    const session = enrich(raw);
    expect(session.dispatches).toHaveLength(4);
    const roles = session.dispatches.map((d) => d.role);
    expect(roles).toContain('dev');
    expect(roles).toContain('code-reviewer');
    expect(roles).toContain('qa');
    expect(roles).toContain('audit-agent');
    // All statuses are valid typed DispatchStatus
    session.dispatches.forEach((d) => {
      expect(d.status).toMatch(/^(done|needs_review|blocked|escalate|partial)$/);
    });
  });

  it('fixture A: qaResults populated from qa output packet', async () => {
    const raw = await parse(FIXTURE_A);
    const session = enrich(raw);
    expect(session.qaResults.length).toBeGreaterThan(0);
    const acSet = new Set(session.qaResults.map((r) => r.ac));
    expect(acSet).toContain('AC-001');
    expect(acSet).toContain('AC-005');
    session.qaResults.forEach((r) => {
      expect(r.status).toMatch(/^(pass|partial|fail)$/);
    });
  });

  it('fixture B: ACs extracted OK, dispatches=[], status="specify-only"', async () => {
    const raw = await parse(FIXTURE_B);
    const session = enrich(raw);
    expect(session.acs).toHaveLength(3);
    expect(session.dispatches).toHaveLength(0);
    expect(session.status).toBe('specify-only');
    expect(session.currentPhase).toBe('specify');
  });

  it('spec.md without ACs produces acs=[]', () => {
    const raw: RawSession = {
      taskId: 'FEAT-TEST',
      sessionYml: {
        task_id: 'FEAT-TEST',
        feature_name: 'Test',
        current_phase: 'specify',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: null,
      outputs: [],
      specMd: '# Spec\n\nNo acceptance criteria here.',
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.acs).toEqual([]);
  });

  it('fixture C: manifest null → dispatches=[], escalated (pending_human_tasks=1)', async () => {
    const raw = await parse(FIXTURE_C);
    const session = enrich(raw);
    expect(raw.manifest).toBeNull();
    expect(session.dispatches).toHaveLength(0);
    // current_phase=implementation, pending_human_tasks=1 → escalated
    expect(session.status).toBe('escalated');
    expect(session.currentPhase).toBe('implementation');
  });

  it('fixture A: session status is "done" when current_phase=done', async () => {
    const raw = await parse(FIXTURE_A);
    const session = enrich(raw);
    expect(session.status).toBe('done');
    expect(session.currentPhase).toBe('done');
  });

  it('fixture A: output packets are attached to dispatches by dispatch_id', async () => {
    const raw = await parse(FIXTURE_A);
    const session = enrich(raw);
    const devDispatch = session.dispatches.find((d) => d.dispatchId === 'dev-1');
    expect(devDispatch).toBeDefined();
    expect(devDispatch!.outputPacket).not.toBeNull();
    expect(devDispatch!.outputPacket!['role']).toBe('dev');
  });

  it('deriving escalated status when pending_human_tasks > 0', () => {
    const raw: RawSession = {
      taskId: 'FEAT-ESC',
      sessionYml: {
        task_id: 'FEAT-ESC',
        feature_name: 'Escalated',
        current_phase: 'implementation',
        started_at: '2026-01-01T00:00:00Z',
        escalation_metrics: {
          total_tasks: 1,
          done_tasks: 0,
          pending_human_tasks: 2,
          escalation_rate: 0,
        },
      },
      manifest: { expected_pipeline: [], actual_dispatches: [] },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake2',
    };
    const session = enrich(raw);
    expect(session.status).toBe('escalated');
  });

  it('phases are normalised from phase_history', async () => {
    const raw = await parse(FIXTURE_A);
    const session = enrich(raw);
    expect(session.phases.length).toBeGreaterThan(0);
    session.phases.forEach((p) => {
      expect(['specify', 'plan', 'tasks', 'implementation']).toContain(p.name);
      expect(typeof p.startedAt === 'string' || p.startedAt === null).toBe(true);
    });
  });

  it('normaliseDispatches: skips entries with invalid role or status', () => {
    const raw: RawSession = {
      taskId: 'FEAT-INVALID',
      sessionYml: {
        task_id: 'FEAT-INVALID',
        feature_name: 'Invalid',
        current_phase: 'implementation',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: {
        expected_pipeline: [],
        actual_dispatches: [
          // invalid role
          {
            dispatch_id: 'd1',
            role: 'not-a-role',
            status: 'done',
            started_at: '2026-01-01T00:00:00Z',
          },
          // invalid status
          {
            dispatch_id: 'd2',
            role: 'dev',
            status: 'invalid-status',
            started_at: '2026-01-01T00:00:00Z',
          },
          // missing dispatch_id
          {
            role: 'dev',
            status: 'done',
            started_at: '2026-01-01T00:00:00Z',
          },
          // non-object entry
          'not-an-object',
        ],
      },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.dispatches).toHaveLength(0);
  });

  it('normaliseDispatches: skips entries missing dispatch_id or started_at', () => {
    const raw: RawSession = {
      taskId: 'FEAT-MISSING',
      sessionYml: {
        task_id: 'FEAT-MISSING',
        feature_name: 'Missing',
        current_phase: 'implementation',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: {
        expected_pipeline: [],
        actual_dispatches: [
          // missing started_at
          {
            dispatch_id: 'd1',
            role: 'dev',
            status: 'done',
          },
        ],
      },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.dispatches).toHaveLength(0);
  });

  it('normaliseDispatches: reads review_loop as loop fallback', () => {
    const raw: RawSession = {
      taskId: 'FEAT-LOOP',
      sessionYml: {
        task_id: 'FEAT-LOOP',
        feature_name: 'Loop',
        current_phase: 'implementation',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: {
        expected_pipeline: [],
        actual_dispatches: [
          {
            dispatch_id: 'd1',
            role: 'dev',
            status: 'done',
            started_at: '2026-01-01T00:00:00Z',
            review_loop: 2, // uses review_loop instead of loop
          },
        ],
      },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.dispatches[0]!.loop).toBe(2);
  });

  it('deriveStatus: returns "paused" for paused phase', () => {
    const raw: RawSession = {
      taskId: 'FEAT-PAUSED',
      sessionYml: {
        task_id: 'FEAT-PAUSED',
        feature_name: 'Paused',
        current_phase: 'paused',
        started_at: '2026-01-01T00:00:00Z',
        escalation_metrics: { pending_human_tasks: 0, escalation_rate: 0 },
      },
      manifest: { expected_pipeline: [], actual_dispatches: [] },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.status).toBe('paused');
  });

  it('deriveStatus: returns "escalated" for currentPhase=escalated', () => {
    const raw: RawSession = {
      taskId: 'FEAT-ESC2',
      sessionYml: {
        task_id: 'FEAT-ESC2',
        feature_name: 'Escalated',
        current_phase: 'escalated',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: null,
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.status).toBe('escalated');
  });

  it('attachOutputPackets: dispatch with no matching output keeps outputPacket=null', () => {
    const raw: RawSession = {
      taskId: 'FEAT-NOMATCH',
      sessionYml: {
        task_id: 'FEAT-NOMATCH',
        feature_name: 'No Match',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: {
        expected_pipeline: [],
        actual_dispatches: [
          {
            dispatch_id: 'dev-99',
            role: 'dev',
            status: 'done',
            started_at: '2026-01-01T00:00:00Z',
          },
        ],
      },
      outputs: [
        // output with different dispatch_id — no match
        { filename: 'dev-1.json', data: { dispatch_id: 'dev-1', role: 'dev' } },
      ],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.dispatches[0]!.outputPacket).toBeNull();
  });

  it('extractEscalationMetrics: returns null when sessionYml is not a record', () => {
    const raw: RawSession = {
      taskId: 'FEAT-NULL-YML',
      sessionYml: null,
      manifest: null,
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.escalationMetrics).toBeNull();
  });

  it('normalisePhases: skips entries with non-PhaseName names', () => {
    const raw: RawSession = {
      taskId: 'FEAT-PHASE',
      sessionYml: {
        task_id: 'FEAT-PHASE',
        feature_name: 'Phase',
        current_phase: 'implementation',
        started_at: '2026-01-01T00:00:00Z',
        phase_history: [
          { phase: 'unknown-phase', started_at: '2026-01-01T00:00:00Z' },
          {
            phase: 'specify',
            started_at: '2026-01-01T00:00:00Z',
            completed_at: '2026-01-01T00:15:00Z',
            artifact_status: 'approved',
          },
        ],
      },
      manifest: null,
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    // Only specify phase passes (unknown-phase filtered out)
    expect(session.phases).toHaveLength(1);
    expect(session.phases[0]!.name).toBe('specify');
  });

  it('normaliseDispatches: manifest with non-array actual_dispatches returns []', () => {
    const raw: RawSession = {
      taskId: 'FEAT-NOARR',
      sessionYml: {
        task_id: 'FEAT-NOARR',
        feature_name: 'X',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: { expected_pipeline: [], actual_dispatches: 'not-an-array' },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.dispatches).toHaveLength(0);
  });

  it('normaliseDispatches: reads pmNote and completedAt correctly', () => {
    const raw: RawSession = {
      taskId: 'FEAT-PMNOTE',
      sessionYml: {
        task_id: 'FEAT-PMNOTE',
        feature_name: 'X',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: {
        expected_pipeline: [],
        actual_dispatches: [
          {
            dispatch_id: 'd1',
            role: 'dev',
            status: 'done',
            started_at: '2026-01-01T00:00:00Z',
            completed_at: '2026-01-01T01:00:00Z',
            pm_note: 'Important note',
            loop: 1,
          },
        ],
      },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.dispatches[0]!.pmNote).toBe('Important note');
    expect(session.dispatches[0]!.completedAt).toBe('2026-01-01T01:00:00Z');
    expect(session.dispatches[0]!.loop).toBe(1);
  });

  it('aggregateQaResults: skips non-qa outputs and non-record/invalid entries', () => {
    const raw: RawSession = {
      taskId: 'FEAT-QA',
      sessionYml: {
        task_id: 'FEAT-QA',
        feature_name: 'X',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: null,
      outputs: [
        // non-qa role — skipped
        {
          filename: 'dev.json',
          data: { role: 'dev', ac_coverage: [{ ac: 'AC-001', status: 'pass' }] },
        },
        // qa but ac_coverage not array — skipped
        { filename: 'qa-bad.json', data: { role: 'qa', ac_coverage: 'not-array' } },
        // qa with valid entries including non-record and invalid status
        {
          filename: 'qa-mixed.json',
          data: {
            role: 'qa',
            ac_coverage: [
              'not-a-record', // skipped
              { ac: 123, status: 'pass' }, // ac not string → skipped
              { ac: 'AC-001', status: 'invalid-status' }, // invalid status → skipped
              { ac: 'AC-002', status: 'pass' }, // valid
            ],
          },
        },
      ],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.qaResults).toHaveLength(1);
    expect(session.qaResults[0]!.ac).toBe('AC-002');
  });

  it('normalisePhases: startedAt and artifact_status use fallback when missing', () => {
    const raw: RawSession = {
      taskId: 'FEAT-PHASE2',
      sessionYml: {
        task_id: 'FEAT-PHASE2',
        feature_name: 'Phase2',
        current_phase: 'implementation',
        started_at: '2026-01-01T00:00:00Z',
        phase_history: [
          // no started_at or artifact_status
          { phase: 'specify' },
          // non-record entry
          'not-an-object',
        ],
      },
      manifest: null,
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    // non-record is skipped; only the specify entry
    expect(session.phases).toHaveLength(1);
    expect(session.phases[0]!.startedAt).toBeNull();
    expect(session.phases[0]!.status).toBe('unknown');
  });

  it('normaliseExpectedPipeline: handles non-record pipeline entries and missing fields', () => {
    const raw: RawSession = {
      taskId: 'FEAT-PIPELINE',
      sessionYml: {
        task_id: 'FEAT-PIPELINE',
        feature_name: 'X',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: {
        expected_pipeline: [
          'not-a-record', // skipped
          { required_roles: ['dev', 'invalid-role'] }, // batch_id/task_id absent → undefined; filters invalid role
          { batch_id: 'B1', task_id: 'T1', required_roles: ['qa'] },
        ],
        actual_dispatches: [],
      },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.expectedPipeline).toHaveLength(2);
    expect(session.expectedPipeline[0]!.batchId).toBeUndefined();
    expect(session.expectedPipeline[0]!.requiredRoles).toEqual(['dev']); // 'invalid-role' filtered
    expect(session.expectedPipeline[1]!.batchId).toBe('B1');
  });

  it('normaliseExpectedPipeline: handles non-array required_roles', () => {
    const raw: RawSession = {
      taskId: 'FEAT-ROLES',
      sessionYml: {
        task_id: 'FEAT-ROLES',
        feature_name: 'X',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: {
        expected_pipeline: [
          { batch_id: 'B1', required_roles: 'not-array' }, // required_roles not array → []
        ],
        actual_dispatches: [],
      },
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.expectedPipeline[0]!.requiredRoles).toEqual([]);
  });

  it('extractEscalationMetrics: returns null when escalation_rate is not a number', () => {
    const raw: RawSession = {
      taskId: 'FEAT-ESCM',
      sessionYml: {
        task_id: 'FEAT-ESCM',
        feature_name: 'X',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
        escalation_metrics: { escalation_rate: 'not-a-number', pending_human_tasks: 0 },
      },
      manifest: null,
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.escalationMetrics).toBeNull();
  });

  it('extractEscalationMetrics: returns null when escalation_metrics is not a record', () => {
    const raw: RawSession = {
      taskId: 'FEAT-ESCM2',
      sessionYml: {
        task_id: 'FEAT-ESCM2',
        feature_name: 'X',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
        escalation_metrics: 'not-a-record',
      },
      manifest: null,
      outputs: [],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.escalationMetrics).toBeNull();
  });

  it('attachOutputPackets: output data that is not a record is skipped', () => {
    const raw: RawSession = {
      taskId: 'FEAT-ATTACH',
      sessionYml: {
        task_id: 'FEAT-ATTACH',
        feature_name: 'X',
        current_phase: 'done',
        started_at: '2026-01-01T00:00:00Z',
      },
      manifest: {
        expected_pipeline: [],
        actual_dispatches: [
          { dispatch_id: 'd1', role: 'dev', status: 'done', started_at: '2026-01-01T00:00:00Z' },
        ],
      },
      outputs: [
        // data is not a record → isRecord returns false → skip
        { filename: 'bad.json', data: 'not-an-object' },
      ],
      specMd: null,
      sessionDirPath: '/tmp/fake',
    };
    const session = enrich(raw);
    expect(session.dispatches[0]!.outputPacket).toBeNull();
  });
});
