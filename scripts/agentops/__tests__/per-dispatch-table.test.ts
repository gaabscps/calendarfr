/**
 * Tests for render/flow-report/per-dispatch-table.ts — T-015
 * AC-026: Per-dispatch breakdown table.
 */

import path from 'path';

import { enrich } from '../enrich';
import { parse } from '../parse';
import { renderPerDispatchTable } from '../render/flow-report/per-dispatch-table';
import type { Session } from '../types';

/* eslint-disable no-undef */
const FIXTURES_ROOT = path.resolve(__dirname, '../__fixtures__/.agent-session');
/* eslint-enable no-undef */
const FIXTURE_A = path.join(FIXTURES_ROOT, 'FEAT-FIXTURE-A');

function makeMinimalSession(overrides: Partial<Session> = {}): Session {
  return {
    taskId: 'FEAT-TEST',
    featureName: 'Test',
    currentPhase: 'implementation',
    status: 'running',
    startedAt: '2026-01-01T00:00:00Z',
    completedAt: null,
    phases: [],
    dispatches: [],
    acs: [],
    qaResults: [],
    expectedPipeline: [],
    escalationMetrics: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Snapshot: Fixture A
// ---------------------------------------------------------------------------

describe('renderPerDispatchTable — Fixture A', () => {
  let session: Session;

  beforeAll(async () => {
    const raw = await parse(FIXTURE_A);
    session = enrich(raw);
  });

  it('matches snapshot', () => {
    const output = renderPerDispatchTable(session);
    expect(output).toMatchSnapshot();
  });

  it('contains ## Per-dispatch breakdown header', () => {
    const output = renderPerDispatchTable(session);
    expect(output).toContain('## Per-dispatch breakdown');
  });

  it('contains all column headers', () => {
    const output = renderPerDispatchTable(session);
    expect(output).toContain('ID');
    expect(output).toContain('Role');
    expect(output).toContain('Status');
    expect(output).toContain('Loop');
    expect(output).toContain('Tokens');
  });

  it('contains dispatch ids (truncated to 12 chars)', () => {
    const output = renderPerDispatchTable(session);
    // Fixture A has dispatches: dev-1, code-reviewer-1, qa-1, audit-agent
    // 'code-reviewer-1' = 15 chars → truncated to 'code-reviewe...'
    expect(output).toContain('dev-1');
  });
});

// ---------------------------------------------------------------------------
// No dispatches
// ---------------------------------------------------------------------------

describe('renderPerDispatchTable — no dispatches', () => {
  it('shows "(no dispatches)" message', () => {
    const session = makeMinimalSession();
    const output = renderPerDispatchTable(session);
    expect(output).toContain('(no dispatches)');
    expect(output).toContain('## Per-dispatch breakdown');
  });
});

// ---------------------------------------------------------------------------
// Ordering by started_at
// ---------------------------------------------------------------------------

describe('renderPerDispatchTable — ordering', () => {
  it('orders rows by started_at ascending', () => {
    const session = makeMinimalSession({
      dispatches: [
        {
          dispatchId: 'later',
          role: 'qa',
          status: 'done',
          startedAt: '2026-01-01T02:00:00Z',
          completedAt: null,
          outputPacket: null,
          loop: null,
          pmNote: null,
        },
        {
          dispatchId: 'earlier',
          role: 'dev',
          status: 'done',
          startedAt: '2026-01-01T01:00:00Z',
          completedAt: null,
          outputPacket: null,
          loop: null,
          pmNote: null,
        },
      ],
    });
    const output = renderPerDispatchTable(session);
    const earlierPos = output.indexOf('earlier');
    const laterPos = output.indexOf('later');
    expect(earlierPos).toBeLessThan(laterPos);
  });
});

// ---------------------------------------------------------------------------
// PM note truncation
// ---------------------------------------------------------------------------

describe('renderPerDispatchTable — pm note truncation', () => {
  it('truncates pm_note to 80 chars with ellipsis', () => {
    const longNote = 'A'.repeat(100);
    const session = makeMinimalSession({
      dispatches: [
        {
          dispatchId: 'd1',
          role: 'dev',
          status: 'done',
          startedAt: '2026-01-01T00:00:00Z',
          completedAt: null,
          outputPacket: null,
          loop: null,
          pmNote: longNote,
        },
      ],
    });
    const output = renderPerDispatchTable(session);
    expect(output).toContain('...');
    expect(output).not.toContain('A'.repeat(100));
  });
});
