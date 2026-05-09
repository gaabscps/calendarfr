/**
 * AgentOps observability extractor — shared type definitions.
 * All types correspond to Plan DM-1..DM-5.
 */

// DM-5 — Role: all known dispatch roles in the SDD framework
export type Role =
  | 'dev'
  | 'code-reviewer'
  | 'logic-reviewer'
  | 'qa'
  | 'blocker-specialist'
  | 'audit-agent';

// DM-5 — DispatchStatus: possible status values for a dispatch
export type DispatchStatus = 'done' | 'needs_review' | 'blocked' | 'escalate' | 'partial';

// DM-5 — PhaseName: known SDD pipeline phases
export type PhaseName = 'specify' | 'plan' | 'tasks' | 'implementation';

// DM-1 — RawSession: raw output of parse.ts — data aggregated without normalisation
export interface RawSession {
  taskId: string;
  /** Parsed YAML from session.yml; type-guarded downstream */
  sessionYml: unknown;
  /** Parsed JSON from dispatch-manifest.json; null if absent or malformed */
  manifest: unknown;
  /** All outputs/*.json files; data is parsed JSON (unknown until type-guarded) */
  outputs: { filename: string; data: unknown }[];
  /** Raw markdown content of spec.md; null if absent */
  specMd: string | null;
  /** Absolute filesystem path of the session directory */
  sessionDirPath: string;
}

// DM-2 — Session: normalised session produced by enrich.ts
export interface Session {
  taskId: string;
  featureName: string;
  currentPhase: 'specify' | 'plan' | 'tasks' | 'implementation' | 'paused' | 'done' | 'escalated';
  status: 'running' | 'done' | 'paused' | 'escalated' | 'specify-only';
  /** ISO 8601 string */
  startedAt: string;
  /** ISO 8601 string or null if still running */
  completedAt: string | null;
  phases: {
    name: string;
    startedAt: string | null;
    completedAt: string | null;
    status: string;
  }[];
  dispatches: {
    dispatchId: string;
    role: Role;
    status: DispatchStatus;
    startedAt: string;
    completedAt: string | null;
    outputPacket: Record<string, unknown> | null;
    loop: number | null;
    pmNote: string | null;
  }[];
  /** AC identifiers extracted from spec.md via regex (e.g. 'AC-001') */
  acs: string[];
  qaResults: { ac: string; status: 'pass' | 'partial' | 'fail' }[];
  expectedPipeline: {
    batchId?: string;
    taskId?: string;
    requiredRoles: Role[];
  }[];
  escalationMetrics: {
    escalationRate: number;
  } | null;
}

// DM-3 — Metrics: all computed metrics for a session
export interface Metrics {
  taskId: string;
  featureName: string;
  currentPhase: Session['currentPhase'];
  status: Session['status'];
  startedAt: string;
  totalDispatches: number;
  dispatchesByRole: Record<Role, number>;
  taskSuccessRate: Record<Role, number | null>;
  loopRate: number;
  escalationRate: number;
  phaseDurations: Record<string, number | 'running' | 'not_started'>;
  acClosure: {
    total: number;
    pass: number;
    partial: number;
    fail: number;
    missing: number;
  };
  reviewerFindings: { critical: number; major: number; minor: number } | null;
  dispatchesPerAc: number;
  tokenCost: { total: number | null; perAc: number | null };
  /** Reserved hook for future rework-rate metric; null in MVP */
  reworkRate: null;
  insights: Insight[];
}

// DM-4 — Insight: output of an insights rule
export interface Insight {
  ruleId: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
  /** Source framework or reference for the heuristic, e.g. 'Galileo healthy band' */
  source: string | null;
}
