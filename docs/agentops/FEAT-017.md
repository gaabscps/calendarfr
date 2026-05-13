# baseline-grid-alignment — rítmica vertical 24px como contrato do design system — FEAT-017

> Feature: baseline-grid-alignment — rítmica vertical 24px como contrato do design system
> Task ID: FEAT-017
> Phase: escalated
> Generated at: 2026-05-13T06:56:58.631Z

## Insights

- ℹ Escalation rate 0.0% is below the Galileo healthy band (< 10%) — low escalation, agents resolving autonomously. _(Galileo healthy band)_

## Cost breakdown

_70/30 input/output split assumed; harness reports only total_tokens; 10 of 10 dispatches included in cost_

- Total tokens: 230828031
  - Estimated input (70%): 161579622
  - Estimated output (30%): 69248409
- Estimated cost USD total: $163.5999
- Cost per AC: $3.1462
- Cost per dispatch (avg): $16.3600
- Wall-clock duration: 1138m 5s
- Tool uses total: 802
- Coverage: 10 of 10 dispatches included in cost calculation

## Repo health snapshot

_Measured at: 2026-05-13_

| Métrica        | Valor | Threshold | Status |
| -------------- | ----- | --------- | ------ |
| Mutation score | 70.7% | ≥ 70%     | ✓      |
| Type coverage  | 97.7% | ≥ 95%     | ✓      |
| `any` count    | 67    | —         | —      |
| Dep violations | —     | = 0       | —      |

## Per-dispatch breakdown

| ID           | Role            | Status  | Loop | Tokens    | $          | Duration | PM note                                                                          |
| ------------ | --------------- | ------- | ---- | --------- | ---------- | -------- | -------------------------------------------------------------------------------- |
| pm-orches... | pm-orchestrator | done    | —    | 126903926 | $1395.9432 | 478m 20s | PM/orchestrator session (Stop hook): 417 turns                                   |
| feat017-a... | audit-agent     | blocked | 1    | 52270     | $0.1150    | 1m 39s   | Audit returned blocked/bypass_detected. PM analysis in handoff.md classifies ... |
| pm-orches... | pm-orchestrator | done    | —    | 1184612   | $13.0307   | 49m 46s  | PM/orchestrator session (Stop hook): 28 turns                                    |
| pm-orches... | pm-orchestrator | done    | —    | 211250    | $2.3237    | 20s      | PM/orchestrator session (Stop hook): 5 turns                                     |
| pm-orches... | pm-orchestrator | done    | —    | 12318184  | $81.3000   | 197m 31s | PM/orchestrator session (Stop hook): 159 turns                                   |
| pm-orches... | pm-orchestrator | done    | —    | 517398    | $3.4148    | 5m 51s   | PM/orchestrator session (Stop hook): 17 turns                                    |
| pm-orches... | pm-orchestrator | done    | —    | 68316     | $0.7515    | 17s      | PM/orchestrator session (Stop hook): 2 turns                                     |
| pm-orches... | pm-orchestrator | done    | —    | 64754796  | $427.3817  | 356m 12s | PM/orchestrator session (Stop hook): 611 turns                                   |
| pm-orches... | pm-orchestrator | done    | —    | 22818872  | $251.0076  | 31m 39s  | PM/orchestrator session (Stop hook): 199 turns                                   |
| pm-orches... | pm-orchestrator | done    | —    | 1998407   | $13.1895   | 16m 30s  | PM/orchestrator session (Stop hook): 49 turns                                    |

## Per-AC closure detail

