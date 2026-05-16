import { useState } from 'react';

import { ENERGY_PALETTE } from '../lib/palette.js';
import { stickerRotation } from '../lib/stickerRotation.js';

import styles from './EnergyPalette.module.css';

export interface EnergyPaletteProps {
  current: string | null;
  onPick: (emoji: string) => void;
  onOpenFullPicker: () => void;
}

const PLACEHOLDER = 'Passe o mouse num adesivo';

/**
 * Folha de adesivos do caderno: título manuscrito, grid 4×3 de stickers
 * com rotação determinística, slot fixo de descrição (aria-live), e link
 * "+ outros emojis" no rodapé.
 *
 * State local: hoveredDescription — texto a exibir no slot quando o
 * usuário foca/passa o mouse em um sticker. Volta ao PLACEHOLDER em
 * blur/mouseleave.
 *
 * Acessibilidade: role=menu container; role=menuitemradio + aria-checked
 * nos 12 stickers; role=menuitem no "+"; slot tem aria-live="polite".
 */
export function EnergyPalette({ current, onPick, onOpenFullPicker }: EnergyPaletteProps) {
  const [hoveredDescription, setHoveredDescription] = useState<string | null>(null);

  return (
    <div role="menu" className={styles.popover} aria-label="Paleta de energy">
      <div className={styles.title}>Como foi essa hora?</div>

      <div className={styles.grid}>
        {ENERGY_PALETTE.map((entry, index) => (
          <button
            key={entry.emoji}
            type="button"
            role="menuitemradio"
            className={styles.sticker}
            style={{ '--rot': `${stickerRotation(index)}deg` } as React.CSSProperties}
            aria-label={entry.label}
            aria-checked={current === entry.emoji}
            onClick={() => onPick(entry.emoji)}
            onMouseEnter={() => setHoveredDescription(entry.description)}
            onMouseLeave={() => setHoveredDescription(null)}
            onFocus={() => setHoveredDescription(entry.description)}
            onBlur={() => setHoveredDescription(null)}
          >
            <span className={styles.stickerEmoji}>{entry.emoji}</span>
            <span className={styles.stickerLabel}>{entry.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.descriptionSlot} aria-live="polite">
        {hoveredDescription ?? <span className={styles.placeholder}>{PLACEHOLDER}</span>}
      </div>

      <button type="button" role="menuitem" className={styles.moreLink} onClick={onOpenFullPicker}>
        + outros emojis
      </button>
    </div>
  );
}
