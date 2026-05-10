/**
 * Public types for the notes feature.
 *
 * Note and NotePrefix re-exported from @calendarfr/shared — single source of
 * truth shared with server zod schema. No local redeclaration.
 *
 * Covers: AC-021 (barrel exports Note, NotePrefix), AC-022 (no cross-feature
 * imports), AC-020 (no api imports).
 *
 * AC tag coverage:
 * - AC-001: Note is the shape emitted by onAdd.
 * - AC-002: id field on Note carries the ULID.
 * - AC-005: NotesValue = Note[] is the controlled value type.
 * - AC-007: Note.id and Note.prefix are preserved across text edits.
 * - AC-008: Note.prefix cycles through NotePrefix values.
 */

import type { Note } from '@calendarfr/shared';

export type { Note, NotePrefix } from '@calendarfr/shared';

/**
 * Alias for the controlled value of the Notes component.
 * A dynamic array — no length constraint (server does not cap notes[]).
 */
export type NotesValue = Note[];
