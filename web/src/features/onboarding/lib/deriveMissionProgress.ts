import type { DailyPageData } from '@calendarfr/shared';

import type { MissionId } from '../types.js';

import { MISSION_IDS } from './missions.js';
import { stripHtml } from './stripHtml.js';

const FORMAT_REGEX = /<(b|i|u|s)>/i;

function buildRichTextAggregate(data: DailyPageData): string {
  const priorities = data.priorities.map((p) => p.text).join('');
  const agenda = data.agenda.map((s) => s.text).join('');
  const notes = data.notes.map((n) => n.text).join('');
  const gratitude = data.gratitude.map((g) => g.text).join('');
  return priorities + agenda + notes + gratitude;
}

export function evaluateMissionCondition(id: MissionId, data: DailyPageData): boolean {
  return evaluateCondition(id, data);
}

function evaluateCondition(id: MissionId, data: DailyPageData): boolean {
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
  }
}

export function deriveMissionProgress(
  data: DailyPageData | null,
  persistedHistory: Record<MissionId, string | null>,
  nowIso: string = new Date().toISOString(),
): Record<MissionId, string | null> {
  if (data === null) {
    return persistedHistory;
  }

  const result = {} as Record<MissionId, string | null>;

  for (const id of MISSION_IDS) {
    const existing = persistedHistory[id];
    if (existing !== null) {
      result[id] = existing;
    } else {
      result[id] = evaluateCondition(id, data) ? nowIso : null;
    }
  }

  return result;
}

/**
 * Returns the slice of missions that are visually "completed right now" for a given date.
 *
 * Definition: a mission is visually completed iff its persisted timestamp is non-null
 * AND the current `data` still satisfies the mission's condition. This makes the sticky
 * track real content state — if the user deletes their gratitude entry, M-GRATITUDE
 * reverts to pending in the UI even though storage keeps the original timestamp
 * (history is preserved; only the visible reading flips).
 *
 * Storage stays append-only (AC-017 latch): we never erase timestamps. This is a
 * read-side projection only.
 */
export function selectVisibleMissionCompletion(
  data: DailyPageData | null,
  persistedHistory: Record<MissionId, string | null>,
): Record<MissionId, string | null> {
  if (data === null) return persistedHistory;
  const result = {} as Record<MissionId, string | null>;
  for (const id of MISSION_IDS) {
    const existing = persistedHistory[id];
    result[id] = existing !== null && evaluateCondition(id, data) ? existing : null;
  }
  return result;
}
