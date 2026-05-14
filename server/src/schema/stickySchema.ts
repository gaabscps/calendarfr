/**
 * Zod schema for the sticky note PUT body.
 *
 * Reuses noteSchema from daySchema to keep Note validation consistent.
 * Covers: AC-020 (format validation), AC-018 (items array).
 */
import { z } from 'zod';

import { noteSchema } from './daySchema.js';

export const stickyBodySchema = z.object({
  items: z.array(noteSchema).max(100),
});

export type StickyBody = z.infer<typeof stickyBodySchema>;

/**
 * Schema for the full sticky.json file format.
 * Used in readSticky() to validate the file contents at runtime (AC-017).
 */
export const stickyFileSchema = z.object({
  schemaVersion: z.number(),
  items: z.array(noteSchema),
  updatedAt: z.string(),
});

export type StickyFileSchemaData = z.infer<typeof stickyFileSchema>;

// ---------------------------------------------------------------------------
// V2 — Multi-color schema (FEAT-021)
// ---------------------------------------------------------------------------

/**
 * Enum of valid sticky note colors.
 * AC-030: PUT /api/sticky/:color rejects colors outside this enum with 400.
 */
export const stickyColorSchema = z.enum(['y', 'r', 'g', 'b']);

export type StickyColor = z.infer<typeof stickyColorSchema>;

/**
 * Per-color entry stored under colors[color] in sticky.json V2.
 * AC-029: each color has its own items array and updatedAt.
 */
export const stickyColorEntrySchema = z.object({
  items: z.array(noteSchema),
  updatedAt: z.string(),
});

export type StickyColorEntry = z.infer<typeof stickyColorEntrySchema>;

/**
 * Root V2 file format for data/sticky.json.
 * AC-029: persists as { schemaVersion: 2, colors: { [color]: { items, updatedAt } } }.
 */
export const stickyFileV2Schema = z.object({
  schemaVersion: z.literal(2),
  colors: z.record(stickyColorSchema, stickyColorEntrySchema).optional().default({}),
});

export type StickyFileV2 = z.infer<typeof stickyFileV2Schema>;

/**
 * Alias for the V1 schema — used in stickyStore.ts for migration detection (AC-031).
 */
export { stickyFileSchema as stickyFileV1Schema };
