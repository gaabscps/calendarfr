# Specs

Documentos de especificação do projeto CalendárioFR. Cada spec descreve **o que** está sendo construído, em que escopo, com quais critérios de aceitação. Implementação (**como**) vai em `plan.md` e `tasks.md` por feature, gerados pelo SDD pipeline.

## Convenções

- **Macro spec**: `YYYY-MM-DD-<topic>.md` na raiz desta pasta. Visão geral, decisões arquiteturais transversais.
- **Feature specs**: `<feature>/spec.md`, `<feature>/plan.md`, `<feature>/tasks.md`. Criados pelos skills `spec-writer`, `designer`, `task-builder` durante cada SDD flow.
- Specs aprovados não são reescritos — são complementados por novos specs (com data nova) que referenciam o anterior.

## Índice

### Macro

- [2026-05-08 — MVP Overview (Página do Dia)](./2026-05-08-mvp-overview.md) — escopo, decomposição feature-based, modelo de dados, contratos, estética, estratégia de testes, sequência de SDD flows

### Por feature

_(criados conforme cada SDD flow inicia)_

- `foundation/` — scaffolding, design system tokens, infra de testes (Flow 1)
- `server/` — companion Fastify + JSON store (Flow 2)
- `rich-text-line/` — editor Tiptap embutido (Flow 3)
- `priorities/` — Top 3 com checkbox (Flow 4a)
- `mood/` — picker de humor/clima (Flow 4b)
- `agenda/` — timeline 06–23h (Flow 4c)
- `notes/` — bullets livres (Flow 4d)
- `daily-page/` — orquestrador + navegação (Flow 5)
- `e2e/` — cobertura Playwright (Flow 6)
