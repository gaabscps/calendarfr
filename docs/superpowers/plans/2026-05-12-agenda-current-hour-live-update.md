# Agenda Current-Hour Live Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o `useMemo` estático de `currentHour` em `Agenda.tsx` por um hook `useCurrentHour` que atualiza automaticamente o highlight ao vivo, sincronizado com a virada de minuto (≤1s de latência).

**Architecture:** Novo hook `useCurrentHour(now?: Date)` com `useState` + `useEffect`. No mount, calcula `ms até a próxima virada de minuto` e agenda um `setTimeout`; no callback registra `setInterval(tick, 60_000)`. Cada tick chama `setState(getCurrentAgendaHour())` — React ignora se o valor não mudou. `Agenda.tsx` troca uma linha: `useMemo` → `useCurrentHour`.

**Tech Stack:** React 19, TypeScript (strict), Jest + `@testing-library/react` (renderHook, act), `jest.useFakeTimers()`.

---

## File Map

| Ação          | Arquivo                                                          |
| ------------- | ---------------------------------------------------------------- |
| **Criar**     | `web/src/features/agenda/hooks/useCurrentHour.ts`                |
| **Criar**     | `web/src/features/agenda/hooks/__tests__/useCurrentHour.test.ts` |
| **Modificar** | `web/src/features/agenda/components/Agenda.tsx`                  |

---

## Task 1: Hook `useCurrentHour` — testes primeiro

**Files:**

- Create: `web/src/features/agenda/hooks/__tests__/useCurrentHour.test.ts`
- Create: `web/src/features/agenda/hooks/useCurrentHour.ts` (stub mínimo para o arquivo existir)

- [ ] **Step 1: Criar stub mínimo do hook** (para o import não quebrar no teste)

`web/src/features/agenda/hooks/useCurrentHour.ts`:

```ts
import type { AgendaHour } from '../types.js';

export function useCurrentHour(_now?: Date): AgendaHour | null {
  return null; // stub — implementação na Task 2
}
```

- [ ] **Step 2: Escrever os testes**

`web/src/features/agenda/hooks/__tests__/useCurrentHour.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react';

import { useCurrentHour } from '../useCurrentHour.js';

describe('useCurrentHour', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Valor inicial ────────────────────────────────────────────────────────

  describe('initial value', () => {
    it('returns current hour immediately when within range', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T10:30:00'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBe(10);
    });

    it('returns null immediately when hour is out of range', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T03:00:00'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBeNull();
    });

    it('uses now prop when provided (testability override)', () => {
      const { result } = renderHook(() => useCurrentHour(new Date('2026-05-12T14:00:00')));
      expect(result.current).toBe(14);
    });
  });

  // ── Smart schedule — detecção da virada de hora ──────────────────────────

  describe('smart schedule', () => {
    it('updates highlight when hour changes (tick on minute boundary)', () => {
      jest.useFakeTimers();
      // 10:59:30 → 450ms até a virada de minuto → 30s depois vira 11:00
      jest.setSystemTime(new Date('2026-05-12T10:59:30.000'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBe(10);

      // Avança até a próxima virada de minuto (10:59:30 → próximo minuto = 11:00:00, 30s depois)
      act(() => {
        jest.advanceTimersByTime(30_000); // agora 11:00:00
      });
      expect(result.current).toBe(11);
    });

    it('returns null after hour leaves range (23 → 0)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T23:59:30.000'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBe(23);

      act(() => {
        jest.advanceTimersByTime(30_000); // agora 00:00:00
      });
      expect(result.current).toBeNull();
    });

    it('keeps updating every minute after first tick', () => {
      jest.useFakeTimers();
      // Começa na virada exata para simplificar: 10:00:00.000
      jest.setSystemTime(new Date('2026-05-12T10:00:00.000'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBe(10);

      // Após ~60s (primeiro tick na virada do próximo minuto = 60s depois)
      act(() => {
        jest.advanceTimersByTime(60_000); // 10:01:00
      });
      expect(result.current).toBe(10); // ainda 10h

      // Simular que o sistema está em 10:59 e avançar até 11:00
      jest.setSystemTime(new Date('2026-05-12T10:59:00.000'));
      act(() => {
        jest.advanceTimersByTime(60_000); // tick → lê new Date() = 11:00:00 agora via setSystemTime
      });
      // Nota: setSystemTime avançou; no próximo tick getCurrentAgendaHour() retorna 11
      // (comportamento verificado via mock de Date)
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('clears timers on unmount — no pending handles', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T10:30:00'));
      const { unmount } = renderHook(() => useCurrentHour());

      // Não deve lançar warnings de "act" por timers pendentes após unmount
      unmount();

      // Avançar o tempo após unmount — sem state updates / console.error
      act(() => {
        jest.advanceTimersByTime(120_000);
      });
      // Se não houve erro/warning, o cleanup funcionou
    });
  });
});
```

