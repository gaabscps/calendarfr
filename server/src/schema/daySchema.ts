/**
 * Zod schema for DailyPageData — the root document stored in data/days/.
 *
 * `daySchema satisfies z.ZodType<DailyPageData>` (TS 4.9+):
 * if any field in shared/src/api/types.ts diverges without updating this
 * schema, `npm run typecheck` fails in the server workspace. (AC-016)
 *
 * Covers: AC-009, AC-011, AC-012, AC-016, AC-027.
 */
import type { DailyPageData } from '@calendarfr/shared';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

/* istanbul ignore next */
export const moodSchema = z
  .object({
    emoji: z.string(),
    label: z.string(),
    color: z.string(),
  })
  .nullable();

/* istanbul ignore next */
export const prioritySchema = z.object({
  id: z.string().min(1),
  text: z.string(),
  done: z.boolean(),
});

/* istanbul ignore next */
export const agendaSlotSchema = z.object({
  hour: z.number().int().min(6).max(23),
  text: z.string(),
});

/* istanbul ignore next */
export const noteSchema = z.object({
  id: z.string().min(1),
  prefix: z.enum(['•', '→', '—', '★']),
  text: z.string(),
});

// ---------------------------------------------------------------------------
// Root schema — satisfies z.ZodType<DailyPageData> guards type alignment
// ---------------------------------------------------------------------------

export const daySchema = z.object({
  schemaVersion: z.literal(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mood: moodSchema,
  // z.tuple enforces exact count + aligns with DailyPageData tuple types.
  priorities: z.tuple([prioritySchema, prioritySchema, prioritySchema]),
  agenda: z.tuple([
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
    agendaSlotSchema,
  ]),
  notes: z.array(noteSchema),
  createdAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime().nullable(),
}) satisfies z.ZodType<DailyPageData>;
