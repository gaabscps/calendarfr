import { ENERGY_PALETTE } from '../lib/palette.js';

import styles from './EnergyPalette.module.css';

export interface EnergyPaletteProps {
  current: string | null;
  onPick: (emoji: string) => void;
  onOpenFullPicker: () => void;
}

/**
 * Grid 4x3 com a paleta curada + botão "+" para o full picker.
 *
 * Acessibilidade: role="menu" no container, role="menuitem" + aria-checked
 * nas opções. Navegação por Tab via foco nativo HTML.
 */
export function EnergyPalette({ current, onPick, onOpenFullPicker }: EnergyPaletteProps) {
  return (
    <div role="menu" className={styles.palette} aria-label="Paleta de energy">
      {ENERGY_PALETTE.map((entry) => (
        <button
          key={entry.emoji}
          type="button"
          role="menuitem"
          className={styles.item}
          aria-label={entry.label}
          aria-checked={current === entry.emoji}
          onClick={() => onPick(entry.emoji)}
        >
          {entry.emoji}
        </button>
      ))}
      <button
        type="button"
        role="menuitem"
        className={`${styles.item} ${styles.more}`}
        aria-label="Mais emojis"
        onClick={onOpenFullPicker}
      >
        +
      </button>
    </div>
  );
}
