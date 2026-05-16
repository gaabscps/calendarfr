# MVP — Página do Dia (Macro Spec)

> Spec macro do projeto. Esta é a fonte da verdade de alto nível que cada SDD flow consulta. Specs por feature ficam em `docs/specs/<feature>/` à medida que cada flow inicia.

**Status:** aprovado — 2026-05-08
**Origem:** brainstorming session (gravada em `~/.claude/plans/silly-questing-garden.md`)
**Próxima fase:** SDD Flow 1 (Foundation) via `spec-writer` skill

---

## Contexto

Construir do zero um planner/agenda web cuja interface simule a experiência tátil de um planner de papel (estilo bullet journal handwritten), com possibilidade de evoluir para integrações e API real no futuro. O MVP é **estritamente a "página do dia"**: dados em JSON local servidos por um companion Node, frontend React + Vite, arquitetura feature-based, suite de testes Jest + Playwright replicando a taxonomia do repo de referência `/Users/gabrielandrade/Developer/valepay/Admin_companies_payments`.

**Por que existe:** o usuário quer a experiência sensorial/visual de escrever em papel, com a vantagem de persistência digital, navegação fluida entre dias e (em fases futuras) integrações. O MVP foca em provar a experiência central — **uma página, um dia, escrever livremente** — antes de explorar visualizações por semana/mês ou sincronização externa.

**Resultado pretendido:** ao final do MVP existe um app local rodável (`npm run dev`) que abre a "página do dia atual", permite escrever em texto rico simples (bold/italic/underline/strikethrough) nas três zonas (top, agenda por hora, notas livres), persiste em JSON via API local, navega entre dias com swipe + teclado, e tem cobertura de testes nas três camadas (unit, integration, e2e real).

---

## Daily ritual loop (princípio de design de features)

A página do dia é organizada em torno de um loop ritual de três momentos. Cada nova feature deve declarar a qual momento pertence e ser projetada para o atrito daquele momento (manhã quer 1 gesto rápido; meio quer escrita livre frequente; noite quer reflexão curta sem fricção).

| Momento   | Mentalidade do usuário        | Feature âncora            | Features de apoio           |
| --------- | ----------------------------- | ------------------------- | --------------------------- |
| **Manhã** | "O que vai definir este dia?" | **Intention** (1 palavra) | Priorities, Mood (header)   |
| **Meio**  | "Estou aqui, fazendo agora"   | **Agenda** (hora a hora)  | Energy, Notes, Sticky notes |
| **Noite** | "O que valeu hoje?"           | **Gratitude** (3 linhas)  | revisitar Priorities (✓/—)  |

**Regras derivadas:**

1. **Footprint pequeno nas âncoras de Manhã/Noite.** Ritual diário tolera atrito ≈ 0. Intention = 1 input; Gratitude = 3 linhas curtas. Nada de modal, multi-step, ou config inicial.
2. **Header carrega os "estados" do dia** (data + intention + mood). Body carrega as "ações" (priorities, agenda, notes, gratitude). Estados respondem em 1 click; ações comportam escrita longa.
3. **Manhã ≠ Noite na hierarquia visual.** Intention vive na header (acompanha o título do dia). Gratitude vive no body (vira parte do registro escrito). Mood é estado, fica perto da intention.
4. **Antes de adicionar feature nova, identificar o momento.** Se ela não encaixa em nenhum, ou duplica outra do mesmo momento, repensar antes de codar. Hábitos cross-day, hidratação, sleep tracking ficam fora do loop e foram **anti-recomendados** no benchmark (commodity ou off-vibe).
5. **Notes é transversal.** Não pertence a um momento — captura livre que pode acontecer em qualquer hora. Por isso ocupa a coluna direita inteira da página.

