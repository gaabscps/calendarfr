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
  let unlocked = false;
  const listeners = new Set<() => void>();

  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`[sound] controller init — muted=${muted ? 'YES' : 'no'}`);
  }

  function emit(): void {
    listeners.forEach((fn) => fn());
  }

  /**
   * Chrome (e most browsers) block Audio.play() até a primeira interação do
   * usuário. play() é chamado de useEffect (callback async), fora do gesture
   * context, então o browser silenciosamente rejeita.
   *
   * Solução: na primeira pointerdown/keydown/touchstart (que ESTÁ no gesture
   * context), tocamos um audio silencioso. Depois disso o documento fica
   * "audio-activated" e qualquer `new Audio().play()` posterior funciona,
   * incluindo de contextos async.
   *
   * Importante: usamos um Audio descartável só pra unlock — NÃO compartilha
   * estado com os Audios reais de play(). Cada play() cria um Audio fresco
   * pra evitar race conditions (unlock pausando audio legítimo, currentTime
   * inconsistente, etc).
   */
  function unlockAudio(): void {
    if (unlocked) return;
    unlocked = true;
    if (process.env.NODE_ENV !== 'production') {
      // eslint-disable-next-line no-console
      console.log('[sound] unlock — priming audio on first user gesture');
    }
    const dummy = new Audio(SOUND_URLS['mission-complete']);
    dummy.volume = 0;
    const p = dummy.play();
    if (p instanceof Promise) {
      p.catch(() => {
        /* unlock failed — subsequent plays will retry */
      });
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
      // Fresh Audio per call. Browser HTTP cache makes subsequent fetches
      // instant. No shared state, no race with unlock, no clone leaks.
      const audio = new Audio(SOUND_URLS[id]);
      audio.volume = getVolume();
      const result: unknown = audio.play();
      if (result instanceof Promise) {
        result
          .then(() => {
            if (process.env.NODE_ENV !== 'production') {
              // eslint-disable-next-line no-console
              console.log(`[sound] play('${id}') ✓ vol=${audio.volume.toFixed(2)}`);
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
