# AgentOps observability — overview

> Generated at: 2026-05-17T22:32:03.162Z | Total flows: 24

## Repo health snapshot

_Measured at: 2026-05-17_

| Métrica        | Valor | Threshold | Status |
| -------------- | ----- | --------- | ------ |
| Mutation score | 70.7% | ≥ 70%     | ✓      |
| Type coverage  | 97.7% | ≥ 95%     | ✓      |
| `any` count    | 67    | —         | —      |
| Dep violations | —     | = 0       | —      |

## Cross-flow snapshot

| ID         | Compl. | Feature                                                                                                | Phase          | Status    | Dispatches | ACs | Disp/AC | Esc % | $ USD     | $/AC     | Created    |
| ---------- | ------ | ------------------------------------------------------------------------------------------------------ | -------------- | --------- | ---------- | --- | ------- | ----- | --------- | -------- | ---------- |
| ✓ DISC-001 | ✓      | ui-v1-consistente — redesign de interface e UX do planner                                              | done           | done      | 0          | 0   | —       | —     | —         | —        | 2026-05-11 |
| ✓ FEAT-001 | ◐      | Foundation — scaffolding, infra de testes, design tokens, PaperSheet                                   | done           | done      | 15         | 39  | 0.38    | 0.0%  | $3.4066   | $0.0873  | 2026-05-08 |
| ✓ FEAT-002 | ◐      | AgentOps observability extractor — relatórios Markdown a partir de .agent-session/\*                   | done           | done      | 11         | 25  | 0.44    | 0.0%  | $3.3448   | $0.1338  | 2026-05-08 |
| ✓ FEAT-003 | ◐      | Quality baseline + cost telemetry + AgentOps dashboard enrichment                                      | done           | done      | 10         | 36  | 0.28    | 0.0%  | $3.4676   | $0.0963  | 2026-05-08 |
| ✓ FEAT-004 | ◐      | Narrative HTML dashboard for AgentOps reports                                                          | done           | done      | 11         | 26  | 0.42    | 0.0%  | $3.8903   | $0.1496  | 2026-05-09 |
| ✓ FEAT-005 | ◐      | Batch story-card UX redesign (fact-sheet)                                                              | done           | done      | 17         | 21  | 0.81    | 0.0%  | $24.0331  | $1.1444  | 2026-05-09 |
| ✓ FEAT-006 | ◐      | Server companion — Fastify + JSON store (rotas /api/days/:date)                                        | done           | done      | 16         | 30  | 0.53    | 0.0%  | $13.8704  | $0.4623  | 2026-05-09 |
| ✓ FEAT-007 | ✓      | rich-text-line — editor Tiptap de uma linha (núcleo de escrita)                                        | done           | done      | 19         | 35  | 0.54    | 0.0%  | $22.9994  | $0.6571  | 2026-05-09 |
| ✓ FEAT-008 | ⊘      | priorities — Top 3 prioridades do dia (checkbox + RichTextLine)                                        | done           | done      | 13         | 26  | 0.50    | 0.0%  | $3.2067   | $0.1233  | 2026-05-09 |
| ✓ FEAT-012 | ✓      | daily-page — orquestrador do dia (composição, navegação, autosave)                                     | done           | done      | 38         | 54  | 0.70    | 0.0%  | $71.1441  | $1.3175  | 2026-05-11 |
| ✓ FEAT-013 | ✓      | e2e-mvp-closer                                                                                         | done           | done      | 11         | 7   | 1.57    | 0.0%  | $1.9545   | $0.2792  |            |
| ✓ FEAT-014 | ✓      | ux-mvp-polish — alinhamento de linhas, notas multi-linha e polimento visual                            | done           | done      | 68         | 44  | 1.55    | 0.0%  | —         | —        | 2026-05-11 |
| ✓ FEAT-015 | ✓      | input-ux-fixes — quebra de linha, prioridades dinâmicas, placeholder visual                            | done           | done      | 70         | 19  | 3.68    | 0.0%  | —         | —        | 2026-05-12 |
| ⚠ FEAT-016 | ✓      | ui-v1-design-system — design-system overhaul, átomos shared, token coverage ≥95%                       | escalated      | escalated | 81         | 42  | 1.93    | 0.0%  | $113.1063 | $2.6930  | 2026-05-12 |
| ⚠ FEAT-017 | ✓      | baseline-grid-alignment — rítmica vertical 24px como contrato do design system                         | escalated      | escalated | 18         | 52  | 0.35    | 0.0%  | $189.9252 | $3.6524  | 2026-05-12 |
| ✓ FEAT-018 | ✓      | keyboard-ux-enter — ENTER/SHIFT+ENTER padrão da indústria em listas e agenda                           | done           | done      | 53         | 18  | 2.94    | 0.0%  | $5.5552   | $0.3086  | 2026-05-12 |
| ✓ FEAT-019 | ✓      | drag-reorder — reordenação drag-and-drop + teclado em Prioridades e Notas                              | done           | done      | 65         | 26  | 2.50    | 0.0%  | $123.5428 | $4.7516  | 2026-05-13 |
| ✓ FEAT-020 | ✓      | sticky-note — Post-it global com aba colada, rich text e persistência servidor                         | done           | done      | 32         | 26  | 1.23    | 0.0%  | $5.0530   | $0.1943  | 2026-05-13 |
| ✓ FEAT-021 | ✓      | sticky-note — Post-its multi-cor com drag livre e proporção post-it real                               | done           | done      | 74         | 36  | 2.06    | 0.0%  | $65.5462  | $1.8207  | 2026-05-13 |
| ✓ FEAT-022 | ✓      | undo-delete — confirmação anti-misclick para exclusões em Priorities, Notes e Sticky Note              | done           | done      | 23         | 15  | 1.53    | 0.0%  | $50.9843  | $3.3990  | 2026-05-14 |
| … FEAT-025 | ✓      | Folded gratitude — private paper that unfolds for writing                                              | implementation | running   | 30         | 11  | 2.73    | 0.0%  | $222.5277 | $20.2298 |            |
| ⚠ FEAT-026 | ✓      | Auth + Supabase backend migration                                                                      | escalated      | escalated | 3          | 0   | —       | 0.0%  | $99.7077  | —        |            |
| ✓ FEAT-027 | ✓      | Onboarding Roteiro do Diário (gameficado, paper aesthetic)                                             | done           | done      | 35         | 0   | —       | 0.0%  | $8.9532   | —        |            |
| … FEAT-028 | ✓      | Onboarding polish iteration (legibilidade, autosave-gate, per-day, action buttons, completed-day skin) | implementation | running   | 33         | 0   | —       | 0.0%  | $164.5049 | —        |            |

_Compl. legend:_ ✓ standard · ◐ pré-padrão (excluído de trends/health) · ⊘ pm-bypass (excluído de trends/health)

## Trends

- Dispatches/AC: FEAT-022=1.53 → FEAT-027=0.00 (-100.0%)
- Dev task success rate: FEAT-022=100.0% → FEAT-027=100.0% (0.0%)
- Cost per AC: FEAT-007=$0.6571 → FEAT-025=$20.2298 (+2978.5%)
