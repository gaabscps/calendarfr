# AgentOps Conventions

This document defines the conventions for cost telemetry capture, usage schema, model derivation, pricing assumptions, and backfill strategy for the CalendárioFR AgentOps pipeline.

---

## 1. Usage annotation capture (FEAT-003+)

Starting from FEAT-003, the orchestrator (PM/Claude acting as PM for CalendárioFR) **must** capture the `<usage>` annotation returned by each Task tool dispatch and persist it in `dispatch-manifest.json` under `actual_dispatches[].usage`.

### How to capture

Claude Code (Task tool) returns a block like:

```
<usage>
total_tokens: 42000
tool_uses: 15
duration_ms: 120000
</usage>
```

The PM reads this from the Task tool result and appends the `usage` field to the corresponding `actual_dispatches` entry in `dispatch-manifest.json`.

### Schema

```typescript
interface Usage {
  total_tokens: number; // sum of input + output tokens (harness does not split)
  tool_uses: number; // number of tool invocations in the dispatch
  duration_ms: number; // wall-clock duration in milliseconds
  model: 'opus-4-7' | 'sonnet-4-6' | 'haiku-4-5' | 'unknown';
}
```

### Example manifest entry (FEAT-003+)

```json
{
  "dispatch_id": "feat-003-batch-b-dev",
  "role": "dev",
  "status": "done",
  "started_at": "2026-05-08T10:00:00Z",
  "completed_at": "2026-05-08T10:20:00Z",
  "usage": {
    "total_tokens": 85000,
    "tool_uses": 32,
    "duration_ms": 187000,
    "model": "sonnet-4-6"
  }
}
```

---

## 2. Model derivation convention

The harness does not expose model-per-dispatch directly. Use the following convention to populate `model`:

| Role                                                                 | Default model                                                                                         |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `audit-agent`                                                        | `haiku-4-5`                                                                                           |
| `dev`, `code-reviewer`, `logic-reviewer`, `qa`, `blocker-specialist` | Model of the current session (default: `sonnet-4-6`; use `opus-4-7` if explicitly dispatched with it) |
| Unknown                                                              | `'unknown'`                                                                                           |

If you cannot determine the model with confidence, use `'unknown'`. Dispatches with `model: 'unknown'` are excluded from USD cost calculations (they are still counted in `coverage.total`).

---

## 3. USD cost computation assumption

The Claude Code harness exposes only `total_tokens` (input + output combined). The actual input/output split is not available.

**Assumption applied:** `70% input / 30% output` of `total_tokens`.

```
input_tokens  = total_tokens × 0.70
output_tokens = total_tokens × 0.30
cost_usd      = (input_tokens  / 1_000_000 × input_per_mtok_usd)
              + (output_tokens / 1_000_000 × output_per_mtok_usd)
```

This assumption is documented in every `CostMetric.assumption_note` field emitted by the extractor:

```
"70/30 input/output split assumed; harness reports only total_tokens; X of Y dispatches included in cost"
```

**Rationale for 70/30:** Agents typically receive large context (specs, code, prior conversation) but produce shorter responses. An 80/20 split is too extreme; 50/50 under-weights the cost of long prompts. 70/30 is a pragmatic midpoint, confirmed by internal estimates.

**Review quarterly** — if harness behavior changes to expose the split, remove this assumption.

---

## 4. Pricing constants

See `scripts/agentops/constants.ts` — `ANTHROPIC_PRICING_2026`:

| Model        | Input ($/Mtok) | Output ($/Mtok) |
| ------------ | -------------- | --------------- |
| `opus-4-7`   | $5.00          | $25.00          |
| `sonnet-4-6` | $3.00          | $15.00          |
| `haiku-4-5`  | $1.00          | $5.00           |