> Histórico da decisão: o loop emergiu do benchmarking 2026-05-16 (Sunsama, Stoic, Day One, Rosebud, Notion, Bullet Journal analógico). Detalhes em [a conversa do session "calendarfr"](#) — resumo: a maior parte dos planners modernos cobre manhã (intenção) e noite (gratidão/win) mal porque empurram pra modais; o diferencial aqui é manter os três momentos _visíveis na mesma página_, no estilo Moleskine.

---

## Escopo do MVP (IN / OUT)

**IN:**

- Página única "Daily Page" com data atual e navegação para dias anteriores/futuros
- Layout Moleskine: Top (data + 3 prioridades + humor) + Agenda 06–23h (esquerda) + Notas/Lista livre (direita)
- Linha como editor de texto rico (bold/italic/underline/strikethrough) — texto puro, sem categorização semântica
- Persistência JSON local via Node companion server (Fastify) — `data/days/YYYY-MM-DD.json`
- Navegação: swipe horizontal (mouse drag + touch) + setas teclado (`←/→`) + animação de virada de página
- Microanimações de feedback (checkbox marcando, save indicator, hover em linhas)
- Design system interno (átomos em `shared/components`, moléculas em `features/*/components`)
- CLAUDE.md raiz mantido como single source of truth (estrutura, comandos, regras)
- Testes: unit (Jest), integration (Jest + RTL + MSW), e2e (Playwright real)

**OUT (fases futuras):**

- Visualização semanal/mensal/anual
- Streaks, gamificação com pontos, sons, hábitos persistentes
- Sync com Google Calendar / iCal / Notion
- Multi-usuário / autenticação
- API HTTP "real" (substituirá o filesystem do companion server depois)
- File System Access API ou IndexedDB
- Configuração de faixa horária (fica fixo 06–23h no MVP)
- Export/import de dados (planner-to-planner)

---

## Decomposição feature-based

```
calendarfr/
├── package.json                    # workspaces: frontend + server
├── CLAUDE.md                       # contexto/harness/regras (mantido vivo)
├── README.md
├── data/                           # gitignored — JSON dos dias
│   └── days/YYYY-MM-DD.json
├── src/                            # frontend (Vite root)
│   ├── main.tsx, App.tsx, router.tsx
│   ├── features/
│   │   ├── daily-page/             # orquestrador do layout + navegação entre dias
│   │   │   ├── components/
│   │   │   │   ├── DailyPage.tsx           # composição: PaperSheet + 3 zonas
│   │   │   │   ├── PageNavigator.tsx       # swipe + setas + animação
│   │   │   │   └── PaperSheet.tsx          # wrapper visual (textura, sombra)
│   │   │   ├── hooks/
│   │   │   │   ├── useDailyPage.ts         # carrega/salva dia (orquestra api)
│   │   │   │   └── usePageNavigation.ts    # state da navegação (data atual)
│   │   │   ├── api/dailyPageApi.ts         # GET/PUT /api/days/:date
│   │   │   ├── types.ts                    # DailyPageData (composição das outras features)
│   │   │   └── index.ts                    # barrel público
│   │   ├── priorities/             # Top 3 (checkboxes + RichTextLine)
│   │   │   ├── components/{Priorities.tsx, PriorityItem.tsx}
│   │   │   ├── hooks/usePriorities.ts
│   │   │   ├── types.ts                    # Priority { id, text, done }
│   │   │   └── index.ts
│   │   ├── mood/                   # humor/clima do dia
│   │   │   ├── components/{MoodPicker.tsx, MoodChip.tsx}
│   │   │   ├── types.ts                    # Mood { emoji, label, color }
│   │   │   └── index.ts
│   │   ├── agenda/                 # timeline 06–23h, 18 linhas
│   │   │   ├── components/{Agenda.tsx, AgendaSlot.tsx}
│   │   │   ├── hooks/useAgendaSlots.ts
│   │   │   ├── utils/buildSlots.ts         # gera array 06..23
│   │   │   ├── types.ts                    # AgendaSlot { hour, text }
│   │   │   └── index.ts
│   │   ├── notes/                  # bullets livres (coluna direita)
│   │   │   ├── components/{Notes.tsx, NoteItem.tsx}
│   │   │   ├── hooks/useNotes.ts
│   │   │   ├── types.ts                    # Note { id, text, prefix? }
│   │   │   └── index.ts
│   │   └── rich-text-line/         # editor de UMA linha — núcleo de toda escrita
│   │       ├── components/{RichTextLine.tsx, FloatingToolbar.tsx}
│   │       ├── hooks/useRichTextLine.ts    # wrapper sobre Tiptap
│   │       ├── types.ts                    # RichTextValue (HTML string)
│   │       └── index.ts
│   ├── shared/
│   │   ├── components/             # design system interno (átomos)
│   │   │   ├── Button/, Checkbox/, IconButton/, Tooltip/, Spinner/
│   │   │   └── theme/{tokens.ts, GlobalStyles.tsx}   # cores, fontes, paper textures
│   │   ├── hooks/
│   │   │   ├── useDebounce.ts, useKeyboardShortcuts.ts, useSwipe.ts
│   │   │   ├── useAutoSave.ts, useForm.ts, useLocalDate.ts
│   │   ├── utils/
│   │   │   ├── date/{formatDate.ts, parseDate.ts, addDays.ts}
│   │   │   ├── id/createId.ts
│   │   │   └── animation/easings.ts
│   │   └── api/
│   │       ├── client.ts                   # fetch wrapper c/ baseURL
│   │       └── types.ts                    # contratos compartilhados front↔server
│   └── assets/                     # textura de papel, fontes (Caveat, Inter)
├── server/                         # Node companion (workspace separado)
│   ├── src/
│   │   ├── index.ts                # Fastify boot
│   │   ├── routes/days.ts          # GET / PUT /api/days/:date
│   │   ├── storage/jsonStore.ts    # leitura/escrita atômica em data/days/
│   │   └── schema/daySchema.ts     # zod, validação de payload
│   └── package.json
├── test-utils/                     # helpers compartilhados de teste
│   ├── render.tsx                  # renderWithProviders (Theme + Router)
│   ├── msw/{server.ts, handlers.ts, factories/dayFactories.ts}
│   └── factories/{makeDay.ts, makePriority.ts, makeNote.ts}
├── e2e/
│   ├── _helpers/{daily-page-flow.ts}
│   ├── real/{daily-page.spec.ts, navigation.spec.ts, priorities.spec.ts}
│   └── smoke/{boot-smoke.spec.ts}
├── jest.config.js, jest.polyfills.js, jest.setup.js
├── playwright.config.ts
└── vite.config.ts
```

**Regras invioláveis (vão pro CLAUDE.md):**

1. Nenhuma feature importa de outra `features/*/internals` — só do `index.ts` (barrel)
2. `shared/components/*` não conhece domínio (sem `Priority`, `Note`, etc no nome)
3. `rich-text-line` é a única abstração sobre Tiptap — ninguém mais importa Tiptap direto
4. Cada feature tem seu `types.ts` exportado; `daily-page/types.ts` compõe os outros
5. Server e front são workspaces separados, comunicação só via HTTP (sem import cruzado)
6. Arquivos > 250 linhas devem ser quebrados antes do PR

---

## Modelo de dados

**Arquivo `data/days/2026-05-08.json`:**

```json
{
  "schemaVersion": 1,
  "date": "2026-05-08",
  "mood": { "emoji": "🙂", "label": "tranquilo", "color": "#a3c4a8" },
  "priorities": [
    { "id": "p_01H...", "text": "<b>Revisar</b> contrato", "done": false },
    { "id": "p_01H...", "text": "Enviar deck", "done": true },
    { "id": "p_01H...", "text": "", "done": false }
  ],
  "agenda": [
    { "hour": 6, "text": "" },
    { "hour": 7, "text": "<i>caminhada</i>" },
    { "hour": 8, "text": "" }
    /* ... até hour 23 */
  ],
  "notes": [
    { "id": "n_01H...", "prefix": "•", "text": "lembrar de ligar pra tia" },
    { "id": "n_01H...", "prefix": "→", "text": "<s>migração</s> feita" }
  ],
  "createdAt": "2026-05-08T06:00:00.000Z",
  "updatedAt": "2026-05-08T19:23:11.124Z"
}
```

- `text` guarda HTML produzido pelo Tiptap, restrito a `<b><i><u><s>` via schema. Sanitizado no server antes de gravar.
- `id` é ULID (lexicograficamente ordenável). `agenda` não tem id porque `hour` é a chave natural.
- `schemaVersion: 1` — facilita migrations no futuro (campo presente desde dia zero).
- Arquivo é criado lazy: GET de dia inexistente retorna esqueleto vazio (não escreve em disco até o primeiro PUT).

---

## Contrato de API (server companion)

```
GET  /api/days/:date           → 200 DailyPageData | 404 esqueleto vazio (200 c/ default)
PUT  /api/days/:date           → 200 DailyPageData (ecoa o salvo)
GET  /api/health               → 200 { status: "ok", version }
```

- `:date` em formato `YYYY-MM-DD`, validado por regex no Fastify.
- PUT recebe o objeto completo (write-all, sem PATCH no MVP — simples e seguro).
- Validação com `zod` no server, schema compartilhado via `shared/api/types.ts`.
- Server escreve com `fs.writeFile` em arquivo temporário + rename atômico (evita corromper se cair no meio).
- Front faz **autosave debounced** (1.5s) via `useAutoSave` — não tem botão "salvar".

---

## Editor de linha (rich-text-line)

- **Tiptap** com extensões mínimas: `Bold`, `Italic`, `Underline`, `Strike`, `Document`, `Text`, `Paragraph`, `History`. Sem listas, sem imagens, sem code-block — uma linha só.
- **`FloatingToolbar`** aparece on-select (mesmo padrão do Notion): 4 botões pequenos com micro-fade.
- **Atalhos teclado:** `Cmd/Ctrl+B/I/U`, `Cmd/Ctrl+Shift+S` (riscado).
- **Output:** HTML string normalizado (server sanitiza com `dompurify` permitindo só as 4 tags).
- Componente recebe `value` + `onChange` — controlado, fácil de testar isolado.

---

## Navegação entre dias

- `usePageNavigation` mantém `currentDate: Date` em state. Mudanças disparam fetch.
- **Swipe:** `useSwipe` (custom hook em `shared/hooks`) escuta `pointerdown/move/up`. Threshold: 80px ou velocidade > 0.4 px/ms.
- **Teclado:** `useKeyboardShortcuts` registra `←` (dia anterior) e `→` (próximo) — desabilita se foco estiver dentro do editor (`document.activeElement` em contenteditable).
- **Animação:** `framer-motion` com `AnimatePresence` — página sai pra esquerda/direita com easing custom (`easings.paperFlip`), nova entra do lado oposto. Duração ~280ms.
- Se o usuário swipa rápido entre dias, abort fetch anterior (AbortController dentro de `useDailyPage`).

---

## Estética (Bullet journal handwritten + ajustes)

**Tokens (`shared/components/theme/tokens.ts`):**

```ts
export const colors = {
  paper: '#fff9f0',
  paperLine: '#e0d4b8',
  ink: '#2a4d3a', // verde-musgo
  inkSecondary: '#6b8a78',
  inkMuted: '#a8b8ad',
  accent: '#c2410c', // tinta vermelha (prioridades)
  shadow: 'rgba(60, 40, 20, 0.12)',
};
export const fonts = {
  hand: '"Caveat", "Comic Sans MS", cursive', // headings + datas
  body: '"Inter", system-ui, sans-serif', // corpo (legibilidade)
};
export const paper = {
  rule: 'repeating-linear-gradient(0deg, transparent 0 17px, var(--paper-line) 17px 18px)',
};
```

- **Fontes:** Caveat (Google Font, self-hosted via `@fontsource`) + Inter
- **PaperSheet** aplica textura, sombra suave, padding interno
- **Microanimações:** `framer-motion` `layout` + `transition: { type: 'spring', stiffness: 220, damping: 20 }` em checkboxes, hover em linhas (cor secundária→primária), save indicator ("salvando…" → "✓" com fade).

---

## Estratégia de testes (replicada do repo de referência)

**Adaptações do `Admin_companies_payments`:**

| Item                | Origem (referência)                                 | Adaptação aqui                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Jest config         | `next/jest`                                         | `babel-jest` + `@swc/jest` (mais rápido) com presets manuais. `testEnvironment: jsdom`, `setupFiles`, `setupFilesAfterEach`, `moduleNameMapper` (`@/*` → `src/*`, `@/test-utils/*` → `test-utils/*`) |
| Polyfills           | undici, TextEncoder, etc                            | Mesmo `jest.polyfills.js` (file copia 1:1 — Vite não muda jsdom)                                                                                                                                     |
| Setup               | MSW lifecycle, console.error→throw, mocks globais   | Igual; mocks de `next/router` viram mocks de `react-router-dom` (`useNavigate`, `useParams`). Router escolhido: `react-router-dom@6`                                                                 |
| Test utils          | `renderWithProviders` (ThemeProvider + UserContext) | `renderWithProviders` (ThemeProvider + Router só)                                                                                                                                                    |
| MSW factories       | `test-utils/msw/factories/auth.ts`                  | `test-utils/msw/factories/dayFactories.ts` (mockGetDaySuccess, mockPutDayCapture, mockGetDayNotFound)                                                                                                |
| Coverage thresholds | Por arquivo crítico + global baixo                  | `shared/api/`, `shared/utils/date/`, `features/rich-text-line/` em 95%; global em 70% (projeto novo)                                                                                                 |
| E2E                 | `e2e/real/` contra staging real                     | `e2e/real/` contra companion server local + MSW desligado. Sem mocks. (`PLAYWRIGHT_BASE_URL=http://localhost:3003`)                                                                                  |
| Smoke               | Pós-deploy nightly                                  | Boot test (`npm run dev` sobe, `/` responde, primeiro dia carrega)                                                                                                                                   |

**Naming (idêntico ao referência):**

- Unit: `**/__tests__/*.test.{ts,tsx}`
- Integration: `**/__tests__/*.integration.test.{ts,tsx}`
- E2E: `e2e/real/*.spec.ts`, `e2e/smoke/*.spec.ts`

**Regras invioláveis (vão pro CLAUDE.md):**

1. E2E real não mocka backend — bate no companion server de verdade
2. Toda factory MSW nova exige spec E2E correspondente no mesmo PR
3. Coverage só sobe; nunca abaixar pra passar
4. `console.error` em testes vira falha de teste (igual ao referência)

---

## CLAUDE.md (steering vivo)

Estrutura mínima do `CLAUDE.md` raiz, atualizado a cada feature:

```
# CalendárioFR — Planner Web

## Comandos
- npm run dev (sobe Vite + companion em paralelo)
- npm run dev:server / npm run dev:client
- npm test, npm run test:watch, npm run test:coverage
- npm run test:e2e:real, npm run test:e2e:smoke
- npm run lint, npm run typecheck

## Arquitetura
- React + Vite (front) + Fastify (companion server, JSON storage)
- Feature-based: src/features/<feature>/{components,hooks,api,types,index}
- Cada feature exporta SÓ via index.ts. Sem cross-feature imports internos.

## Regras invioláveis
[lista numerada das 6 regras de arquitetura + 4 regras de testes acima]

## Taxonomia de testes
[tabela: camada / mocka o quê / ferramenta / onde / quando roda]

## Convenções
- Naming, file size limits, padrão de componente, import order

## Features ativas
- daily-page, priorities, mood, agenda, notes, rich-text-line
```

CLAUDE.md cresce conforme features novas entram. Nunca é "documentação geral" — é **harness pra próximo desenvolvedor (humano ou agente) entrar em 5 minutos**.

---

## Estratégia de execução: SDD por feature

Em vez de um único plano monolítico, este projeto é executado como **N ciclos SDD encadeados**, um por feature/área. Cada ciclo passa por: `spec-writer` → `designer` → `task-builder` → `orchestrator` (dev ‖ code-reviewer ‖ logic-reviewer → qa).

### Sequência de SDD flows (ordem de dependência)

**Flow 1 — Foundation (sequencial, bloqueia tudo)**

- Escopo: scaffolding do monorepo (workspaces front + server), Vite + TS config, ESLint/Prettier, Jest+SWC config, Playwright config, `test-utils/` esqueleto, CI minimal, CLAUDE.md raiz, design system tokens (`shared/components/theme/`), `PaperSheet` átomo
- Por que sozinho: define convenções que todas as outras features herdam; mexer aqui depois quebra muito

**Flow 2 — Server companion (paralelizável com Flow 3)**

- Escopo: Fastify boot, rota `GET/PUT /api/days/:date`, `jsonStore` com escrita atômica, validação zod, testes unit + integration do server
- Independente do front

**Flow 3 — `rich-text-line` feature (paralelizável com Flow 2)**

- Escopo: editor Tiptap embutido, FloatingToolbar, atalhos de teclado, sanitização, testes unit + integration
- Bloqueia Flows 4–7 (todas as features de domínio dependem)

**Flow 4 — Features de domínio (paralelizáveis entre si após Flows 1–3)**

- 4a) `priorities` (Top 3 com checkbox)
- 4b) `mood` (picker de humor/clima)
- 4c) `agenda` (timeline 06–23h, 18 slots)
- 4d) `notes` (bullets livres com prefix)
- Não se conhecem entre si; podem rodar em até 4 worktrees/sessões paralelas

