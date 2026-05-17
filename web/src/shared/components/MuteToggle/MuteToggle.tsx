import { useSoundController } from '@/shared/sound/useSoundController';

import styles from './MuteToggle.module.css';

export interface MuteToggleProps {
  className?: string;
}

export function MuteToggle({ className }: MuteToggleProps) {
  const { muted, toggleMute, play } = useSoundController();
  const label = muted ? 'Ativar sons' : 'Silenciar sons';

  function handleClick(): void {
    const wasMuted = muted;
    toggleMute();
    // Quando o usuário (re)ativa sons, tocamos mission-complete imediatamente
    // dentro do contexto do clique. Funciona como confirmação audível ("sim,
    // áudio ligado") E como bypass garantido da política de autoplay do
    // Chrome — esse play() está no gesture handler, então sempre é aceito.
    if (wasMuted) {
      play('mission-complete');
    }
  }

  return (
    <button
      type="button"
      aria-label={label}
      onClick={handleClick}
      className={[styles.button, className].filter(Boolean).join(' ')}
    >
      {muted ? (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          data-testid="muteToggle-iconMuted"
        >
          <path
            d="M3 6 H5 L8 3 V13 L5 10 H3 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          <line x1="11" y1="6" x2="14" y2="9" stroke="currentColor" strokeWidth="1.4" />
          <line x1="14" y1="6" x2="11" y2="9" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          aria-hidden="true"
          data-testid="muteToggle-iconUnmuted"
        >
          <path
            d="M3 6 H5 L8 3 V13 L5 10 H3 Z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="0.5"
            strokeLinejoin="round"
          />
          <path
            d="M10.5 5.5 Q12.5 8 10.5 10.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
          <path
            d="M12 4 Q15 8 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  );
}