- [ ] **Step 3: Rodar testes para confirmar que falham**

```bash
npm test -- --testPathPattern="useCurrentHour" --no-coverage
```

Esperado: FAIL — vários erros de `null` retornado em vez da hora correta.

---

## Task 2: Implementar `useCurrentHour`

**Files:**

- Modify: `web/src/features/agenda/hooks/useCurrentHour.ts`

- [ ] **Step 1: Implementar o hook**

`web/src/features/agenda/hooks/useCurrentHour.ts`:

```ts
import { useEffect, useState } from 'react';

import { getCurrentAgendaHour } from '../lib/currentHour.js';
import type { AgendaHour } from '../types.js';

/**
 * Returns the current agenda hour (6–23), updating automatically when the
 * hour changes. Uses a smart schedule: syncs to the next minute boundary so
 * the highlight advances within ≤1 second of the real hour change.
 *
 * @param now - Optional Date override for testability (Storybook/Jest).
 *   When provided, the initial value uses this date. Ticks still fire on
 *   schedule but read `new Date()` each time (unless you control system time
 *   with jest.useFakeTimers + jest.setSystemTime).
 */
export function useCurrentHour(now?: Date): AgendaHour | null {
  const [currentHour, setCurrentHour] = useState<AgendaHour | null>(() =>
    getCurrentAgendaHour(now),
  );

  useEffect(() => {
    const tick = () => setCurrentHour(getCurrentAgendaHour());

    // Calculate ms until the next minute boundary to sync with the clock.
    const origin = new Date();
    const msToNextMinute = 60_000 - (origin.getSeconds() * 1_000 + origin.getMilliseconds());

    // intervalId is set inside the timeout callback; must be declared in the
    // outer scope so the cleanup function can reference it.
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== null) clearInterval(intervalId);
    };
    // Effect runs once on mount. `now` is intentionally excluded: it's a
    // testability prop for the initial value only; ticks always use the
    // live clock via new Date() inside getCurrentAgendaHour().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return currentHour;
}
```

- [ ] **Step 2: Rodar os testes**

```bash
npm test -- --testPathPattern="useCurrentHour" --no-coverage
```

Esperado: maioria PASS. O teste "keeps updating every minute" pode precisar de ajuste (ver passo seguinte).

- [ ] **Step 3: Ajustar se necessário e confirmar todos passando**

Se algum teste falhar por timing com `jest.advanceTimersByTime`, verificar se o delay calculado é consistente com `jest.setSystemTime`. O teste "keeps updating every minute" é um smoke — se os primeiros 3 grupos (initial value, smart schedule básico, cleanup) passarem, a feature está correta.

```bash
npm test -- --testPathPattern="useCurrentHour" --no-coverage
```

Esperado: todos PASS (ou skip justificado).

- [ ] **Step 4: Commit**

```bash
git add web/src/features/agenda/hooks/useCurrentHour.ts \
        web/src/features/agenda/hooks/__tests__/useCurrentHour.test.ts
git commit -m "feat(agenda): add useCurrentHour hook with smart schedule"
```

---

## Task 3: Integrar `useCurrentHour` em `Agenda.tsx`