**Flow 5 — `daily-page` orquestrador (sequencial, depende de Flow 4 inteiro)**

- Escopo: composição das 4 features no layout Moleskine, `useDailyPage` (load/save), `usePageNavigation`, swipe + atalhos teclado, animação de virada, autosave debounced

**Flow 6 — E2E real + smoke (sequencial, depende de Flow 5)**

- Escopo: specs Playwright em `e2e/real/` cobrindo escrita, persistência, navegação, atalhos. Smoke test de boot. Fecha o MVP.

### Critério "abrir um novo SDD flow"

Se SIM aos três:

- Escopo coeso e independente (revisável isoladamente)?
- > 3 arquivos a criar/editar?
- Critérios de aceitação testáveis em UI ou API?

Caso contrário, vira task dentro do flow do feature pai.

---

## Observabilidade & métricas

Como o projeto é desenvolvido majoritariamente via sessões SDD/vibecoding com agentes, observabilidade tem **três frentes distintas** com nomenclatura industrial estabelecida. Esta seção é o catálogo canônico das opções e ferramentas a considerar; prioridades concretas e flow de execução são decididas em flow próprio.

### Frente 1 — AgentOps (observabilidade de agentes; única do AI-driven)

**AgentOps** é a disciplina industrial (paralelo a DevOps/MLOps) que cobre o ciclo de vida de agentes autônomos em produção. Coined pelo AgentOps SDK e adotado por OpenTelemetry, N-iX, XenonStack, Datadog em 2025–2026. Esta é a frente **única** do AI-driven dev — não tem equivalente em dev tradicional.

