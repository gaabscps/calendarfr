import { useCallback, useSyncExternalStore } from 'react';

import { soundController } from './soundController.js';
import type { SoundId } from './sounds.js';

export interface UseSoundController {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (value: boolean) => void;
  play: (id: SoundId) => void;
}

export function useSoundController(): UseSoundController {
  const muted = useSyncExternalStore(
    (fn) => soundController.subscribe(fn),
    () => soundController.isMuted(),
    () => false,
  );

  const toggleMute = useCallback(() => {
    soundController.setMuted(!soundController.isMuted());
  }, []);

  const setMuted = useCallback((value: boolean) => {
    soundController.setMuted(value);
  }, []);

  const play = useCallback((id: SoundId) => {
    soundController.play(id);
  }, []);

  return { muted, toggleMute, setMuted, play };
}
