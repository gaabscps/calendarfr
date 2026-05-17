import type { DailyPageData } from '@calendarfr/shared';

import type { MissionId } from '../../types.js';
import { deriveMissionProgress } from '../deriveMissionProgress.js';

const NOW = '2026-05-17T10:00:00.000Z';

function makeAgendaSlots(): DailyPageData['agenda'] {
  return Array.from({ length: 18 }, (_, i) => ({
    hour: 6 + i,
    text: '',
    energy: null,
  })) as unknown as DailyPageData['agenda'];
}

function makeEmptyData(): DailyPageData {
  return {
    schemaVersion: 1,
    date: '2026-05-17',
    mood: null,
    priorities: [{ id: 'p1', text: '', done: false }],
    agenda: makeAgendaSlots(),
    notes: [],
    intention: null,
    gratitude: [],
    createdAt: null,
    updatedAt: null,
  };
}

function makeAllNullHistory(): Record<MissionId, string | null> {
  return {
    'M-INTENTION': null,
    'M-MOOD': null,
    'M-PRIORITY': null,
    'M-FORMAT': null,
    'M-CHECK': null,
    'M-WRITE': null,
    'M-GRATITUDE': null,
    'M-NAVIGATE': null,
  };
}

describe('deriveMissionProgress — per-mission', () => {
  describe('AC-003 M-INTENTION', () => {
    it('marks when intention has non-empty trimmed text', () => {
      const data = { ...makeEmptyData(), intention: '  foco  ' };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-INTENTION']).toBe(NOW);
    });

    it('does not mark when intention is null', () => {
      const data = { ...makeEmptyData(), intention: null };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-INTENTION']).toBeNull();
    });

    it('does not mark when intention is whitespace only', () => {
      const data = { ...makeEmptyData(), intention: '   ' };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-INTENTION']).toBeNull();
    });
  });

  describe('AC-004 M-MOOD', () => {
    it('marks when mood is set', () => {
      const data = { ...makeEmptyData(), mood: { emoji: '😊', label: 'Feliz', color: '#fff' } };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-MOOD']).toBe(NOW);
    });

    it('does not mark when mood is null', () => {
      const data = { ...makeEmptyData(), mood: null };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-MOOD']).toBeNull();
    });

    it('does not mark when mood is undefined (both null and undefined must not mark)', () => {
      const data = { ...makeEmptyData(), mood: undefined as unknown as null };
      const resultUndefined = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      const dataNull = { ...makeEmptyData(), mood: null };
      const resultNull = deriveMissionProgress(dataNull, makeAllNullHistory(), false, NOW);
      expect(resultUndefined['M-MOOD']).toBeNull();
      expect(resultNull['M-MOOD']).toBeNull();
    });
  });

  describe('AC-005 M-PRIORITY', () => {
    it('marks when at least one priority has non-empty stripped text', () => {
      const data = {
        ...makeEmptyData(),
        priorities: [{ id: 'p1', text: '<b>Buy milk</b>', done: false }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-PRIORITY']).toBe(NOW);
    });

    it('does not mark when all priorities have empty stripped text', () => {
      const data = {
        ...makeEmptyData(),
        priorities: [{ id: 'p1', text: '', done: false }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-PRIORITY']).toBeNull();
    });
  });

  describe('AC-007 M-FORMAT', () => {
    it('marks when a priority contains a <b> tag', () => {
      const data = {
        ...makeEmptyData(),
        priorities: [{ id: 'p1', text: '<b>important</b>', done: false }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-FORMAT']).toBe(NOW);
    });

    it('marks when an agenda slot contains <i> tag', () => {
      const slots = makeAgendaSlots();
      (slots[0] as (typeof slots)[0]).text = '<i>meeting</i>';
      const data = { ...makeEmptyData(), agenda: slots };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-FORMAT']).toBe(NOW);
    });

    it('marks when a gratitude item contains <u> tag', () => {
      const data = {
        ...makeEmptyData(),
        gratitude: [{ id: 'g1', text: '<u>family</u>' }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-FORMAT']).toBe(NOW);
    });

    it('marks when priority contains uppercase <B> or <I> tags (regex /i is case-insensitive)', () => {
      const dataB = {
        ...makeEmptyData(),
        priorities: [{ id: 'p1', text: '<B>bold</B>', done: false }],
      };
      const dataI = {
        ...makeEmptyData(),
        priorities: [{ id: 'p2', text: '<I>italic</I>', done: false }],
      };
      expect(deriveMissionProgress(dataB, makeAllNullHistory(), false, NOW)['M-FORMAT']).toBe(NOW);
      expect(deriveMissionProgress(dataI, makeAllNullHistory(), false, NOW)['M-FORMAT']).toBe(NOW);
    });

    it('does not match intention (plain text field is excluded from M-FORMAT check)', () => {
      const data = { ...makeEmptyData(), intention: '<b>test</b>' };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-FORMAT']).toBeNull();
    });

    it('does not mark when no rich-text fields contain formatting tags', () => {
      const result = deriveMissionProgress(makeEmptyData(), makeAllNullHistory(), false, NOW);
      expect(result['M-FORMAT']).toBeNull();
    });
  });

  describe('AC-008 M-CHECK', () => {
    it('marks when at least one priority is done', () => {
      const data = {
        ...makeEmptyData(),
        priorities: [{ id: 'p1', text: 'task', done: true }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-CHECK']).toBe(NOW);
    });

    it('does not mark when no priority is done', () => {
      const result = deriveMissionProgress(makeEmptyData(), makeAllNullHistory(), false, NOW);
      expect(result['M-CHECK']).toBeNull();
    });

    it('does not mark when done is truthy non-boolean 1 (strict ===true required)', () => {
      const data = {
        ...makeEmptyData(),
        priorities: [{ id: 'p1', text: 'task', done: 1 as unknown as boolean }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-CHECK']).toBeNull();
    });
  });

  describe('AC-009 M-WRITE', () => {
    it('marks when agenda has non-empty stripped text', () => {
      const slots = makeAgendaSlots();
      (slots[2] as (typeof slots)[2]).text = 'reunião';
      const data = { ...makeEmptyData(), agenda: slots };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-WRITE']).toBe(NOW);
    });

    it('marks when notes has at least one entry', () => {
      const data = {
        ...makeEmptyData(),
        notes: [{ id: 'n1', prefix: '•' as const, text: 'some note' }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-WRITE']).toBe(NOW);
    });

    it('does not mark when agenda is empty and notes is empty', () => {
      const result = deriveMissionProgress(makeEmptyData(), makeAllNullHistory(), false, NOW);
      expect(result['M-WRITE']).toBeNull();
    });
  });

  describe('AC-010 M-GRATITUDE', () => {
    it('marks when at least one gratitude item has non-empty stripped text', () => {
      const data = {
        ...makeEmptyData(),
        gratitude: [{ id: 'g1', text: '<b>família</b>' }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-GRATITUDE']).toBe(NOW);
    });

    it('does not mark when all gratitude items are empty', () => {
      const data = { ...makeEmptyData(), gratitude: [{ id: 'g1', text: '' }] };
      const result = deriveMissionProgress(data, makeAllNullHistory(), false, NOW);
      expect(result['M-GRATITUDE']).toBeNull();
    });
  });

  describe('AC-011 M-NAVIGATE', () => {
    it('marks when navOccurred is true', () => {
      const result = deriveMissionProgress(makeEmptyData(), makeAllNullHistory(), true, NOW);
      expect(result['M-NAVIGATE']).toBe(NOW);
    });

    it('does not mark when navOccurred is false', () => {
      const result = deriveMissionProgress(makeEmptyData(), makeAllNullHistory(), false, NOW);
      expect(result['M-NAVIGATE']).toBeNull();
    });
  });
});
