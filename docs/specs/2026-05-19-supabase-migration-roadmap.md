# Roadmap — Migração para Supabase (Backend de Produção)

> Roadmap operacional da migração do storage local (JSON files no Fastify companion) para Supabase (Postgres + Auth) como backend de produção do SaaS. Documento de orientação entre sessões — define escopo, ordem e dependências dos próximos 4 FEATs.

**Status:** aprovado — 2026-05-19
**Origem:** decisão de arquitetura na sessão 2026-05-19 (chat "criar projeto Supabase")
**Macro spec relacionado:** [`2026-05-08-mvp-overview.md`](2026-05-08-mvp-overview.md)
**Driver de negócio:** [`2026-05-16-monetization-strategy.md`](2026-05-16-monetization-strategy.md) — exige multi-tenant + auth real pra vender pra outros usuários

---

## Decisões arquiteturais (já fechadas)

1. **Sem BFF.** Mata o `server/` Fastify ao final. Web fala direto com Supabase via `@supabase/supabase-js`. Edge Functions só quando aparecer caso que exija segredo server-side (ex.: Stripe webhook, num FEAT futuro).
2. **Auth email + senha** via `supabase.auth.signUp` / `signInWithPassword`. Sem magic link, sem OAuth no primeiro lote.
3. **Schema relacional, não jsonb.** O spec de monetização (`2026-05-16-monetization-strategy.md:282`) prevê cohort retention via SQL — schema normalizado destrava analytics sem migração futura. `mood` fica jsonb (3 campos atômicos nunca filtrados isoladamente).
4. **Migrations via Supabase CLI.** Arquivos versionados em `supabase/migrations/*.sql`. `supabase db push` aplica no projeto remoto.
5. **RLS em tudo.** `user_id = auth.uid()` em todas as tabelas. Sem service_role no front (anon key + RLS é toda a defesa).

---

## Schema-alvo (referência canônica até FEAT-030 entregar)

```sql
-- Envelope por dia
days (
  user_id     uuid references auth.users(id) on delete cascade,
  date        date,
  intention   text,                -- null = sem intenção
  mood        jsonb,               -- { emoji, label, color } | null
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  primary key (user_id, date)
)

-- 1-10 itens
priorities (
  id        text primary key,      -- ULID, gerado client-side
  user_id   uuid,
  date      date,
  text      text not null,
  done      boolean default false,
  position  int not null,
  foreign key (user_id, date) references days(user_id, date) on delete cascade
)

-- exatamente 18 slots por (user, date), hour 6..23
agenda_slots (
  user_id        uuid,
  date           date,
  hour           smallint check (hour between 6 and 23),
  text           text default '',
  energy_emoji   text,             -- null = sem energy
  primary key (user_id, date, hour),
  foreign key (user_id, date) references days(user_id, date) on delete cascade
)

-- N notes
notes (
  id        text primary key,      -- ULID
  user_id   uuid,
  date      date,
  prefix    text check (prefix in ('•', '→', '—', '★')),
  text      text not null,
  position  int not null,
  foreign key (user_id, date) references days(user_id, date) on delete cascade
)

-- 0-3 itens
gratitude_items (
  id        text primary key,      -- ULID
  user_id   uuid,
  date      date,
  text      text not null,
  position  int not null,
  foreign key (user_id, date) references days(user_id, date) on delete cascade
)
```

**Indexes:**

- `days (user_id, date desc)` — listagem de dias do usuário
- Cada filha já tem `(user_id, date)` via PK ou FK composto, suficiente pra fetches por dia

**Constraints não-DDL:**

- Agenda: 18 linhas exatas por dia — enforcement no app (creation seeda 18; UI nunca insere/deleta, só atualiza)
- Priorities: max 10 — enforcement no app (UI bloqueia adição além do 10º)
- Gratitude: max 3 — idem
- `text` HTML sanitizado client-side antes do insert (DOMPurify, 4 tags: `<b><i><u><s>`) — a sanitização que hoje vive em `server/src/lib/sanitize.ts` migra pro web

**RLS policy padrão (idêntica em todas as tabelas):**

