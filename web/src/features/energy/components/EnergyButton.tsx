import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';

import type { Energy } from '../types.js';

import styles from './EnergyButton.module.css';
import { EnergyPalette } from './EnergyPalette.js';

const FullPicker = lazy(() => import('emoji-picker-react'));

export interface EnergyButtonProps {
  energy: Energy | null;
  suggestion: string | null;
  onChange: (energy: Energy | null) => void;
  hour: number;
}

/**
 * Botão âncora + popover para escolher o emoji de energy de um slot.
 *
 * Estados:
 *   - energy setado          → emoji visível, click abre paleta
 *   - energy=null + sugestão → ghost emoji, click aceita sugestão direto
 *   - energy=null sem sug    → "+" discreto, click abre paleta
 *
 * Click direito (ou long-press touch) sempre limpa energy.
 *
 * Full picker (emoji-picker-react) é lazy-loaded — não entra no bundle inicial.
 */
export function EnergyButton({ energy, suggestion, onChange, hour }: EnergyButtonProps) {
  const [open, setOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setShowFullPicker(false);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open, close]);

  const handleButtonClick = () => {
    if (energy === null && suggestion !== null) {
      onChange({ emoji: suggestion });
      return;
    }
    setOpen((v) => !v);
  };

  const handlePick = (emoji: string) => {
    onChange({ emoji });
    close();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onChange(null);
    close();
  };

  const display = energy?.emoji ?? suggestion ?? '+';
  const isSuggestion = energy === null && suggestion !== null;
  const ariaLabel =
    energy !== null ? `Energy da hora ${hour}: ${energy.emoji}` : `Definir energy da hora ${hour}`;

  return (
    <div ref={wrapperRef} className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        {...(isSuggestion ? { 'data-suggestion': 'true' } : {})}
        onClick={handleButtonClick}
        onContextMenu={handleContextMenu}
      >
        {display}
      </button>
      {open && (
        <div className={styles.popover}>
          {showFullPicker ? (
            <Suspense fallback={<div>Carregando…</div>}>
              <FullPicker onEmojiClick={(data) => handlePick(data.emoji)} />
            </Suspense>
          ) : (
            <EnergyPalette
              current={energy?.emoji ?? null}
              onPick={handlePick}
              onOpenFullPicker={() => setShowFullPicker(true)}
            />
          )}
        </div>
      )}
    </div>
  );
}
