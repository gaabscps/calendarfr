/**
 * Public surface of the notes feature.
 *
 * This is the ONLY import point for external consumers (regra inviolável #1).
 *
 * Covers: AC-021 (barrel exports: Note, NotePrefix, Notes, NoteItem, useNotes).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export type { Note, NotePrefix, NotesValue } from './types.js';

// ── Lib ───────────────────────────────────────────────────────────────────────

export { nextPrefix, PREFIX_ORDER } from './lib/prefixCycle.js';

// ── Hook ──────────────────────────────────────────────────────────────────────

export { useNotes } from './hooks/useNotes.js';
export type { UseNotesReturn } from './hooks/useNotes.js';

// ── Components (BATCH-B) ──────────────────────────────────────────────────────

export { Notes } from './components/Notes.js';
export type { NotesProps } from './components/Notes.js';

export { NoteItem } from './components/NoteItem.js';
export type { NoteItemProps } from './components/NoteItem.js';
