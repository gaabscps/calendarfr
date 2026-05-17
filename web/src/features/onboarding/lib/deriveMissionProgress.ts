import type { DailyPageData } from '@calendarfr/shared';

import type { MissionId } from '../types.js';

import { stripHtml } from './stripHtml.js';

const FORMAT_REGEX = /<(b|i|u|s)>/i;

function buildRichTextAggregate(data: DailyPageData): string {
  const priorities = data.priorities.map((p) => p.text).join('');
  const agenda = data.agenda.map((s) => s.text).join('');
  const notes = data.notes.map((n) => n.text).join('');
  const gratitude = data.gratitude.map((g) => g.text).join('');
  return priorities + agenda + notes + gratitude;
}

function evaluateCondition(id: MissionId, data: DailyPageData, navOccurred: boolean): boolean {
  switch (id) {
    case 'M-INTENTION':
      return (data.intention?.trim().length ?? 0) > 0;
    case 'M-MOOD':
      return data.mood !== null && data.mood !== undefined;
    case 'M-PRIORITY':
      return data.priorities.some((p) => stripHtml(p.text).trim().length > 0);
    case 'M-FORMAT':
      return FORMAT_REGEX.test(buildRichTextAggregate(data));
    case 'M-CHECK':
      return data.priorities.some((p) => p.done === true);
    case 'M-WRITE':
      return data.agenda.some((s) => stripHtml(s.text).trim() !== '') || data.notes.length > 0;
    case 'M-GRATITUDE':
      return data.gratitude.some((g) => stripHtml(g.text).trim().length > 0);
    case 'M-NAVIGATE':
      return navOccurred;
  }
}

export function deriveMissionProgress(
  data: DailyPageData | null,
  persistedHistory: Record<MissionId, string | null>,
  navOccurred: boolean,
  nowIso: string = new Date().toISOString(),
): Record<MissionId, string | null> {
  if (data === null) {
    return persistedHistory;
  }

  const missionIds: MissionId[] = [
    'M-INTENTION',
    'M-MOOD',
    'M-PRIORITY',
    'M-FORMAT',
    'M-CHECK',
    'M-WRITE',
    'M-GRATITUDE',
    'M-NAVIGATE',
  ];

  const result = {} as Record<MissionId, string | null>;

  for (const id of missionIds) {
    const existing = persistedHistory[id];
    if (existing !== null) {
      result[id] = existing;
    } else {
      result[id] = evaluateCondition(id, data, navOccurred) ? nowIso : null;
    }
  }

  return result;
}
