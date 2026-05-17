export type SoundId = 'mission-complete' | 'day-complete';

// Cache-buster bumped whenever the underlying ogg assets are regenerated, so
// browsers don't keep serving the prior (silent) build from HTTP cache.
const ASSET_VERSION = 3;

export const SOUND_URLS: Record<SoundId, string> = {
  'mission-complete': `/sounds/mission-complete.ogg?v=${ASSET_VERSION}`,
  'day-complete': `/sounds/day-complete.ogg?v=${ASSET_VERSION}`,
};

export const SOUND_IDS: readonly SoundId[] = ['mission-complete', 'day-complete'];
