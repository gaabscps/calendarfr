import type { MissionId, OnboardingState, OnboardingStatus } from '../types.js';

import { CUSTOM_EVENT_NAME, MISSION_COUNT, STORAGE_KEY } from './constants.js';

const MISSION_IDS: readonly MissionId[] = [
  'M-INTENTION',
  'M-MOOD',
  'M-PRIORITY',
  'M-FORMAT',
  'M-CHECK',
  'M-WRITE',
  'M-GRATITUDE',
  'M-NAVIGATE',
];

const VALID_STATUSES = new Set<OnboardingStatus>([
  'pending',
  'in_progress',
  'completed',
  'dismissed',
]);

function buildInitialState(): OnboardingState {
  const missionsCompleted = Object.fromEntries(MISSION_IDS.map((id) => [id, null])) as Record<
    MissionId,
    string | null
  >;
  return {
    schemaVersion: 1,
    status: 'pending',
    missionsCompleted,
    completedAt: null,
    completedOnDate: null,
  };
}

function isValidState(raw: unknown): raw is OnboardingState {
  if (!raw || typeof raw !== 'object') return false;
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== 1) return false;
  if (!VALID_STATUSES.has(obj.status as OnboardingStatus)) return false;
  const mc = obj.missionsCompleted;
  if (!mc || typeof mc !== 'object') return false;
  const mcRecord = mc as Record<string, unknown>;
  const keys = Object.keys(mcRecord);
  if (keys.length !== MISSION_COUNT) return false;
  return MISSION_IDS.every((id) => {
    if (!(id in mcRecord)) return false;
    const val = mcRecord[id];
    return val === null || (typeof val === 'string' && val.length > 0);
  });
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
    /* quota or storage unavailable — degrade silently (AC-026) */
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
