export type SoundId = 'mission-complete' | 'day-complete' | 'sticky-attach' | 'sticky-peel';

export const SOUND_URLS: Record<SoundId, string> = {
  'mission-complete': '/sounds/mission-complete.ogg',
  'day-complete': '/sounds/day-complete.ogg',
  'sticky-attach': '/sounds/sticky-attach.ogg',
  'sticky-peel': '/sounds/sticky-peel.ogg',
};

export const SOUND_IDS: readonly SoundId[] = [
  'mission-complete',
  'day-complete',
  'sticky-attach',
  'sticky-peel',
];