**5 pilares (XenonStack / N-iX 2026 framework):**

| Pilar             | O que é                                                                           | Aplicação a este projeto                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Observability** | Captura de traces, telemetria, tool calls, fluxo de contexto, execução end-to-end | Extrator de `.agent-session/<id>/` (manifest + outputs); idealmente alinhado com OpenTelemetry GenAI Semantic Conventions |
| **Evaluation**    | Mede qualidade de output, latency, hallucination, task-level performance          | Trust score do dev agent (first-try success), AC closure latency, dispatches/AC, reviewer findings rate                   |
| **Governance**    | Guardrails, policy compliance, auditability, safe execution boundaries            | `audit-agent` skill + `dispatch-manifest.json` reconciliation; PreToolUse hooks (guard-session-scope, block-git-write)    |
| **Feedback**      | Incorporação de user signals, approvals, corrections                              | `pm_note` em manifest; loop iterations; PM intervention count                                                             |
| **Resilience**    | Failures graciosas via retries, fallbacks, degradation                            | `blocker-specialist` cascade; per-task budget caps (`review_loops_max`, `qa_loops_max`, `blocker_calls_max`)              |

**Padrão de instrumentação:** [OpenTelemetry GenAI Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/gen-ai/) (status experimental em 2026, mas é o de facto da indústria; mantido pelo GenAI SIG desde Apr/2024). Spans relevantes: `invoke_agent {agent_name}`, `create_agent`, `execute_tool`. Atributos: `gen_ai.operation.name`, `gen_ai.agent.name`, `gen_ai.usage.input_tokens`, `gen_ai.usage.output_tokens`.

