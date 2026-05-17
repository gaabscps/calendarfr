import { SOUND_URLS, type SoundId } from './sounds.js';

const STORAGE_KEY = 'calendarfr:sound:muted';
const VOLUME_NORMAL = 0.7;
const VOLUME_REDUCED = 0.4;

export interface SoundController {
  play(id: SoundId): void;
  isMuted(): boolean;
  setMuted(muted: boolean): void;
  subscribe(fn: () => void): () => void;
}

function readMutedFromStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMutedToStorage(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* quota / privacy mode */
  }
}

function getVolume(): number {
  try {
    if (typeof window !== 'undefined' && window.matchMedia) {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return VOLUME_REDUCED;
      }
    }
  } catch {
    /* matchMedia missing or threw */
  }
  return VOLUME_NORMAL;
}

export function createSoundController(): SoundController {
  let muted = readMutedFromStorage();
  const listeners = new Set<() => void>();
  const cache = new Map<SoundId, HTMLAudioElement>();

  function emit(): void {
    listeners.forEach((fn) => fn());
  }

  function getOrCreateBase(id: SoundId): HTMLAudioElement {
    const cached = cache.get(id);
    if (cached) return cached;
    const audio = new Audio(SOUND_URLS[id]);
    audio.preload = 'auto';
    cache.set(id, audio);
    return audio;
  }

  return {
    play(id: SoundId): void {
      if (muted) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.debug(`[sound] play('${id}') skipped — controller is muted`);
        }
        return;
      }
      const base = getOrCreateBase(id);
      const clone = base.cloneNode(true) as HTMLAudioElement;
      clone.volume = getVolume();
      const result: unknown = clone.play();
      if (result instanceof Promise) {
        result
          .then(() => {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.debug(`[sound] play('${id}') ✓ vol=${clone.volume.toFixed(2)}`);
            }
          })
          .catch((err: unknown) => {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.debug(`[sound] play('${id}') ✗`, err);
            }
          });
      }
    },
    isMuted: () => muted,
    setMuted(value: boolean): void {
      if (value === muted) return;
      muted = value;
      writeMutedToStorage(value);
      emit();
    },
    subscribe(fn: () => void): () => void {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}

export const soundController: SoundController = createSoundController();
