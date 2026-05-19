# CalendárioFR — Planner Web

**Última atualização:** 2026-05-19
**Macro spec:** [`docs/specs/2026-05-08-mvp-overview.md`](docs/specs/2026-05-08-mvp-overview.md)
**Monetização:** [`docs/specs/2026-05-16-monetization-strategy.md`](docs/specs/2026-05-16-monetization-strategy.md)
**Roadmap ativo:** [`docs/specs/2026-05-19-supabase-migration-roadmap.md`](docs/specs/2026-05-19-supabase-migration-roadmap.md) — migração Fastify→Supabase em 4 FEATs (030→033)
**Spec ativo:** [`.agent-session/FEAT-007/spec.md`](.agent-session/FEAT-007/spec.md)

---

## Comandos

| Script                     | O que faz                                                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------- |
| `npm run dev`              | Sobe Vite (porta 3000) + Fastify (porta 3003) em paralelo, logs prefixados por workspace            |
| `npm run dev:web`          | Apenas o Vite dev server (`web/`)                                                                   |
| `npm run dev:server`       | Apenas o companion Fastify (`server/`) com hot-reload via `tsx watch`                               |
| `npm run typecheck`        | `tsc --noEmit` em ambos os workspaces (`strict: true`, `noUncheckedIndexedAccess`)                  |
| `npm run lint`             | ESLint flat config v9 sobre todo o repo (TS, TSX, arquivos de teste)                                |
| `npm run format`           | Prettier `--write` — formata tudo in-place                                                          |
| `npm run format:check`     | Prettier `--check` — falha se houver diff (usado em CI)                                             |
| `npm test`                 | Jest com `@swc/jest`, ambiente jsdom, MSW ativo                                                     |
| `npm run test:watch`       | Jest em modo watch (desenvolvimento local)                                                          |
| `npm run test:coverage`    | Jest com relatório de cobertura em `coverage/` (text + html + lcov)                                 |
| `npm run test:e2e:real`    | Playwright `--project=real` — bate no companion real sem mocks                                      |
| `npm run test:e2e:smoke`   | Playwright `--project=smoke` — smoke do companion (`localhost:3003`)                                |
| `npm run build`            | Build de produção do front (`web/`) via Vite                                                        |
| `npm run build-storybook`  | Gera bundle estático do Storybook em `web/storybook-static/`                                        |
| `npm run storybook`        | Storybook 8 em `localhost:6006` — bancada do design system                                          |
| `npm run db:push`          | Aplica migrations Supabase no projeto remoto via `supabase db push`                                 |
| `npm run db:reset`         | Reseta o DB local Supabase via `supabase db reset` (uso dev local)                                  |
| `npm run db:migrate-local` | Roda script one-shot que cria user owner e migra `server/data/days/*.json` para Supabase (FEAT-030) |
| `npm run mutation`         | Stryker mutation testing contra server/src/ — emite reports/mutation/                               |
| `npm run type-coverage`    | Verifica % de identificadores tipados (threshold 95%) — emite relatório em stdout                   |
| `npm run arch:check`       | dependency-cruiser: valida regras de boundary (no-circular, no-cross-feature, etc.)                 |
| `npm run arch:graph`       | dependency-cruiser: gera docs/architecture/dependency-graph.svg (ou .md se sem Graphviz)            |

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

A partir de FEAT-030, o repo introduz Supabase como backend de produção em 4 FEATs sequenciais: 030 (infra base + migração de dados do owner), 031 (auth email+senha), 032 (days persistence via Supabase), 033 (cleanup do Fastify). Schema canônico em `supabase/migrations/0001_init.sql`; cliente em `web/src/lib/supabase.ts`. Fastify companion permanece ativo até FEAT-033.

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

### Comunicação no GitHub

1. **Sempre em inglês**: commits, mensagens de PR, título/descrição de issues, comments em PR. Conversas com o usuário, comentários no código (quando necessários) e docs internos seguem em PT-BR — só a superfície voltada ao GitHub é EN.

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
- `server-companion` (FEAT-006) — em desenvolvimento
- `rich-text-line` (FEAT-007) — em desenvolvimento
- `priorities` (FEAT-008) — em desenvolvimento
- `agenda` (FEAT-009) — em desenvolvimento
- `mood` (FEAT-010) — em desenvolvimento
- `notes` (FEAT-011) — em desenvolvimento
- `daily-page` (FEAT-012) — em desenvolvimento
- `energy` (FEAT-023) — em desenvolvimento