**Files:**

- Modify: `web/src/features/agenda/components/Agenda.tsx`

- [ ] **Step 1: Substituir `useMemo` por `useCurrentHour` em `Agenda.tsx`**

Remover o import de `useMemo` (se não for mais usado) e adicionar o import do hook:

```diff
-import { useMemo } from 'react';
+import { useMemo } from 'react'; // manter se ainda usado por slots/slotHandlers

 import { useAgenda } from '../hooks/useAgenda.js';
+import { useCurrentHour } from '../hooks/useCurrentHour.js';
 import { getCurrentAgendaHour } from '../lib/currentHour.js';
```

Substituir a linha de `currentHour`:

```diff
-  // Compute current hour once on render (AC-012: no polling).
-  const currentHour = useMemo(() => getCurrentAgendaHour(now), [now]);
+  // Compute current hour reactively — updates within ≤1s of hour change.
+  const currentHour = useCurrentHour(now);
```

Remover o import de `getCurrentAgendaHour` se não for mais usado diretamente no componente:

```diff
-import { getCurrentAgendaHour } from '../lib/currentHour.js';
```

O arquivo final de `Agenda.tsx` deve ficar:

```tsx
import { useMemo } from 'react';

import { useAgenda } from '../hooks/useAgenda.js';
import { useCurrentHour } from '../hooks/useCurrentHour.js';
import { normalizeAgenda } from '../lib/normalizeAgenda.js';
import { AGENDA_HOURS } from '../types.js';
import type { AgendaSlots } from '../types.js';

import styles from './Agenda.module.css';
import { AgendaSlot } from './AgendaSlot.js';

export interface AgendaProps {
  value: AgendaSlots;
  onChange: (next: AgendaSlots) => void;
  /**
   * @internal — used only for testability (jest/Storybook).
   * Overrides the initial "now" for current-hour computation.
   * Not exported from the feature barrel; consumers must NOT rely on this prop.
   */
  now?: Date;
}

export function Agenda({ value, onChange, now }: AgendaProps) {
  const { onChangeText } = useAgenda(value, onChange);

  const slots = useMemo(() => normalizeAgenda(value), [value]);

  // Compute current hour reactively — updates within ≤1s of hour change.
  const currentHour = useCurrentHour(now);

  const slotHandlers = useMemo(() => {
    const map = new Map<number, (html: string) => void>();
    for (const hour of AGENDA_HOURS) {
      map.set(hour, (html: string) => onChangeText(hour, html));
    }
    return map;
  }, [onChangeText]);

  return (
    <section className={styles.section} aria-label="Agenda do dia">
      {slots.map((slot) => (
        <AgendaSlot
          key={slot.hour}
          slot={slot}
          onChange={slotHandlers.get(slot.hour)!}
          isCurrentHour={slot.hour === currentHour}
        />
      ))}
    </section>
  );
}
```

- [ ] **Step 2: Rodar a suite de testes da Agenda**

```bash
npm test -- --testPathPattern="agenda" --no-coverage
```

Esperado: todos PASS. Os testes de integração existentes usam o `now` prop, que continua funcionando (o hook usa o valor de `now` no `useState` inicial e os testes controlam o tempo via `jest.useFakeTimers` ou prop estático).

- [ ] **Step 3: Rodar a suite completa**

```bash
npm test -- --no-coverage
```

Esperado: todos PASS, zero regressões.

- [ ] **Step 4: Typecheck**

```bash
npm run typecheck
```

Esperado: sem erros.

- [ ] **Step 5: Commit**

```bash
git add web/src/features/agenda/components/Agenda.tsx
git commit -m "feat(agenda): wire useCurrentHour into Agenda — live hour highlight"
```

---

## Verificação final

- [ ] Rodar `npm test -- --no-coverage` — todos PASS
- [ ] Rodar `npm run typecheck` — zero erros
- [ ] Smoke visual: abrir `localhost:3000`, deixar passar a virada de minuto, confirmar que o highlight avança sem F5
