# CalendárioFR — Planner Web

**Última atualização:** 2026-05-09
**Macro spec:** [`docs/specs/2026-05-08-mvp-overview.md`](docs/specs/2026-05-08-mvp-overview.md)
**Spec ativo:** [`.agent-session/FEAT-007/spec.md`](.agent-session/FEAT-007/spec.md)

---

## Comandos

| Script                      | O que faz                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`               | Sobe Vite (porta 3000) + Fastify (porta 3003) em paralelo, logs prefixados por workspace |
| `npm run dev:web`           | Apenas o Vite dev server (`web/`)                                                        |
| `npm run dev:server`        | Apenas o companion Fastify (`server/`) com hot-reload via `tsx watch`                    |
| `npm run typecheck`         | `tsc --noEmit` em ambos os workspaces (`strict: true`, `noUncheckedIndexedAccess`)       |
| `npm run lint`              | ESLint flat config v9 sobre todo o repo (TS, TSX, arquivos de teste)                     |
| `npm run format`            | Prettier `--write` — formata tudo in-place                                               |
| `npm run format:check`      | Prettier `--check` — falha se houver diff (usado em CI)                                  |
| `npm test`                  | Jest com `@swc/jest`, ambiente jsdom, MSW ativo                                          |
| `npm run test:watch`        | Jest em modo watch (desenvolvimento local)                                               |
| `npm run test:coverage`     | Jest com relatório de cobertura em `coverage/` (text + html + lcov)                      |
| `npm run test:e2e:real`     | Playwright `--project=real` — bate no companion real sem mocks                           |
| `npm run test:e2e:smoke`    | Playwright `--project=smoke` — smoke do companion (`localhost:3003`)                     |
| `npm run build`             | Build de produção do front (`web/`) via Vite                                             |
| `npm run build-storybook`   | Gera bundle estático do Storybook em `web/storybook-static/`                             |
| `npm run storybook`         | Storybook 8 em `localhost:6006` — bancada do design system                               |
| `npm run agentops:report`   | Gera relatórios AgentOps em docs/agentops/ (overview cross-flow + 1 file por flow)       |
| `npm run mutation`          | Stryker mutation testing contra scripts/agentops/ — emite reports/mutation/              |
| `npm run type-coverage`     | Verifica % de identificadores tipados (threshold 95%) — emite relatório em stdout        |
| `npm run arch:check`        | dependency-cruiser: valida regras de boundary (no-circular, no-cross-feature, etc.)      |
| `npm run arch:graph`        | dependency-cruiser: gera docs/architecture/dependency-graph.svg (ou .md se sem Graphviz) |
| `npm run agentops:backfill` | Aplica usage-backfill.json retroativamente aos manifests FEAT-001/002                    |

> **Primeiro run do Jest** é mais lento (SWC compila sem cache). Runs subsequentes < 5 s.
> **Bypass de hooks:** `git commit --no-verify` é responsabilidade do dev — husky não bloqueia por design.

---

## Arquitetura

O projeto é um monorepo npm workspaces com dois packages: `web/` (React 19 + Vite) e `server/` (Fastify 5). Compartilham `test-utils/` (helpers de teste) e `e2e/` (specs Playwright), ambos na raiz.

O frontend segue estrutura **feature-based**:

```
src/features/<feature>/
  components/   # componentes React da feature
  hooks/        # hooks de domínio
  api/          # chamadas HTTP (GET/PUT para o companion)
  types.ts      # tipos públicos da feature
  index.ts      # barrel — única superfície pública
