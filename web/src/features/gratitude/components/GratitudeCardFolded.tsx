import type { GratitudeItem } from '@calendarfr/shared';
import type { KeyboardEvent } from 'react';

import { countFilled } from '../lib/countFilled.js';

import styles from './GratitudeCardFolded.module.css';
import { GratitudeWashiTape } from './GratitudeWashiTape.js';

export interface GratitudeCardFoldedProps {
  value: GratitudeItem[];
  onOpen: () => void;
  rootRef?: React.RefObject<HTMLDivElement | null>;
}

function filledLabel(count: number): string {
  if (count === 0) return 'vazio';
  if (count === 1) return '1 escrita';
  return `${String(count)} escritas`;
}

export function GratitudeCardFolded({ value, onOpen, rootRef }: GratitudeCardFoldedProps) {
  const filled = countFilled(value);
  const ariaLabel = `Abrir cartão de gratidão (${filledLabel(filled)})`;

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      ref={rootRef}
      role="button"
      aria-expanded={false}
      aria-label={ariaLabel}
      tabIndex={0}
      className={styles.root}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      <GratitudeWashiTape side="left" rotation={12} />
      <GratitudeWashiTape side="right" rotation={12} />
      <span className={styles.label}>Gratidão</span>
      <span className={styles.indicator}>{filledLabel(filled)}</span>
    </div>
  );
}
