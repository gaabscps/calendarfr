# Issue: ai-squad orchestrator does not capture `<usage>` annotation

**Status:** ✅ resolved upstream (2026-05-10)
**Affects:** ai-squad orchestrator skill (upstream)
**Local workaround:** FEAT-003 D4/D5/D6 (see below) — no longer needed
**Created:** 2026-05-08
**Resolved by:** ai-squad commit `d86ed96` — feat(agentops): full report population.
Two new hooks ship with `@ai-squad/cli@0.1.0`:

- `stamp-session-id.py` (PostToolUse Write|Edit) injects `_session_id` into
  every Output Packet so the Stop hook can correlate exactly.
- `capture-subagent-usage.py` (Stop) reads the subagent transcript JSONL,
  sums per-turn token usage, and writes `usage{}` into the matching
  `actual_dispatches[]` entry of `dispatch-manifest.json`.

To pick up the fix on this machine: `ai-squad deploy --force`. Subsequent
Phase 4 dispatches will carry real token / cost / duration data.

---

## Problem

The ai-squad orchestrator skill dispatches sub-agents via the Claude Code Task tool. Each Task tool
result contains a `<usage>total_tokens, tool_uses, duration_ms</usage>` annotation emitted by the
harness. The orchestrator skill currently **does not document capturing this annotation**, so
`total_tokens`, `tool_uses`, and `duration_ms` are silently discarded after each dispatch.

This causes complete loss of cost and performance data per dispatch. Downstream reporting tools
(e.g. AgentOps extractor in FEAT-002/003) cannot compute USD cost per flow, $/AC ratios, or
wall-clock breakdowns without per-dispatch usage data.

From the AgentOps framework (XenonStack/N-iX 2026), **cost per unit of work** is a first-class
evaluation metric for AI-driven development pipelines. Losing it at the harness boundary makes the
"Evaluation" pillar effectively blind.

---

## Current behavior

When the orchestrator skill dispatches a sub-agent (e.g. `dev`, `qa`, `code-reviewer`):

1. The Task tool executes and returns an Output Packet from the sub-agent.
2. The harness wraps the result with `<usage>total_tokens: N, tool_uses: M, duration_ms: D</usage>`.
3. The orchestrator extracts the Output Packet JSON and writes it to
   `actual_dispatches[].output_packet` in `dispatch-manifest.json`.
4. **The `<usage>` block is ignored.** The `actual_dispatches[]` entry has no `usage` field.

Manifest entry shape (current):

```json
{
  "dispatch_id": "feat-003-batch-a-dev",
  "role": "dev",
  "status": "done",
  "started_at": "2026-05-08T10:00:00Z",
  "output_packet": { ... }
}
```

No `usage` field exists. `total_tokens`, `tool_uses`, and `duration_ms` are unrecoverable after
the dispatch.

---

## Proposed behavior

The orchestrator skill should:

1. After receiving each Task tool result, parse the `<usage>` annotation via regex:
   ```
   /<usage>\s*total_tokens:\s*(\d+),\s*tool_uses:\s*(\d+),\s*duration_ms:\s*(\d+)\s*<\/usage>/
   ```
2. Determine the `model` used (via convention or harness metadata — see note below).
3. Append a `usage` field to the `actual_dispatches[]` entry before writing to the manifest.

Manifest entry shape (proposed):

```json
{
  "dispatch_id": "feat-003-batch-a-dev",
  "role": "dev",
  "status": "done",
  "started_at": "2026-05-08T10:00:00Z",
  "output_packet": { ... },
  "usage": {
    "total_tokens": 42500,
    "tool_uses": 18,
    "duration_ms": 95000,
    "model": "sonnet-4-6"
  }
}
```

Model determination convention (until harness exposes it per-dispatch):

- `audit-agent` role → `haiku-4-5`
- all other roles → model of the current orchestrator session (default `sonnet-4-6`)

---

## Suggested patch

Conceptual diff against the orchestrator skill
(`~/.claude/skills/orchestrator/SKILL.md` — Steps 1b and 4):

**Step 1b — after receiving Task tool result:**

```diff
 # After calling Task tool for dispatch D:
+usage_match = result.match(/<usage>\s*total_tokens:\s*(\d+),\s*tool_uses:\s*(\d+),\s*duration_ms:\s*(\d+)\s*<\/usage>/)
+if usage_match:
+  dispatch_entry.usage = {
+    total_tokens: int(usage_match[1]),
+    tool_uses:    int(usage_match[2]),
+    duration_ms:  int(usage_match[3]),
+    model:        derive_model(dispatch_entry.role)
+  }
 manifest.actual_dispatches.append(dispatch_entry)
 write_manifest(manifest)
```

**Step 4 — manifest schema documentation:**

```diff
 actual_dispatches[]:
   dispatch_id: string
   role: string
   status: string
   started_at: ISO8601
   output_packet: object
+  usage?: {             # populated from <usage> harness annotation
+    total_tokens: number
+    tool_uses: number
+    duration_ms: number
+    model: 'opus-4-7' | 'sonnet-4-6' | 'haiku-4-5' | 'unknown'
+  }
```

---

## Local workaround

FEAT-003 implements a best-effort workaround in three parts:

- **D4** (`docs/agentops/conventions.md`): documents the convention for PM-driven manual capture
  of `<usage>` data per dispatch (AC-014).
- **D5** (`scripts/agentops/types.ts`, `scripts/agentops/enrich/dispatches.ts`): extends the
  AgentOps extractor to read `usage` from manifest entries when present, and skips gracefully when
  absent (AC-015, AC-016, AC-017). The `Dispatch.usage` field is optional for back-compat with
  FEAT-001/002 manifests.
- **D6** (`scripts/agentops/backfill-usage.ts`): standalone script that reads a manually-authored
  `usage-backfill.json` and writes a `pre_feat_003_backfilled_usage[]` section to FEAT-001/002
  manifests — kept separate from `actual_dispatches` to preserve historical integrity (AC-018).
  Entries carry `backfill_source: "conversation_log_estimate"` to signal precision is ±20%.

These are documented as the "local implementation that should migrate upstream" per AC-031 of
`.agent-session/FEAT-003/spec.md`.

---

## References

- **ai-squad repo:** `https://github.com/ai-squad/ai-squad` (placeholder — confirm canonical URL)
- **This spec:** `.agent-session/FEAT-003/spec.md` — AC-014..AC-018 (local implementation),
  AC-030/AC-031 (upstream documentation requirement)
- **This plan:** `.agent-session/FEAT-003/plan.md` — D4 (convention doc), D5 (schema extension),
  D6 (backfill script), D12 (this issue document)
- **AgentOps framework:** XenonStack/N-iX 2026, "Evaluation" pillar — cost per unit of work as
  first-class metric
- **Anthropic pricing (Apr 2026):** Opus 4.7 $5/$25, Sonnet 4.6 $3/$15, Haiku 4.5 $1/$5 per
  million input/output tokens (platform.claude.com/docs/en/about-claude/pricing)
