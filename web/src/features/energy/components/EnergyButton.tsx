import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { emojiHolo } from '../lib/emojiHolo.js';
import { stickerRotation } from '../lib/stickerRotation.js';
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
 * Altura estimada do popover (paleta + título + slot descrição + link).
 * Usada apenas para decidir flip up/down; não precisa ser exata — a
 * paleta tem ~280px e o erro de algumas dezenas de pixels não muda
 * a decisão (só importa quando o slot está perto da borda da viewport).
 */
const POPOVER_ESTIMATED_HEIGHT = 320;

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
/** Quantos sparkles disparar no burst de confetti — fixo, pra CSS conhecer. */
const SPARKLE_COUNT = 6;
/** Duração do data-celebrate; deve casar com a anim sparkleBurst no CSS. */
const CELEBRATE_DURATION_MS = 500;

export function EnergyButton({ energy, suggestion, onChange, hour }: EnergyButtonProps) {
  const [open, setOpen] = useState(false);
  const [showFullPicker, setShowFullPicker] = useState(false);
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const [celebrate, setCelebrate] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const prevEnergyRef = useRef<Energy | null>(energy);
  const rotation = stickerRotation(hour);

  // Confetti burst: dispara quando o slot transiciona de "sem energy"
  // para "com energy" (set ou trocar emoji conta como burst novo).
  useEffect(() => {
    const prev = prevEnergyRef.current;
    const becameSet = prev === null && energy !== null;
    const changedEmoji = prev !== null && energy !== null && prev.emoji !== energy.emoji;
    if (becameSet || changedEmoji) {
      setCelebrate(true);
      const id = window.setTimeout(() => setCelebrate(false), CELEBRATE_DURATION_MS);
      prevEnergyRef.current = energy;
      return () => window.clearTimeout(id);
    }
    prevEnergyRef.current = energy;
    return undefined;
  }, [energy]);

  const close = useCallback(() => {
    setOpen(false);
    setShowFullPicker(false);
    buttonRef.current?.focus();
  }, []);

  // Decide placement (top vs bottom) ao abrir, baseado no espaço disponível
  // entre o botão e as bordas da viewport. Roda em useLayoutEffect para
  // evitar flash do popover na posição errada.
  useLayoutEffect(() => {
    if (!open) return;
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    if (spaceBelow < POPOVER_ESTIMATED_HEIGHT && spaceAbove > spaceBelow) {
      setPlacement('top');
    } else {
      setPlacement('bottom');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onKeyDown);
    };
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

  const handleContextMenu = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onChange(null);
    close();
  };

  const display = energy?.emoji ?? suggestion ?? '+';
  const isSuggestion = energy === null && suggestion !== null;
  const isSet = energy !== null;
  const ariaLabel =
    energy !== null ? `Energy da hora ${hour}: ${energy.emoji}` : `Definir energy da hora ${hour}`;

  return (
    <div
      ref={wrapperRef}
      className={styles.wrapper}
      {...(celebrate ? { 'data-celebrate': 'true' } : {})}
    >
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        style={{
          ['--sticker-rotation' as string]: `${rotation}deg`,
          // Identidade visual por emoji: cor base pastel + accent +
          // ângulo do reflexo foil. CSS gating no data-state='set' faz
          // as vars só renderizarem como sticker quando há energia.
          ...(energy !== null
            ? (() => {
                const id = emojiHolo(energy.emoji);
                return {
                  ['--sticker-base' as string]: id.base,
                  ['--sticker-accent' as string]: id.accent,
                  ['--holo-angle' as string]: String(id.angle),
                };
              })()
            : {}),
        }}
        aria-label={ariaLabel}
        {...(isSuggestion
          ? { 'data-suggestion': 'true' }
          : { 'aria-haspopup': 'menu' as const, 'aria-expanded': open })}
        {...(isSet ? { 'data-state': 'set' as const } : {})}
        onClick={handleButtonClick}
        onContextMenu={handleContextMenu}
      >
        {display}
      </button>
      {/* Sparkles: ficam ocultos por padrão; o CSS dispara a animação
          quando o wrapper recebe data-celebrate. Ângulos espalhados
          em volta do círculo. Sempre montados (count fixo) — assim a
          animação não precisa esperar reflow no toggle. */}
      {Array.from({ length: SPARKLE_COUNT }).map((_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={styles.sparkle}
          style={{ ['--angle' as string]: `${(360 / SPARKLE_COUNT) * i}deg` }}
        />
      ))}
      {open && (
        <div
          className={`${styles.popover} ${placement === 'top' ? styles.popoverTop : ''}`.trim()}
          data-placement={placement}
        >
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
