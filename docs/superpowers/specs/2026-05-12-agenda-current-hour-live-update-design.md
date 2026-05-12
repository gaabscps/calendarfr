# Design: Agenda current-hour live update

**Data:** 2026-05-12
**Feature:** Auto-atualização do highlight de hora atual na Agenda

---

## Problema

O componente `Agenda` computa `currentHour` uma única vez no render via `useMemo`. Se o usuário mantém a página aberta, o highlight não avança com o tempo — fica preso na hora do último F5.

## Solução

Novo hook `useCurrentHour` com smart scheduling: sincroniza com a virada de minuto para detectar mudança de hora em ≤1 segundo, com custo de CPU desprezível.

---

## Arquitetura

### `useCurrentHour(now?: Date): AgendaHour | null`

Arquivo: `web/src/features/agenda/hooks/useCurrentHour.ts`

**Responsabilidades:**

- Estado inicial: `getCurrentAgendaHour(now ?? new Date())` — valor imediato no mount, sem flash
- `useEffect` registra um `setTimeout` para a próxima virada de minuto, depois um `setInterval` de 60s
- Em cada tick: `setState(getCurrentAgendaHour())` — React só re-renderiza se o valor mudou
- Cleanup: `clearTimeout` + `clearInterval` no unmount (sem leaks)
- `now?: Date` aceito apenas para testabilidade; em produção usa `new Date()` internamente a cada tick

**Cálculo do delay inicial:**

```
const now = new Date()
const msToNextMinute = 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds())
```

O primeiro tick dispara em `msToNextMinute` ms (≤60s), alinhado com o relógio do sistema. A partir daí, intervalo fixo de 60s.

### Mudança em `Agenda.tsx`

Remove:

```ts
const currentHour = useMemo(() => getCurrentAgendaHour(now), [now]);
```

Adiciona:

```ts
const currentHour = useCurrentHour(now);
```

O `now` prop continua funcionando para Storybook/testes (passa direto para o hook, que usa em vez de `new Date()`). Quando `now` é fornecido, o timer ainda roda mas sempre lê `now` em vez do relógio real — comportamento consistente para testes.

---

## Testes

Arquivo: `web/src/features/agenda/hooks/__tests__/useCurrentHour.test.ts`

Usa `jest.useFakeTimers()` + `jest.setSystemTime()`.

| Cenário                                    | Verificação                                  |
| ------------------------------------------ | -------------------------------------------- |
| Mount com hora dentro do range             | Retorna hora correta imediatamente           |
| Mount com hora fora do range               | Retorna `null` imediatamente                 |
| Smart schedule dispara na virada de minuto | `setState` chamado; hora atualizada          |
| Virada de hora detectada                   | Highlight muda para nova hora                |
| Virada para fora do range (23→0)           | Retorna `null`                               |
| Cleanup no unmount                         | Sem `clearTimeout`/`clearInterval` pendentes |

---

## Impacto em código existente

- `Agenda.tsx`: substituição de 1 linha (`useMemo` → `useCurrentHour`)
- `currentHour.ts`: sem alteração (função pura, continua sendo chamada pelo hook)
- AC-012 comentário atualizado: "no polling — single call at mount" → "smart-scheduled tick on minute boundary"
- Testes existentes de `Agenda.integration.test.tsx`: passam sem alteração (usam `now` prop)

---

## O que não muda

- `getCurrentAgendaHour` permanece função pura, sem side effects
- `now` prop em `Agenda` continua disponível para Storybook e testes
- Comportamento ao sair do range: `null` (highlight some), sem estado especial
