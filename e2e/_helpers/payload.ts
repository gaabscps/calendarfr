/**
 * payload.ts — DailyPageData factory for real E2E specs.
 *
 * Mirrors the shape in e2e/smoke/days-roundtrip.spec.ts but is extracted
 * here for reuse across real specs (DRY). Both PUT /api/days/:date and
 * direct FS assertions can use this factory to produce a known-good payload.
 */

// Matches @calendarfr/shared DailyPageData schema (schemaVersion 1).
// Using inline types to avoid cross-workspace imports in Playwright context.

export interface PriorityPayload {
  id: string;
  text: string;
  done: boolean;
}

export interface AgendaSlotPayload {
  hour: number;
  text: string;
}

export interface NotePayload {
  id: string;
  text: string;
}

export interface DayPayload {
  schemaVersion: 1;
  date: string;
  mood: null;
  priorities: [PriorityPayload, PriorityPayload, PriorityPayload];
  agenda: AgendaSlotPayload[];
  notes: NotePayload[];
  createdAt: null;
  updatedAt: null;
}

/**
 * Returns a valid, empty DailyPageData payload for the given date.
 *
 * IDs use the date suffix to stay deterministic and readable in assertion
 * output (e.g., "id-2099-12-31-A"). They are valid ULID-length strings.
 * The companion server accepts any non-empty string ID.
 */
export function validPayload(date: string): DayPayload {
  const suffix = date.replace(/-/g, '');
  return {
    schemaVersion: 1,
    date,
    mood: null,
    priorities: [
      { id: `01HZZZZZZZZZZZZZZZZZZ${suffix}A`.slice(0, 26), text: '', done: false },
      { id: `01HZZZZZZZZZZZZZZZZZZ${suffix}B`.slice(0, 26), text: '', done: false },
      { id: `01HZZZZZZZZZZZZZZZZZZ${suffix}C`.slice(0, 26), text: '', done: false },
    ],
    agenda: Array.from({ length: 18 }, (_, i) => ({ hour: i + 6, text: '' })),
    notes: [],
    createdAt: null,
    updatedAt: null,
  };
}
