// FEAT-022 — undo-delete public barrel.
// Components/hooks serão re-exportados em tasks subsequentes.
export type { UndoEntry, UndoEntryKind, EnqueueUndoOptions } from './types';
export { useUndoQueue } from './hooks/useUndoQueue';
export type { UseUndoQueueReturn } from './hooks/useUndoQueue';