```

Átomos reutilizáveis ficam em `src/shared/components/` (sem domínio: sem `Priority`, `Note` etc. no nome). Tokens de tema em `src/shared/components/theme/tokens.ts`.

O companion server (FEAT-006) serve `GET /api/health`, `GET /api/days/:date` (lazy creation), e `PUT /api/days/:date` (autosave), armazenando JSON em `data/days/YYYY-MM-DD.json` (gitignored). Implementa escrita atômica via `server/src/storage/jsonStore.ts` (tmp + rename), validação zod em `server/src/schema/daySchema.ts`, sanitização HTML restrita às 4 tags (`<b><i><u><s>`) via `server/src/lib/sanitize.ts`, e tipos compartilhados via workspace `@calendarfr/shared`. Lazy creation: GET inexistente retorna esqueleto em-memória sem criar arquivo.

Para detalhes de arquitetura, fluxos e modelo de dados, ver o [macro spec](docs/specs/2026-05-08-mvp-overview.md).

---

## Regras invioláveis

### Arquitetura

1. Nenhuma feature importa de outra `features/*/internals` — só do `index.ts` (barrel)
2. `shared/components/*` não conhece domínio (sem `Priority`, `Note`, etc. no nome)
3. `rich-text-line` é a única abstração sobre Tiptap — ninguém mais importa Tiptap direto
4. Cada feature tem seu `types.ts` exportado; `daily-page/types.ts` compõe os outros
5. Server e front são workspaces separados, comunicação só via HTTP (sem import cruzado)
6. Arquivos > 250 linhas devem ser quebrados antes do PR

### Testes

1. E2E real não mocka backend — bate no companion server de verdade
2. Toda factory MSW nova exige spec E2E correspondente no mesmo PR
3. Coverage só sobe; nunca abaixar pra passar
4. `console.error` em testes vira falha de teste (interceptor ativo no `jest.setup.js`)

### AgentOps (PM/orchestrator)

1. Cada entrada de `actual_dispatches[]` no `dispatch-manifest.json` **deve** carregar `usage` (`total_tokens`, `tool_uses`, `duration_ms`, `model`) e `pm_note` (1 linha resumindo o `summary_for_reviewers` do Output Packet). Sem isso, o report consumidor mostra `—` para tokens/$ /duração e os AC closures viram `missing` — o relatório fica inconsistente (ver FEAT-006). Estimar por proxy é aceitável; deixar `null` não é.
2. Ao encerrar a sessão de orchestrator (handoff emitido / `current_phase: done`), **rodar `npm run agentops:report`** e commitar `docs/agentops/*.{md,html}` no mesmo commit do handoff. O Stop hook tenta auto-disparar (best-effort); a obrigação de garantir o report atualizado é do PM.

---

## Taxonomia de testes

| Camada      | Mocka                               | Ferramenta                     | Onde                                       | Quando roda                         |
| ----------- | ----------------------------------- | ------------------------------ | ------------------------------------------ | ----------------------------------- |
| Unit        | Tudo exceto o módulo testado        | Jest + RTL + `@swc/jest`       | `**/__tests__/*.test.{ts,tsx}`             | `npm test` (local + CI)             |
| Integration | Rede (via MSW)                      | Jest + RTL + MSW               | `**/__tests__/*.integration.test.{ts,tsx}` | `npm test` (local + CI)             |
| E2E real    | Nada — companion rodando de verdade | Playwright (`--project=real`)  | `e2e/real/*.spec.ts`                       | Manual / Flow 6                     |
| Smoke       | Nada — apenas verifica boot         | Playwright (`--project=smoke`) | `e2e/smoke/*.spec.ts`                      | Manual (companion precisa estar up) |

> Para rodar e2e smoke: `npm run dev:server` em um terminal, depois `npm run test:e2e:smoke` em outro.

---

## Convenções

- **Naming de arquivos:** `PascalCase` para componentes/types, `camelCase` para hooks/utils/api
- **Naming de testes:** `*.test.tsx` (unit), `*.integration.test.tsx` (integration), `*.spec.ts` (e2e)
- **Tamanho máximo:** 250 linhas por arquivo — quebrar antes do PR
- **Import order:** gerenciado pelo ESLint `import/order` (externas → internas `@/*` → relativas)
- **Componente padrão:** função nomeada com `export` explícito; sem default export em componentes (exceto pages e stories)
- **Path aliases:** `@/*` → `src/*` e `@/test-utils/*` → `test-utils/*` (consistente em tsconfig, vite e jest)
- **CSS:** CSS Modules por componente (`Component.module.css`); tokens via CSS custom properties do `GlobalStyles`

---

## Features ativas

- `foundation` (FEAT-001) — em desenvolvimento
- `agentops` (FEAT-002) — em desenvolvimento
- `agentops-quality` (FEAT-003) — em desenvolvimento
- `agentops-dashboard` (FEAT-004) — em desenvolvimento
- `server-companion` (FEAT-006) — em desenvolvimento
- `rich-text-line` (FEAT-007) — em desenvolvimento

---

## AgentOps reports

Os relatórios em `docs/agentops/` são versionados (não estão no `.gitignore`) e devem ser commitados junto com o código.
Para regenerá-los após alterações em `.agent-session/`, execute `npm run agentops:report`.

A partir de FEAT-004, o comando gera **duas views por flow**:

- `.md` — fonte canônica de dados (audit trail, consumível por ferramentas, GitHub render); **NÃO remover**.
- `.html` — view recomendada para leitura humana: KPIs sticky, story timeline, drilldown collapsed, dark mode automático, GitHub Pages-friendly. Abrir com `open docs/agentops/index.html`.

Arquivos gerados: `docs/agentops/index.md`, `docs/agentops/index.html`, `docs/agentops/<FEAT-ID>.md`, `docs/agentops/<FEAT-ID>.html`.

A partir de FEAT-003, os reports incluem: seção **"Repo health"** (mutation score, type coverage %, dep violations) no topo do index e em cada per-flow report; seção **"Cost"** com estimativa USD/AC por flow; e `docs/architecture/dependency-graph.svg` gerado por `npm run arch:graph`.
Dados de repo health lidos de `reports/` (gitignored) — rodar `npm run mutation && npm run type-coverage:json && npm run arch:check` antes do report para dados atualizados.

Override de diretório HTML: `AGENTOPS_HTML_DIR=<path> npm run agentops:report` (default: mesmo que `docs/agentops/`).
Referência: [`docs/specs/2026-05-08-mvp-overview.md`](docs/specs/2026-05-08-mvp-overview.md) — seção "Frente 1 — AgentOps".
