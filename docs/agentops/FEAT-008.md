# priorities — Top 3 prioridades do dia (checkbox + RichTextLine) — FEAT-008

> ⚠ \*\*PM-bypass\*\* — PM autônomo skipou parte do pipeline canônico do ai-squad (decisão documentada em `handoff.md`); dispatches registrados no manifest sem persistência em `outputs/`. Excluído de trends e health metrics.

> Feature: priorities — Top 3 prioridades do dia (checkbox + RichTextLine)
> Task ID: FEAT-008
> Phase: done
> Generated at: 2026-05-11T14:53:19.339Z

## Insights

- ℹ Escalation rate 0.0% is below the Galileo healthy band (< 10%) — low escalation, agents resolving autonomously. _(Galileo healthy band)_
- ℹ Dev task success rate 100.0% is at or above 80% — healthy first-try rate.

## Cost breakdown

_70/30 input/output split assumed; harness reports only total_tokens; 13 of 13 dispatches included in cost_

- Total tokens: 483201
  - Estimated input (70%): 338241
  - Estimated output (30%): 144960
- Estimated cost USD total: $3.2067
- Cost per AC: $0.1233
- Cost per dispatch (avg): $0.2467
- Wall-clock duration: 34m 27s
- Tool uses total: 305
- Coverage: 13 of 13 dispatches included in cost calculation

## Repo health snapshot

_Measured at: 2026-05-11_

| Métrica        | Valor | Threshold | Status |
| -------------- | ----- | --------- | ------ |
| Mutation score | 70.7% | ≥ 70%     | ✓      |
| Type coverage  | 97.7% | ≥ 95%     | ✓      |
| `any` count    | 67    | —         | —      |
| Dep violations | —     | = 0       | —      |

## Per-dispatch breakdown

