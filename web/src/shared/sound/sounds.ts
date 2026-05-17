export type SoundId = 'mission-complete' | 'day-complete';

export const SOUND_URLS: Record<SoundId, string> = {
  'mission-complete': '/sounds/mission-complete.ogg',
  'day-complete': '/sounds/day-complete.ogg',
};

export const SOUND_IDS: readonly SoundId[] = ['mission-complete', 'day-complete'];
