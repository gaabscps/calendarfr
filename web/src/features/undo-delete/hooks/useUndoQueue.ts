/**
 * useUndoQueue — FEAT-022 T-002.
 *
 * Owns a queue of UndoEntry with independent TTL timers.
 *
 * - enqueueUndo(opts): creates entry with crypto.randomUUID, arms setTimeout(ttlMs).
 *   On expire: removes entry from queue (commit implícito — undoFn NOT called).
 * - cancelUndo(id): looks up entry, calls undoFn(), clearTimeout, removes.
 *   No-op if id unknown.
 * - flushAll(): clearTimeout all entries + removes all (commit — undoFn NOT called).
 * - Cleanup on unmount: clearTimeout para todos os timers pendentes.
 *
 * Stack independente: cada entrada tem seu próprio ttlMs e timer; expiração
 * de um item não afeta os outros (AC-005).
 *
 * Covers AC-001 (enqueue + TTL default 10s), AC-002 (cancelUndo restaura via undoFn),
 * AC-004 (TTL expira → commit), AC-005 (stack independente).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { EnqueueUndoOptions, UndoEntry } from '../types.js';

const DEFAULT_TTL_MS = 10_000;

export interface UseUndoQueueReturn {
  /** Snapshot atual da queue (somente leitura — não mutar). */
  queue: UndoEntry[];
  /** Adiciona nova entrada com TTL próprio. Retorna o id gerado. */
  enqueueUndo: (opts: EnqueueUndoOptions) => string;
  /** Restaura via undoFn, limpa timer e remove da queue. No-op se id desconhecido. */
  cancelUndo: (id: string) => void;
  /** Limpa todos os timers e remove todas as entradas (commit — não chama undoFn). */
  flushAll: () => void;
}

/** Hook que mantém uma queue de undo-entries com TTL independente por entry. */
export function useUndoQueue(): UseUndoQueueReturn {
  const [queue, setQueue] = useState<UndoEntry[]>([]);

  // Ref espelho da queue para que callbacks estáveis (useCallback com deps vazias)
  // sempre vejam a versão mais recente — padrão usado em useNotes/useAgenda.
  const queueRef = useRef<UndoEntry[]>([]);
  queueRef.current = queue;

  const enqueueUndo = useCallback((opts: EnqueueUndoOptions): string => {
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `undo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;

    const timerId = setTimeout(() => {
      // Expira: commit implícito — remove sem chamar undoFn.
      setQueue((prev) => prev.filter((entry) => entry.id !== id));
    }, ttlMs);

    const entry: UndoEntry = {
      id,
      kind: opts.kind,
      label: opts.label,
      undoFn: opts.undoFn,
      createdAt: Date.now(),
      ttlMs,
      timerId,
    };

    setQueue((prev) => [...prev, entry]);
    return id;
  }, []);

  const cancelUndo = useCallback((id: string): void => {
    const entry = queueRef.current.find((e) => e.id === id);
    if (!entry) {
      return;
    }
    clearTimeout(entry.timerId);
    entry.undoFn();
    setQueue((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const flushAll = useCallback((): void => {
    for (const entry of queueRef.current) {
      clearTimeout(entry.timerId);
    }
    setQueue([]);
  }, []);

  // Cleanup no unmount: cancela todos os timers pendentes para evitar
  // setState após unmount (que viraria warning / leak).
  useEffect(() => {
    return () => {
      for (const entry of queueRef.current) {
        clearTimeout(entry.timerId);
      }
    };
  }, []);

  return { queue, enqueueUndo, cancelUndo, flushAll };
}