| ID           | Role           | Status | Loop | Tokens | $       | Duration | PM note                                                                           |
| ------------ | -------------- | ------ | ---- | ------ | ------- | -------- | --------------------------------------------------------------------------------- |
| feat008-b... | dev            | done   | —    | 74798  | $0.4937 | 6m 55s   | Types + hook usePriorities + normalize util + 38 unit tests; ulid adicionado ...  |
| feat008-b... | dev            | done   | —    | 113893 | $0.7517 | 14m 48s  | PriorityItem + Priorities controlled c/ React.memo, checkbox custom acessível...  |
| feat008-b... | dev            | done   | —    | 42554  | $0.2809 | 1m 57s   | 4 Storybook stories CSF3, threshold 90% no jest.config, CLAUDE.md atualizado,...  |
| feat008-b... | code-reviewer  | done   | —    | 25750  | $0.1699 | 1m 1s    | Concerns: 1 falso-blocker (barrel exports BATCH-B já landed) + minors (EMPTY\_... |
| feat008-b... | logic-reviewer | done   | —    | 32187  | $0.2124 | 1m 13s   | Concerns: 1 BLOCKER REAL — onChangeItem regenera ULID com partial.id='' explí...  |
| feat008-b... | code-reviewer  | done   | —    | 22486  | $0.1484 | 1m 2s    | Concerns: 2 majors (6 useCallback boilerplate, 3 PriorityItem hardcoded vs ma...  |
| feat008-b... | logic-reviewer | done   | —    | 35515  | $0.2344 | 1m 14s   | Concerns: AC-006 não verifica innerHTML intacto; AC-016 não lê aria-label rea...  |
| feat008-b... | code-reviewer  | done   | —    | 15721  | $0.1038 | 35s      | Concerns minor: cast as unknown as PrioritiesTuple sem comentário, threshold ...  |
| feat008-b... | logic-reviewer | done   | —    | 22778  | $0.1503 | 53s      | Concerns minors: <u> ausente do AllDone story; falsos-positivos (.js imports ...  |
| feat008-b... | qa             | done   | —    | 34367  | $0.2268 | 49s      | ready_for_done — 10/10 ACs pass, 38 testes green, boundary AC-018 limpa, barr...  |
| feat008-b... | qa             | done   | —    | 31167  | $0.2057 | 1m 13s   | ready_for_done — 12/12 ACs com test passando, 32/32 testes green, sem @tiptap...  |
| feat008-b... | dev            | done   | —    | 4000   | $0.0440 | 1m       | Fix do logic-review blocker: AC-002 invariant — onChangeItem agora preserva i...  |
| feat008-b... | qa             | done   | —    | 27985  | $0.1847 | 1m 48s   | ready_for_done — 4/4 ACs pass, build-storybook clean, coverage 100% > thresho...  |

## Per-AC closure detail

| AC ID  | Status  | Validator | Evidence |
| ------ | ------- | --------- | -------- |
| AC-001 | missing | qa        | —        |
| AC-002 | missing | qa        | —        |
| AC-003 | missing | qa        | —        |
| AC-004 | missing | qa        | —        |
| AC-005 | missing | qa        | —        |
| AC-006 | missing | qa        | —        |
| AC-007 | missing | qa        | —        |
| AC-008 | missing | qa        | —        |
| AC-009 | missing | qa        | —        |
| AC-010 | missing | qa        | —        |
| AC-011 | missing | qa        | —        |
| AC-012 | missing | qa        | —        |
| AC-013 | missing | qa        | —        |
| AC-014 | missing | qa        | —        |
| AC-015 | missing | qa        | —        |
| AC-016 | missing | qa        | —        |
| AC-017 | missing | qa        | —        |
| AC-018 | missing | qa        | —        |
| AC-019 | missing | qa        | —        |
| AC-020 | missing | qa        | —        |
| AC-021 | missing | qa        | —        |
| AC-022 | missing | qa        | —        |
| AC-023 | missing | qa        | —        |
| AC-024 | missing | qa        | —        |
| AC-025 | missing | qa        | —        |
| AC-026 | missing | qa        | —        |

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
| audit-agent        | 0          |
| blocker-specialist | 0          |
| code-reviewer      | 3          |
| dev                | 4          |
| logic-reviewer     | 3          |
| pm-orchestrator    | 0          |
| qa                 | 3          |
| **Total**          | 13         |

## Task success rate

| Role               | Task success rate |
| ------------------ | ----------------- |
| audit-agent        | n/a               |
| blocker-specialist | n/a               |
| code-reviewer      | 100.0%            |
| dev                | 100.0%            |
| logic-reviewer     | 100.0%            |
| pm-orchestrator    | n/a               |
| qa                 | 100.0%            |

## Loop rate

Loop rate: 0.0%

## Escalation rate

Escalation rate: 0.0% — below healthy band (< 10%)

## AC closure

Total: 26 | Pass: 0 | Partial: 0 | Fail: 0 | Missing: 26

## Reviewer findings density

| Severity | Count |
| -------- | ----- |
| critical | 0     |
| major    | 0     |
| minor    | 0     |

## PM notes log

- [2026-05-09 17:30 dev] Types + hook usePriorities + normalize util + 38 unit tests; ulid adicionado às deps web; coverage 100%.
- [2026-05-09 17:38 dev] PriorityItem + Priorities controlled c/ React.memo, checkbox custom acessível, 32 integration tests; coverage 100%.
- [2026-05-09 17:50 dev] 4 Storybook stories CSF3, threshold 90% no jest.config, CLAUDE.md atualizado, boundary greps PASS.
- [2026-05-09 18:00 code-reviewer] Concerns: 1 falso-blocker (barrel exports BATCH-B já landed) + minors (EMPTY_PRIORITY duplicado, TARGET_LENGTH inline, double-cast).
- [2026-05-09 18:00 logic-reviewer] Concerns: 1 BLOCKER REAL — onChangeItem regenera ULID com partial.id='' explícito (viola AC-002). PM aplicou fix + regression test.
- [2026-05-09 18:00 code-reviewer] Concerns: 2 majors (6 useCallback boilerplate, 3 PriorityItem hardcoded vs map) + minors (CSS tokens c/ fallback hex, dead .focusRing).
- [2026-05-09 18:00 logic-reviewer] Concerns: AC-006 não verifica innerHTML intacto; AC-016 não lê aria-label real; AC-009 usa toBeGreaterThanOrEqual(3) em vez de toBe(3) — gaps de teste, não de produção.
- [2026-05-09 18:00 code-reviewer] Concerns minor: cast as unknown as PrioritiesTuple sem comentário, threshold 90% vs 95% RTL sem justificativa inline.
- [2026-05-09 18:00 logic-reviewer] Concerns minors: <u> ausente do AllDone story; falsos-positivos (.js imports + threshold sem ./ — precedente RTL idêntico funciona em CI).
- [2026-05-09 18:01 qa] ready_for_done — 10/10 ACs pass, 38 testes green, boundary AC-018 limpa, barrel AC-019 completo.
- [2026-05-09 18:01 qa] ready_for_done — 12/12 ACs com test passando, 32/32 testes green, sem @tiptap em produção.
- [2026-05-09 18:02 dev] Fix do logic-review blocker: AC-002 invariant — onChangeItem agora preserva id existente mesmo com partial.id=''; +2 regression tests; 28/28 tests pass.
- [2026-05-09 18:02 qa] ready_for_done — 4/4 ACs pass, build-storybook clean, coverage 100% > threshold 90%.

## Token cost

Token cost not available — using dispatch count as cost proxy: 13 dispatches
