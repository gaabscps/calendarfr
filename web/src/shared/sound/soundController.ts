import type { SoundId } from './sounds.js';

const STORAGE_KEY = 'calendarfr:sound:muted';

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

export function createSoundController(): SoundController {
  let muted = readMutedFromStorage();
  const listeners = new Set<() => void>();

  function emit(): void {
    listeners.forEach((fn) => fn());
  }

  return {
    play(id: SoundId): void {
      void id;
      // Audio playback wired in Task 3.
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
