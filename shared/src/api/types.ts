/**
 * Shared TypeScript types for CalendárioFR.
 * No runtime dependencies — pure types only (keeps the front bundle lean).
 * Source of truth for both web/ and server/ workspaces.
 */

/** The 4 allowed rich-text prefixes for notes. */
export type NotePrefix = '•' | '→' | '—' | '★';

/** User's mood for the day. Nullable (no mood set = null). */
export interface Mood {
  emoji: string;
  label: string;
  color: string;
}

/**
 * A single priority item.
 * id: ULID (lexicographically orderable).
 * text: HTML restricted to <b><i><u><s> — sanitized server-side before persist.
 */
export interface Priority {
  id: string;
  text: string;
  done: boolean;
}

/**
 * A single agenda slot.
 * hour: integer in range [6, 23] — 18 slots per day.
 * text: HTML restricted to <b><i><u><s>.
 */
export interface AgendaSlot {
  hour: number;
  text: string;
}

/**
 * A note item.
 * id: ULID.
 * prefix: one of the 4 allowed NotePrefix values.
 * text: HTML restricted to <b><i><u><s>.
 */
export interface Note {
  id: string;
  prefix: NotePrefix;
  text: string;
}

/**
 * Root document stored in data/days/YYYY-MM-DD.json.
 * schemaVersion: 1 — reserved for future migrations.
 * priorities: exactly 3 items (enforced by zod schema server-side).
 * agenda: exactly 18 items — hours [6..23] (enforced by zod schema server-side).
 */
export interface DailyPageData {
  schemaVersion: 1;
  date: string;
  mood: Mood | null;
  priorities: Priority[];
  agenda: AgendaSlot[];
  notes: Note[];
  createdAt: string | null;
  updatedAt: string | null;
}