**Métricas-alvo (extraíveis de `.agent-session/*` hoje):**

| Métrica                   | Definição                            | Como extrair                                           |
| ------------------------- | ------------------------------------ | ------------------------------------------------------ |
| Dispatches por AC         | Custo real por requisito             | `count(actual_dispatches) / count(spec.ac_scope)`      |
| Trust score (per role)    | First-try `status: done` rate        | `done_first_try / total_dispatches_for_role`           |
| Loop rate                 | % tasks com retry loop               | `tasks_with_loops > 0 / total_tasks`                   |
| Escalation rate           | Galileo healthy band: 10–15%         | `pending_human / total_tasks`                          |
| AC closure latency        | Spec aprovado → primeiro qa pass     | `phase_history[specify].completed_at` → `qa.timestamp` |
| Phase duration            | Tempo por fase SDD                   | `phase_history[].started_at..completed_at`             |
| Reviewer findings density | Findings critical+major por dispatch | aggregate `severity` em outputs/\*-reviewer.json       |
| Rework rate               | Linhas mexidas 2× em ≤ N dias        | `git log --numstat` heurística                         |
| Token cost (best-effort)  | Custo por dispatch / por AC          | `usage.total_tokens` retornado pelo Task tool          |

**Ferramentas de mercado (referência, não obrigatório adotar):** [AgentOps SDK](https://github.com/agentops-ai/agentops), [Langfuse](https://langfuse.com), [Arize Phoenix](https://phoenix.arize.com), [Helicone](https://helicone.ai), [LangSmith](https://smith.langchain.com), [Datadog LLM Observability](https://www.datadoghq.com/blog/llm-otel-semantic-convention/). Para o MVP, geração de Markdown estático local é suficiente — adoção de plataforma fica para escala.

### Frente 2 — Static analysis & architecture fitness (qualidade do código gerado)

Padrão da indústria para qualquer codebase, **não específico de AI-driven**. Importa aqui porque agentes podem produzir código sintaticamente válido mas semanticamente fraco (testes que tocam linha sem assertar; `any` implícito; deps gigantes).

**Software quality metrics (ISO/IEC 25010 — maintainability + reliability):**

| Ferramenta                                                                    | O que mede                                                                             |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| [Stryker Mutator](https://stryker-mutator.io/)                                | Mutation testing — % de mutantes que os testes matam (sinal mais honesto que coverage) |
| [type-coverage](https://github.com/plantain-00/type-coverage)                 | % de identificadores tipados sem `any`                                                 |
| [Knip](https://knip.dev/)                                                     | Exports/files mortos, deps não usadas, types órfãos                                    |
| [rollup-plugin-visualizer](https://github.com/btd/rollup-plugin-visualizer)   | Bundle composition por chunk                                                           |
| [eslint-plugin-sonarjs](https://github.com/SonarSource/eslint-plugin-sonarjs) | Cognitive complexity + code smells                                                     |

**Architecture fitness functions** (termo de Ford/Parsons/Kua, _Building Evolutionary Architectures_, O'Reilly): testes automatizados que falham se a arquitetura é violada. Aplicação:

| Ferramenta                                                                         | Fitness function que enforça                                            |
| ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [dependency-cruiser](https://github.com/sverweij/dependency-cruiser)               | "Feature A não importa internals de Feature B" — quebra build se violar |
| [Madge](https://github.com/pahen/madge)                                            | "Sem ciclos no grafo de import"                                         |
| [eslint-plugin-boundaries](https://github.com/javierbrea/eslint-plugin-boundaries) | Same as dependency-cruiser, integrado ao ESLint                         |
| [size-limit](https://github.com/ai/size-limit)                                     | "Bundle de feature X ≤ 30 KB"                                           |

### Frente 3 — APM / RUM (observabilidade de runtime, pós-MVP)

Padrão da indústria para qualquer app em produção. Cobre os **three pillars of observability** (logs / metrics / traces — Charity Majors et al.). Aplicável quando o app rodar em ambiente de usuário, ou seja, pós-Flow 6.

| Categoria                                    | Ferramenta                                                                                  | Mede                                        |
| -------------------------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------- |
| **APM** (Application Performance Monitoring) | [Sentry](https://sentry.io), [OpenTelemetry](https://opentelemetry.io)                      | Erros runtime, latência, traces server-side |
| **RUM** (Real User Monitoring)               | [Web Vitals](https://web.dev/vitals/) + analytics, [Sentry RUM](https://sentry.io/for/rum/) | LCP, INP, CLS reais em browser              |
| **Synthetic / CI checks**                    | [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)                              | Performance/a11y/seo scores em PR           |

### Onde isso entra no projeto

- **Catálogo aqui (este doc):** referência canônica das três frentes com nomenclatura industrial.
- **Decisão de prioridades:** vai num **Flow 1.5** (a brainstormar; não bloqueia Flow 2). Recomendação inicial: começar pela **Frente 1 (AgentOps)** porque dados já existem em `.agent-session/<id>/` e ROI compounding com cada flow novo.
- **CLAUDE.md raiz:** ganha um link pra esta seção quando primeiro flow de observabilidade landar.
- **CI:** workflow extra que roda métricas em PR (idealmente comenta no PR).

### Princípios

1. **Industry terminology first.** Pesquisar nomenclatura padrão antes de criar termos próprios (regra de processo deste projeto).
2. **Métrica primeiro, automação depois.** Antes de adotar plataforma SaaS (Langfuse, AgentOps SaaS, Sentry), gerar Markdown estático local — o sinal vale, o ferramental vem.
3. **Não otimizar pra métrica errada.** Mutation score 100% pode ser caro demais; budget realista é melhor que ditadura matemática.
4. **AgentOps é o diferencial competitivo.** Static analysis e APM são commodity da indústria; séries temporais AgentOps em SDD são inéditas e onde mora a vantagem deste projeto.
5. **Comparar entre sessões > absoluto numa sessão.** "Dispatches/AC caiu 40%" é insight; "0.36 dispatches/AC" sozinho não.
6. **Nada bloqueia o build sem budget aprovado.** Antes de quebrar PR por mutation score / fitness function, definir thresholds em PR explícito (mesmo princípio de coverage thresholds).

---

## Verificação (smoke local ao final do MVP)

1. `npm install`
2. `npm run dev` → Vite em :3000, companion em :3003
3. Abrir `http://localhost:3000` — vê "página do dia" do dia atual, vazia
4. Escrever em uma prioridade, marcar checkbox, escolher humor, escrever em um slot da agenda, escrever em um bullet de nota
5. Selecionar texto → toolbar aparece → bold/italic/underline/strike funcionam
6. Recarregar página → conteúdo persiste (lido de `data/days/2026-05-08.json`)
7. Pressionar `←` ou arrastar pra direita → vai para 2026-05-07 (vazio); arrastar pra esquerda → volta
8. Inspecionar `data/days/` → arquivos JSON com schema esperado

**Testes:**

- `npm test` passa (unit + integration), coverage ≥ thresholds
- `npm run test:e2e:real` roda contra companion local e passa em todos os specs
- `npm run typecheck` sem erros

**Regressões a verificar manualmente:**

- Editor não permite pegar `Enter` (linha única — `Enter` muda foco pra próxima)
- Autosave não dispara em loop
- Swipe rápido entre dias não causa flash de dado errado
- Tab order do teclado é coerente (top → agenda → notes)
