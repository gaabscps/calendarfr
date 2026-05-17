import { SOUND_IDS, SOUND_URLS, type SoundId } from './sounds.js';

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
  let unlocked = false;
  const listeners = new Set<() => void>();
  const cache = new Map<SoundId, HTMLAudioElement>();

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[sound] controller init — muted=${muted ? 'YES' : 'no'}`);
  }

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

  /**
   * Chrome (and most modern browsers) block Audio.play() until the user has
   * interacted with the page. The mission-complete / day-complete sounds fire
   * from React effects (async callbacks), NOT from inside the click handler —
   * so by the time play() runs, the gesture context is gone and the browser
   * silently rejects. We unlock by playing each cached audio muted during the
   * first real pointerdown/keydown, which DOES happen inside a gesture context.
   * Subsequent unmuted plays then succeed normally.
   */
  function unlockAudio(): void {
    if (unlocked) return;
    unlocked = true;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[sound] unlock — priming audio on first user gesture');
    }
    for (const id of SOUND_IDS) {
      const audio = getOrCreateBase(id);
      audio.muted = true;
      const p = audio.play();
      if (p instanceof Promise) {
        p.then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        }).catch(() => {
          audio.muted = false;
        });
      }
    }
  }

  if (typeof document !== 'undefined') {
    const opts = { once: true, capture: true } as AddEventListenerOptions;
    document.addEventListener('pointerdown', unlockAudio, opts);
    document.addEventListener('keydown', unlockAudio, opts);
    document.addEventListener('touchstart', unlockAudio, opts);
  }

  return {
    play(id: SoundId): void {
      if (muted) {
        if (process.env.NODE_ENV !== 'production') {
          // eslint-disable-next-line no-console
          console.log(`[sound] play('${id}') skipped — controller is muted`);
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
              console.log(`[sound] play('${id}') ✓ vol=${clone.volume.toFixed(2)}`);
            }
          })
          .catch((err: unknown) => {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.log(`[sound] play('${id}') ✗`, err);
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
