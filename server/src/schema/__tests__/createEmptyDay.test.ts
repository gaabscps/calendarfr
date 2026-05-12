/**
 * @jest-environment node
 *
 * Unit tests for createEmptyDay (T-009, AC-001, AC-017, AC-027).
 * 5 scenarios per tasks.md T-009.
 */

import { createEmptyDay } from '../createEmptyDay';
import { daySchema } from '../daySchema';

// ---------------------------------------------------------------------------
// Scenario 1: output passes daySchema.parse (sanity check)
// ---------------------------------------------------------------------------
it('createEmptyDay output passes daySchema validation', () => {
  const day = createEmptyDay('2026-05-09');
  expect(() => daySchema.parse(day)).not.toThrow();
});

// ---------------------------------------------------------------------------
// Scenario 2: 1 priority with ULID id and empty text/done=false shape
// ---------------------------------------------------------------------------
it('createEmptyDay produces 1 priority with a valid ULID id', () => {
  const ULID_RE = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const day = createEmptyDay('2026-05-09');
  expect(day.priorities).toHaveLength(1);
  expect(day.priorities.length).toBe(1);
  const first = day.priorities[0]!;
  expect(first.id).toMatch(ULID_RE);
  expect(first.text).toBe('');
  expect(first.done).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 3: 18 agenda slots with hours 6..23
// ---------------------------------------------------------------------------
it('createEmptyDay produces 18 agenda slots with hours [6..23]', () => {
  const day = createEmptyDay('2026-05-09');
  expect(day.agenda).toHaveLength(18);
  const hours = day.agenda.map((s) => s.hour);
  expect(hours).toEqual(Array.from({ length: 18 }, (_, i) => i + 6));
});

// ---------------------------------------------------------------------------
// Scenario 4: mood null, notes empty, timestamps null
// ---------------------------------------------------------------------------
it('createEmptyDay sets mood to null, notes empty, timestamps null', () => {
  const day = createEmptyDay('2026-05-09');
  expect(day.mood).toBeNull();
  expect(day.notes).toEqual([]);
  expect(day.createdAt).toBeNull();
  expect(day.updatedAt).toBeNull();
});

// ---------------------------------------------------------------------------
// Scenario 5: date field matches the input parameter
// ---------------------------------------------------------------------------
it('createEmptyDay sets date field to the given date string', () => {
  const day = createEmptyDay('2030-12-31');
  expect(day.date).toBe('2030-12-31');
  expect(day.schemaVersion).toBe(1);
});
