import type { DailyPageData } from '@calendarfr/shared';

import type { MissionId } from '../../types.js';
import { deriveMissionProgress } from '../deriveMissionProgress.js';

const NOW = '2026-05-17T10:00:00.000Z';
const OLD_TS = '2026-01-01T00:00:00.000Z';

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
  };
}

describe('deriveMissionProgress', () => {
  describe('AC-013b loading: data === null', () => {
    it('returns persistedHistory as-is when data is null', () => {
      const history: Record<MissionId, string | null> = {
        ...makeAllNullHistory(),
        'M-INTENTION': OLD_TS,
        'M-MOOD': OLD_TS,
      };
      const result = deriveMissionProgress(null, history, NOW);
      expect(result).toBe(history);
    });
  });

  describe('AC-013a latching: already-completed missions are preserved', () => {
    it('preserves old timestamp when M-INTENTION was completed and intention is now empty', () => {
      const history = { ...makeAllNullHistory(), 'M-INTENTION': OLD_TS };
      const data = { ...makeEmptyData(), intention: '' };
      const result = deriveMissionProgress(data, history, NOW);
      expect(result['M-INTENTION']).toBe(OLD_TS);
    });

    it('does not overwrite existing timestamp with nowIso', () => {
      const history = { ...makeAllNullHistory(), 'M-MOOD': OLD_TS };
      const data = { ...makeEmptyData(), mood: { emoji: '😊', label: 'Feliz', color: '#fff' } };
      const result = deriveMissionProgress(data, history, NOW);
      expect(result['M-MOOD']).toBe(OLD_TS);
    });
  });

  describe('all 7 conditions met simultaneously', () => {
    it('marks all 7 missions with the same nowIso when all conditions are true', () => {
      const slots = makeAgendaSlots();
      (slots[0] as (typeof slots)[0]).text = '<b>standup</b>';
      const data: DailyPageData = {
        schemaVersion: 1,
        date: '2026-05-17',
        mood: { emoji: '😊', label: 'Feliz', color: '#fff' },
        priorities: [{ id: 'p1', text: '<b>deploy</b>', done: true }],
        agenda: slots,
        notes: [{ id: 'n1', prefix: '•', text: 'note' }],
        intention: 'foco total',
        gratitude: [{ id: 'g1', text: 'saúde' }],
        createdAt: null,
        updatedAt: null,
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), NOW);
      const missionIds: MissionId[] = [
        'M-INTENTION',
        'M-MOOD',
        'M-PRIORITY',
        'M-FORMAT',
        'M-CHECK',
        'M-WRITE',
        'M-GRATITUDE',
      ];
      for (const id of missionIds) {
        expect(result[id]).toBe(NOW);
      }
      expect(Object.keys(result)).not.toContain('M-NAVIGATE');
    });
  });

  describe('M-FORMAT edge cases', () => {
    it('<b></b> triggers M-FORMAT but not M-PRIORITY (intentional divergence)', () => {
      const data = {
        ...makeEmptyData(),
        priorities: [{ id: 'p1', text: '<b></b>', done: false }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), NOW);
      expect(result['M-FORMAT']).toBe(NOW);
      expect(result['M-PRIORITY']).toBeNull();
    });
  });

  describe('M-WRITE OR semantics', () => {
    it('marks with only notes present (empty text note still satisfies notes.length > 0)', () => {
      const data = {
        ...makeEmptyData(),
        notes: [{ id: 'n1', prefix: '→' as const, text: '' }],
      };
      const result = deriveMissionProgress(data, makeAllNullHistory(), NOW);
      expect(result['M-WRITE']).toBe(NOW);
    });

    it('does not mark when agenda stripped is empty and notes is empty', () => {
      const slots = makeAgendaSlots();
      (slots[0] as (typeof slots)[0]).text = '<b></b>';
      const data = { ...makeEmptyData(), agenda: slots };
      const result = deriveMissionProgress(data, makeAllNullHistory(), NOW);
      expect(result['M-WRITE']).toBeNull();
    });
  });
});