```sql
alter table <t> enable row level security;
create policy "user owns row" on <t>
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

---

## Decomposição em 4 FEATs

Sequencial — cada FEAT depende do anterior. Estimativa total: **~1 semana** de trabalho contínuo (alinhado com "4-5 dias úteis" do spec de monetização).

### FEAT-030 — Supabase infra base

**Escopo:**

- Instalar `@supabase/supabase-js` no workspace `web/`
- Setup do Supabase CLI (`npx supabase init`, `supabase link --project-ref $SUPABASE_PROJECT_ID`)
- Estrutura `supabase/migrations/` versionada
- Migration `0001_init.sql` com as 5 tabelas + RLS policies + indexes
- Cliente Supabase singleton em `web/src/lib/supabase.ts` (lê env vars via `import.meta.env`)
- Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (renomeia os atuais; URL é derivada do PROJECT_ID)
- Script npm: `db:push` (aplica migrations no remoto), `db:reset` (recria local dev DB se usar Supabase local)
- Documenta no CLAUDE.md a nova superfície

**Exit criteria:**

- `npm run db:push` aplica schema no projeto remoto sem erro
- `web/src/lib/supabase.ts` exporta cliente tipado e é importável
- Nenhum dado escrito ainda (próximas FEATs)
- Server Fastify continua rodando intocado (cleanup só na FEAT-033)

**Out of scope:** auth UI, persistência de days, remover Fastify.

---

### FEAT-031 — Auth email + senha

**Escopo:**

- Páginas `web/src/features/auth/`: `LoginPage`, `SignupPage`
- Hook `useSession()` que escuta `supabase.auth.onAuthStateChange`
- Gate no `App.tsx`: sem sessão → `<LoginPage>`; com sessão → app normal
- Logout button (header ou menu — definir no spec)
- Estados: loading inicial, erro de credencial, erro de email já cadastrado, validação client-side (email format, senha min 8 chars)
- Persistência de sessão automática via `@supabase/supabase-js` (localStorage)
- E2E real: signup → login → logout flow

**Exit criteria:**

- Usuário consegue criar conta, fazer login, ver app vazio, deslogar
- Reload mantém sessão
- Tentativa de acessar app sem sessão redireciona pra login

**Out of scope:** recuperação de senha, OAuth, verificação de email obrigatória, multi-fator. Tudo entra em FEAT futuro se demanda surgir.

---

### FEAT-032 — Days persistence (substitui fetch/save)

**Escopo:**

- Substitui `web/src/features/daily-page/api/dailyPageApi.ts` (`fetchDay`, `saveDay`) por implementação Supabase
- Cria camada de mapper: DB rows normalizados ↔ `DailyPageData` (tipo existente em `shared/`)
- Substitui `web/src/features/sticky-note/api/*` se houver tabela equivalente (avaliar no spec — sticky-notes podem ficar de fora se forem feature local apenas)
- Mantém assinatura pública dos módulos `api/` igual (props e retornos) — features consumidoras (`useDailyPage`, etc.) não mudam
- Lazy creation: GET de dia inexistente cria envelope `days` + 18 `agenda_slots` em-memória, persiste apenas no primeiro save (preserva comportamento atual)
- Move sanitização HTML (`server/src/lib/sanitize.ts` → `web/src/shared/lib/sanitize.ts`) e aplica antes de cada insert/update
- Atualiza todos os testes unit/integration que mockavam HTTP (substitui MSW por mock do `supabase.from()`) — ou cria helper `mockSupabase` em `test-utils/`
- E2E real: signup → criar dia → editar tudo → reload → confirma persistência

**Exit criteria:**

- App funciona 100% conectado ao Supabase em produção
- Coverage não regride
- Nenhuma feature do front importa `fetch` pra `localhost:3003`

**Out of scope:** otimizações (realtime subscriptions, optimistic updates além do que já existe, offline queue). Entra em FEAT futuro se necessário.

---

### FEAT-033 — Cleanup do Fastify companion

**Escopo:**

- Remove workspace `server/` inteiro
- Remove `@calendarfr/server` do `package.json` (workspaces array)
- Remove `data/days/` (gitignored, mas dir local)
- Remove scripts: `dev:server`, `test:e2e:real` (ou reescreve apontando pro Supabase), `test:e2e:smoke`
- Remove deps órfãs: `fastify`, `@fastify/cors`, `isomorphic-dompurify` server, `pino-pretty`
- Atualiza CLAUDE.md: remove menções ao companion, atualiza "Comandos", atualiza "Arquitetura", atualiza "Taxonomia de testes" (E2E real agora bate em Supabase staging)
- Atualiza `docs/specs/2026-05-08-mvp-overview.md` se houver referências ao Fastify
- Remove `shared/` workspace se não houver mais consumidor além do web (avaliar)

**Exit criteria:**

- `npm run dev` sobe apenas Vite
- `npm test`, `npm run typecheck`, `npm run lint` passam
- `git grep -i fastify` retorna vazio (exceto possivelmente changelog/history)
- `npm run agentops:report` continua funcionando

**Out of scope:** Stripe, Edge Functions, observabilidade Supabase.

---

## O que NÃO entra nessa migração

- **Stripe / pagamentos** — FEAT separado pós-migração (provável FEAT-034 ou depois)
- **Edge Functions** — só quando aparecer caso real (webhook Stripe, integração externa)
- **Recuperação de senha / OAuth / 2FA** — FEAT futuro se cohort pedir
- **Realtime subscriptions** — single-tenant por user, sem multi-device sync no MVP
- **Sticky-notes multi-user** — avaliar dentro de FEAT-032 se vira tabela ou fica local
- **Migração de dados existentes** — assumimos que dados em `data/days/*.json` são apenas dev; sem ETL pro Supabase (se precisar, vira FEAT separado)

---

## Risks & mitigações

| Risk                                           | Mitigação                                                                                             |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Mocks de Supabase em testes unit ficam frágeis | Criar `mockSupabase` helper centralizado em `test-utils/`; E2E real cobre o caminho de produção       |
| Latência percebida vs Fastify local            | Supabase no Brazil/East tem latência aceitável; medir no FEAT-032 e só otimizar se >300ms p95         |
| RLS bug vaza dados entre users                 | E2E real com 2 contas cruzadas no FEAT-031 e FEAT-032; logic-reviewer obrigatório                     |
| Schema mudar muito durante implementação       | Treat migrations como append-only; mudanças = nova migration; nunca editar `0001_init.sql` após merge |
| Custo Supabase free tier (~500 usuários)       | OK pro MVP (lote 1 = 10 pagantes); upgrade quando passar 80% do limite                                |

---

## Histórico de decisões

| Data       | Decisão                                    | Racional                                                                                                         |
| ---------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- |
| 2026-05-19 | Supabase direct from web (sem BFF Fastify) | Reduz superfície; RLS é defesa suficiente; Edge Functions cobrem casos com segredo                               |
| 2026-05-19 | Auth email+senha (sem magic link no MVP)   | Padrão familiar; sem dependência de inbox; recuperação vem depois se cohort pedir                                |
| 2026-05-19 | Schema relacional (não jsonb)              | Analytics de retention via SQL (driver do spec de monetização); custo de DDL upfront paga jsonb-migration depois |
| 2026-05-19 | Decomposição em 4 FEATs sequenciais        | Match com padrão SDD-per-feature; cada FEAT é shippable e revertível isoladamente                                |
