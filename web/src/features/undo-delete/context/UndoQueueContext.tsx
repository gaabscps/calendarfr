/**
 * UndoQueueContext — FEAT-022 T-003.
 *
 * Provider que instancia `useUndoQueue` uma única vez por subtree e expõe
 * o estado via React context. Consumers usam `useUndoQueueContext` para
 * acessar a queue compartilhada — o guard garante que o hook só seja
 * chamado dentro do Provider.
 *
 * Cobre AC-001 (Provider expõe queue) e AC-002 (consumer hook + guard).
 */

import { createContext, useContext, type JSX, type ReactNode } from 'react';

import { useUndoQueue, type UseUndoQueueReturn } from '../hooks/useUndoQueue.js';

const UndoQueueContext = createContext<UseUndoQueueReturn | null>(null);

export interface UndoQueueProviderProps {
  children: ReactNode;
}

/** Envolve a árvore que compartilha uma única instância da undo queue. */
export function UndoQueueProvider({ children }: UndoQueueProviderProps): JSX.Element {
  const value = useUndoQueue();
  return <UndoQueueContext.Provider value={value}>{children}</UndoQueueContext.Provider>;
}

/**
 * Consumer hook da undo queue. Lança Error se chamado fora do `UndoQueueProvider`
 * — falha rápido em vez de retornar `null` e quebrar em runtime depois.
 */
export function useUndoQueueContext(): UseUndoQueueReturn {
  const ctx = useContext(UndoQueueContext);
  if (ctx === null) {
    throw new Error('useUndoQueueContext must be used inside an UndoQueueProvider');
  }
  return ctx;
}