| AC ID  | Status  | Validator | Evidence |
| ------ | ------- | --------- | -------- |
| AC-001 | missing | —         | —        |
| AC-002 | missing | —         | —        |
| AC-003 | missing | —         | —        |
| AC-004 | missing | —         | —        |
| AC-005 | missing | —         | —        |
| AC-006 | missing | —         | —        |
| AC-007 | missing | —         | —        |
| AC-008 | missing | —         | —        |
| AC-009 | missing | —         | —        |
| AC-010 | missing | —         | —        |
| AC-011 | missing | —         | —        |
| AC-012 | missing | —         | —        |
| AC-013 | missing | —         | —        |
| AC-014 | missing | —         | —        |
| AC-015 | missing | —         | —        |
| AC-016 | missing | —         | —        |
| AC-017 | missing | —         | —        |
| AC-018 | missing | —         | —        |
| AC-019 | missing | —         | —        |
| AC-020 | missing | —         | —        |
| AC-021 | missing | —         | —        |
| AC-022 | missing | —         | —        |
| AC-023 | missing | —         | —        |
| AC-024 | missing | —         | —        |
| AC-025 | missing | —         | —        |
| AC-026 | missing | —         | —        |
| AC-027 | missing | —         | —        |
| AC-028 | missing | —         | —        |
| AC-029 | missing | —         | —        |
| AC-030 | missing | —         | —        |
| AC-031 | missing | —         | —        |
| AC-032 | missing | —         | —        |
| AC-033 | missing | —         | —        |
| AC-034 | missing | —         | —        |
| AC-035 | missing | —         | —        |
| AC-036 | missing | —         | —        |
| AC-037 | missing | —         | —        |
| AC-038 | missing | —         | —        |
| AC-039 | missing | —         | —        |
| AC-040 | missing | —         | —        |
| AC-041 | missing | —         | —        |
| AC-042 | missing | —         | —        |
| AC-043 | missing | —         | —        |
| AC-044 | missing | —         | —        |
| AC-045 | missing | —         | —        |
| AC-046 | missing | —         | —        |
| AC-047 | missing | —         | —        |
| AC-048 | missing | —         | —        |
| AC-049 | missing | —         | —        |
| AC-050 | missing | —         | —        |
| AC-051 | missing | —         | —        |
| AC-052 | missing | —         | —        |

## Phase durations

| Phase          | Duration |
| -------------- | -------- |
| specify        | —        |
| plan           | —        |
| tasks          | —        |
| implementation | —        |

## Timeline

_(no phase data available)_

## Dispatches

| Role               | Dispatches |
| ------------------ | ---------- |
| audit-agent        | 1          |
| blocker-specialist | 0          |
| code-reviewer      | 0          |
| dev                | 0          |
| logic-reviewer     | 0          |
| pm-orchestrator    | 9          |
| qa                 | 0          |
| **Total**          | 10         |

## Task success rate

| Role               | Task success rate |
| ------------------ | ----------------- |
| audit-agent        | 0.0%              |
| blocker-specialist | n/a               |
| code-reviewer      | n/a               |
| dev                | n/a               |
| logic-reviewer     | n/a               |
| pm-orchestrator    | 100.0%            |
| qa                 | n/a               |

## Loop rate

Loop rate: 10.0%

## Escalation rate

Escalation rate: 0.0% — below healthy band (< 10%)

## AC closure

Total: 52 | Pass: 5 | Partial: 0 | Fail: 0 | Missing: 52

## PM notes log

- [2026-05-12 05:29 pm-orchestrator] PM/orchestrator session (Stop hook): 417 turns
- [2026-05-12 06:25 audit-agent] Audit returned blocked/bypass_detected. PM analysis in handoff.md classifies findings as hygiene (real) + read-only-CR/LR-not-on-disk (false positive). PM authority refusal-handoff emitted, mirrori... (see manifest entry feat017-audit-1)
- [2026-05-12 13:41 pm-orchestrator] PM/orchestrator session (Stop hook): 28 turns
- [2026-05-12 14:38 pm-orchestrator] PM/orchestrator session (Stop hook): 5 turns
- [2026-05-12 14:40 pm-orchestrator] PM/orchestrator session (Stop hook): 159 turns
- [2026-05-12 20:12 pm-orchestrator] PM/orchestrator session (Stop hook): 17 turns
- [2026-05-12 20:16 pm-orchestrator] PM/orchestrator session (Stop hook): 2 turns
- [2026-05-12 20:20 pm-orchestrator] PM/orchestrator session (Stop hook): 611 turns
- [2026-05-13 02:28 pm-orchestrator] PM/orchestrator session (Stop hook): 199 turns
- [2026-05-13 04:00 pm-orchestrator] PM/orchestrator session (Stop hook): 49 turns

## Token cost

Token cost not available — using dispatch count as cost proxy: 10 dispatches
