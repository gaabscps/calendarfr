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
 * Energy de uma hora — emoji curto sinalizando produtividade/disposição.
 * null = sem energy registrada (estado padrão, não é "ruim").
 */
export interface Energy {
  emoji: string;
}

/**
 * A single agenda slot.
 * hour: integer in range [6, 23] — 18 slots per day.
 * text: HTML restricted to <b><i><u><s>.
 */
export interface AgendaSlot {
  hour: number;
  text: string;
  /** Emoji opcional indicando como a hora "foi". null = não definido. */
  energy: Energy | null;
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
 * priorities: 1–10 items (enforced by zod schema server-side; min 1 max 10).
 * agenda: exactly 18 items — hours [6..23] (enforced by zod schema server-side + tuple type here).
 */
export interface DailyPageData {
  schemaVersion: 1;
  date: string;
  mood: Mood | null;
  /** 1–10 priority items — dynamic array (matches zod .array().min(1).max(10)). */
  priorities: Priority[];
  /** Exactly 18 agenda slots (hours 6–23) — tuple enforced at the type level. */
  agenda: readonly [
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
    AgendaSlot,
  ];
  notes: Note[];
  createdAt: string | null;
  updatedAt: string | null;
}
