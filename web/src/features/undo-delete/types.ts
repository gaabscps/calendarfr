/**
 * FEAT-022 — undo-delete types.
 * Tipos que definem a queue de desfazer e operações associadas.
 */

/** Tipo de entrada de undo: prioridade ou nota. */
export type UndoEntryKind = 'priority' | 'note';

/** Entrada individual na queue de undo com callback de restauração e controle de TTL. */
export interface UndoEntry {
  /** Identificador único da entrada (uuid). */
  id: string;
  /** Tipo de item removido (prioridade ou nota). */
  kind: UndoEntryKind;
  /** Texto exibido no toast de notificação. */
  label: string;
  /** Callback que restaura o item ao estado anterior à remoção. */
  undoFn: () => void;
  /** Timestamp de criação da entrada (Date.now()). */
  createdAt: number;
  /** Duração de vida da entrada em milissegundos (padrão 10000ms). */
  ttlMs: number;
  /** Handle do timer de expiração para limpeza. */
  timerId: ReturnType<typeof setTimeout>;
}

/** Payload de opções para enqueueUndo(). */
export interface EnqueueUndoOptions {
  /** Tipo de item removido. */
  kind: UndoEntryKind;
  /** Texto exibido no toast de notificação. */
  label: string;
  /** Callback que restaura o item. */
  undoFn: () => void;
  /** Duração de vida opcional em milissegundos (padrão 10000ms). */
  ttlMs?: number;
}
