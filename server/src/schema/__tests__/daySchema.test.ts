/**
 * @jest-environment node
 *
 * Unit tests for daySchema (T-008, AC-009, AC-011, AC-012, AC-027).
 * 9+ scenarios per tasks.md T-008.
 */

import { agendaSlotSchema, daySchema, moodSchema, noteSchema, prioritySchema } from '../daySchema';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidPayload() {
  return {
    schemaVersion: 1 as const,
    date: '2026-05-09',
    mood: null,
    priorities: [
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZA', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZB', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZC', text: '', done: false },
    ],
    agenda: Array.from({ length: 18 }, (_, i) => ({ hour: i + 6, text: '' })),
    notes: [],
    createdAt: null,
    updatedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Scenario 1: valid complete payload accepted
// ---------------------------------------------------------------------------
it('daySchema accepts a valid complete payload', () => {
  const result = daySchema.safeParse(makeValidPayload());
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// Scenario 2: valid payload with mood and notes accepted
// ---------------------------------------------------------------------------
it('daySchema accepts payload with mood and notes', () => {
  const payload = {
    ...makeValidPayload(),
    mood: { emoji: '😊', label: 'happy', color: '#fff' },
    notes: [
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZD', prefix: '•', text: 'note 1' },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZE', prefix: '→', text: 'note 2' },
    ],
    createdAt: '2026-05-09T10:00:00.000Z',
    updatedAt: '2026-05-09T10:01:00.000Z',
  };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(true);
});

// ---------------------------------------------------------------------------
// Scenario 3: priorities with 2 items (not 3) rejected
// ---------------------------------------------------------------------------
it('daySchema rejects priorities array with 2 items', () => {
  const payload = {
    ...makeValidPayload(),
    priorities: [
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZA', text: '', done: false },
      { id: '01HZZZZZZZZZZZZZZZZZZZZZZB', text: '', done: false },
    ],
  };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p.startsWith('priorities'))).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Scenario 4: agenda with 17 items rejected
// ---------------------------------------------------------------------------
it('daySchema rejects agenda array with 17 items', () => {
  const payload = {
    ...makeValidPayload(),
    agenda: Array.from({ length: 17 }, (_, i) => ({ hour: i + 6, text: '' })),
  };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p.startsWith('agenda'))).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Scenario 5: agenda[0].hour = 5 rejected (min 6)
// ---------------------------------------------------------------------------
it('daySchema rejects agenda hour = 5 (below minimum 6)', () => {
  const agenda = Array.from({ length: 18 }, (_, i) => ({
    hour: i + 6,
    text: '',
  }));
  agenda[0] = { hour: 5, text: '' };
  const payload = { ...makeValidPayload(), agenda };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p.includes('agenda'))).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Scenario 6: agenda[0].hour = 24 rejected (max 23)
// ---------------------------------------------------------------------------
it('daySchema rejects agenda hour = 24 (above maximum 23)', () => {
  const agenda = Array.from({ length: 18 }, (_, i) => ({
    hour: i + 6,
    text: '',
  }));
  agenda[0] = { hour: 24, text: '' };
  const payload = { ...makeValidPayload(), agenda };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
});

// ---------------------------------------------------------------------------
// Scenario 7: notes[0].prefix invalid value rejected
// ---------------------------------------------------------------------------
it('daySchema rejects note with invalid prefix', () => {
  const payload = {
    ...makeValidPayload(),
    notes: [{ id: '01HZZZZZZZZZZZZZZZZZZZZZZA', prefix: 'x', text: 'hi' }],
  };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p.includes('prefix'))).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Scenario 8: date not matching YYYY-MM-DD regex rejected
// ---------------------------------------------------------------------------
it('daySchema rejects date not matching YYYY-MM-DD format', () => {
  const payload = { ...makeValidPayload(), date: '2026-5-9' };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p === 'date')).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Scenario 9: schemaVersion = 2 rejected (must be literal 1)
// ---------------------------------------------------------------------------
it('daySchema rejects schemaVersion = 2', () => {
  const payload = { ...makeValidPayload(), schemaVersion: 2 };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p === 'schemaVersion')).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Scenario 10: priorities field missing entirely rejected
// ---------------------------------------------------------------------------
it('daySchema rejects payload with priorities field missing', () => {
  const full = makeValidPayload();
  const payload = Object.fromEntries(Object.entries(full).filter(([k]) => k !== 'priorities'));
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p === 'priorities')).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Scenario 11: priorities as a string (wrong type) rejected
// ---------------------------------------------------------------------------
it('daySchema rejects priorities as string (wrong type)', () => {
  const payload = { ...makeValidPayload(), priorities: 'not-an-array' };
  const result = daySchema.safeParse(payload);
  expect(result.success).toBe(false);
  if (!result.success) {
    const paths = result.error.issues.map((i) => i.path.join('.'));
    expect(paths.some((p) => p === 'priorities')).toBe(true);
  }
});

// ---------------------------------------------------------------------------
// Scenario 12: sub-schemas validate their respective shapes independently
// (also covers Istanbul binding counters for exported sub-schema identifiers)
// ---------------------------------------------------------------------------
it('moodSchema accepts valid mood object', () => {
  expect(moodSchema.safeParse({ emoji: '😊', label: 'happy', color: '#fff' }).success).toBe(true);
  expect(moodSchema.safeParse(null).success).toBe(true);
});

it('prioritySchema accepts valid priority and rejects missing id', () => {
  expect(
    prioritySchema.safeParse({ id: '01HZZZZZZZZZZZZZZZZZZZZZZA', text: 'ok', done: false }).success,
  ).toBe(true);
  expect(prioritySchema.safeParse({ text: 'no-id', done: false }).success).toBe(false);
});

it('agendaSlotSchema accepts hour in range 6..23', () => {
  expect(agendaSlotSchema.safeParse({ hour: 6, text: '' }).success).toBe(true);
  expect(agendaSlotSchema.safeParse({ hour: 23, text: '' }).success).toBe(true);
  expect(agendaSlotSchema.safeParse({ hour: 5, text: '' }).success).toBe(false);
});

it('noteSchema accepts valid prefix from the allowed enum', () => {
  expect(noteSchema.safeParse({ id: 'n1', prefix: '•', text: 'x' }).success).toBe(true);
  expect(noteSchema.safeParse({ id: 'n1', prefix: 'z', text: 'x' }).success).toBe(false);
});