Source: [Anthropic pricing page](https://platform.claude.com/docs/en/about-claude/pricing) — verified Apr 2026.

**Review quarterly.** Anthropic can change pricing without notice. The constants file has a comment with the verification date.

---

## 5. Backfill convention (pre-FEAT-003 sessions)

Sessions prior to FEAT-003 (FEAT-001 + FEAT-002) did not capture usage. A best-effort backfill is applied using the conversation log.

### Field name

Backfill data is written to a **separate field** in `dispatch-manifest.json`:

```json
{
  "pre_feat_003_backfilled_usage": [
    {
      "dispatch_id": "batch-a-dev",
      "total_tokens": 46175,
      "tool_uses": 24,
      "duration_ms": 123173,
      "model": "sonnet-4-6",
      "backfill_source": "conversation_log_estimate"
    }
  ]
}
```

This field is **separate from `actual_dispatches[].usage`** to preserve the integrity of the historical record. It is never merged into `actual_dispatches`.

### Precision note

Backfilled values are estimates (±20% typical error). Any per-flow cost report for FEAT-001/002 will note: _"usage data backfilled retroactively from conversation log; precision ±20%"_.

### Idempotency

The backfill script (`npm run agentops:backfill`) is idempotent: running it twice does not duplicate entries. If `pre_feat_003_backfilled_usage` already exists with the same dispatch IDs, it is a no-op.

---

## 6. Upstream issue reference

The convention described in section 1 is a **local workaround** for CalendárioFR. The `ai-squad` orchestrator skill upstream does not document parsing `<usage>` annotations.

A formal issue is tracked at:
[`docs/issues/ai-squad-orchestrator-usage-capture.md`](../issues/ai-squad-orchestrator-usage-capture.md)

(Note: this file will be created in a subsequent batch — BATCH-D. It documents the divergence and the suggested patch for the upstream orchestrator skill.)

---

## 7. Parser behavior

The AgentOps extractor (`scripts/agentops/`) reads `usage` from each manifest entry via a type guard (`isUsage`). If the field is absent or malformed, the dispatch is parsed normally without usage data. This ensures full back-compat with FEAT-001/002 manifests.

### Runtime backfill merge (AC-022)

When `actual_dispatches[i].usage` is absent for a dispatch, the extractor performs a **runtime merge** at parse time:

1. Scans all top-level manifest fields matching the pattern `/^pre_feat_\d+_backfilled_usage$/`.
2. Builds a `Map<dispatch_id, Usage>` from all backfill entries (any number of backfill sections are supported).
3. If a matching `dispatch_id` is found in the lookup, the backfill `Usage` is applied to that dispatch.

**Precedence rule:** `actual_dispatches[i].usage` (real capture) **always** wins over any backfilled entry. Backfill is a fallback only.

This merge is purely a runtime operation — the manifest on disk is **never modified** by the extractor. The `pre_feat_NNN_backfilled_usage[]` field remains separate from `actual_dispatches[]` in the manifest, preserving the audit trail between real capture and backfill (see section 5).

---

## 8. PM/orchestrator session capture (FEAT-005)

The PM (this Claude session that orchestrates subagents) is a major cost driver — its tokens are not captured by the Task tool's `<usage>` annotation. Capture is delegated to a Claude Code `Stop` hook that aggregates the transcript at session end.

### Hook script

`scripts/agentops/hooks/capture-pm-session.ts` reads stdin (hook payload from Claude Code), parses the transcript JSONL, and upserts an entry into the active SDD task's manifest under `pm_orchestrator_sessions[]`.

### Manifest schema

```json
{
  "pm_orchestrator_sessions": [
    {
      "session_id": "<uuid>",
      "model": "opus-4-7",
      "started_at": "2026-05-09T02:00:00Z",
      "completed_at": "2026-05-09T03:40:00Z",
      "note": "PM/orchestrator session (Stop hook): N turns",
      "usage": {
        "input_tokens": 12000,
        "output_tokens": 480000,
        "cache_creation_input_tokens": 850000,
        "cache_read_input_tokens": 22000000,
        "tool_uses": 320
      }
    }
  ]
}
```

The extractor synthesizes one virtual `dispatch` per entry with `role: "pm-orchestrator"` and stores the breakdown in `usage.breakdown`. Cost computation uses the breakdown directly (no 70/30 split, with cache pricing applied: 1.25× write, 0.1× read).

### Task attribution

In order:

1. `AGENTOPS_TASK_ID` env var (explicit override)
2. `.agent-session/.current` pointer file (single-line task id)
3. Most-recently-modified `.agent-session/<TASK>/session.yml` whose `current_phase` is **not** `"done"`
4. Skip silently (no-op)

### Installing the hook

Add to `.claude/settings.json`:

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "cd /Users/gabrielandrade/Developer/calendarfr && npx tsx scripts/agentops/hooks/capture-pm-session.ts"
          }
        ]
      }
    ]
  }
}
```

The hook runs at every session end. It is idempotent (replaces the entry for `(session_id, model)` on each run). To disable temporarily, comment out the block. To capture only specific tasks, set `AGENTOPS_TASK_ID=<id>` in the command.

### Known limitations

- A single Claude Code session that spans work on multiple SDD tasks is attributed to **one** task (the active one at session end). For multi-task sessions, prefer ending and resuming a fresh session per task.
- The transcript covers the **entire** session lifetime; if you resume an old session, the cumulative usage replaces the previous entry.
- Cache pricing assumes 5-minute TTL (1.25× multiplier). 1-hour TTL would be 2× — adjust `CACHE_PRICING_MULTIPLIERS.cache_write` in `constants.ts` if you use the longer TTL.
