import type { MissionId, OnboardingState, OnboardingStatus } from '../types.js';

import {
  CUSTOM_EVENT_NAME,
  MISSION_COUNT,
  STORAGE_KEY,
  STORAGE_SCHEMA_VERSION,
} from './constants.js';
import { MISSION_IDS } from './missions.js';

const VALID_STATUSES = new Set<OnboardingStatus>([
  'pending',
  'in_progress',
  'completed',
  'dismissed',
]);

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function buildEmptyMissionRecord(): Record<MissionId, string | null> {
  return MISSION_IDS.reduce(
    (acc, id) => ({ ...acc, [id]: null }),
    {} as Record<MissionId, string | null>,
  );
}

function buildInitialState(): OnboardingState {
  return {
    schemaVersion: 2,
    progressByDate: {},
    completedAt: null,
    completedOnDate: null,
    status: 'pending',
  };
}

function isValidState(raw: unknown): raw is OnboardingState {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== STORAGE_SCHEMA_VERSION) return false;
  if (!VALID_STATUSES.has(obj.status as OnboardingStatus)) return false;
  const pbd = obj.progressByDate;
  if (!pbd || typeof pbd !== 'object' || Array.isArray(pbd)) return false;
  const pbdRecord = pbd as Record<string, unknown>;
  for (const [dateKey, dayValue] of Object.entries(pbdRecord)) {
    if (!DATE_REGEX.test(dateKey)) return false;
    if (!dayValue || typeof dayValue !== 'object' || Array.isArray(dayValue)) return false;
    const dayRecord = dayValue as Record<string, unknown>;
    if (Object.keys(dayRecord).length !== MISSION_COUNT) return false;
    const allValid = MISSION_IDS.every((id) => {
      if (!(id in dayRecord)) return false;
      const val = dayRecord[id];
      return val === null || (typeof val === 'string' && val.length > 0);
    });
    if (!allValid) return false;
  }
  return true;
}

let cachedRaw: string | null = undefined as unknown as string | null;
let cachedState: OnboardingState | null = null;

export function readStorage(): OnboardingState {
  try {
    const raw = globalThis.localStorage.getItem(STORAGE_KEY);
    if (raw === cachedRaw && cachedState !== null) return cachedState;
    cachedRaw = raw;
    if (raw === null) {
      cachedState = buildInitialState();
      return cachedState;
    }
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) {
      // v1 or invalid schema — silent discard per AC-022/NFR-010
      cachedState = buildInitialState();
      return cachedState;
    }
    cachedState = parsed;
    return cachedState;
  } catch {
    cachedState = buildInitialState();
    return cachedState;
  }
}

export function writeStorage(state: OnboardingState): void {
  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
  } catch {
    /* quota or storage unavailable — degrade silently */
  }
}

export function subscribeStorage(callback: () => void): () => void {
  function onStorage(event: StorageEvent): void {
    if (event.key === STORAGE_KEY) callback();
  }
  window.addEventListener('storage', onStorage);
  window.addEventListener(CUSTOM_EVENT_NAME, callback);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CUSTOM_EVENT_NAME, callback);
  };
}
