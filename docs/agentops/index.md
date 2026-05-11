# AgentOps observability — overview

> Generated at: 2026-05-11T14:53:19.339Z | Total flows: 10

## Repo health snapshot

_Measured at: 2026-05-11_

| Métrica        | Valor | Threshold | Status |
| -------------- | ----- | --------- | ------ |
| Mutation score | 70.7% | ≥ 70%     | ✓      |
| Type coverage  | 97.7% | ≥ 95%     | ✓      |
| `any` count    | 67    | —         | —      |
| Dep violations | —     | = 0       | —      |

## Cross-flow snapshot

| ID         | Compl. | Feature                                                                              | Phase | Status | Dispatches | ACs | Disp/AC | Esc % | $ USD    | $/AC    | Created    |
| ---------- | ------ | ------------------------------------------------------------------------------------ | ----- | ------ | ---------- | --- | ------- | ----- | -------- | ------- | ---------- |
| ✓ FEAT-001 | ◐      | Foundation — scaffolding, infra de testes, design tokens, PaperSheet                 | done  | done   | 15         | 39  | 0.38    | 0.0%  | $3.4066  | $0.0873 | 2026-05-08 |
| ✓ FEAT-002 | ◐      | AgentOps observability extractor — relatórios Markdown a partir de .agent-session/\* | done  | done   | 11         | 25  | 0.44    | 0.0%  | $3.3448  | $0.1338 | 2026-05-08 |
| ✓ FEAT-003 | ◐      | Quality baseline + cost telemetry + AgentOps dashboard enrichment                    | done  | done   | 10         | 36  | 0.28    | 0.0%  | $3.4676  | $0.0963 | 2026-05-08 |
| ✓ FEAT-004 | ◐      | Narrative HTML dashboard for AgentOps reports                                        | done  | done   | 11         | 26  | 0.42    | 0.0%  | $3.8903  | $0.1496 | 2026-05-09 |
| ✓ FEAT-005 | ◐      | Batch story-card UX redesign (fact-sheet)                                            | done  | done   | 17         | 21  | 0.81    | 0.0%  | $24.0331 | $1.1444 | 2026-05-09 |
| ✓ FEAT-006 | ◐      | Server companion — Fastify + JSON store (rotas /api/days/:date)                      | done  | done   | 16         | 30  | 0.53    | 0.0%  | $13.8704 | $0.4623 | 2026-05-09 |
| ✓ FEAT-007 | ✓      | rich-text-line — editor Tiptap de uma linha (núcleo de escrita)                      | done  | done   | 19         | 35  | 0.54    | 0.0%  | $22.9994 | $0.6571 | 2026-05-09 |
| ✓ FEAT-008 | ⊘      | priorities — Top 3 prioridades do dia (checkbox + RichTextLine)                      | done  | done   | 13         | 26  | 0.50    | 0.0%  | $3.2067  | $0.1233 | 2026-05-09 |
| ✓ FEAT-012 | ✓      | daily-page — orquestrador do dia (composição, navegação, autosave)                   | done  | done   | 38         | 54  | 0.70    | 0.0%  | $71.1441 | $1.3175 | 2026-05-11 |
| ✓ FEAT-013 | ✓      | e2e-mvp-closer                                                                       | done  | done   | 11         | 7   | 1.57    | 0.0%  | $1.9545  | $0.2792 |            |

_Compl. legend:_ ✓ standard · ◐ pré-padrão (excluído de trends/health) · ⊘ pm-bypass (excluído de trends/health)

## Trends

- Dispatches/AC: FEAT-012=0.70 → FEAT-013=1.57 (+123.3%)
- Dev task success rate: FEAT-012=100.0% → FEAT-013=100.0% (0.0%)
- Cost per AC: FEAT-007=$0.6571 → FEAT-013=$0.2792 (-57.5%)
