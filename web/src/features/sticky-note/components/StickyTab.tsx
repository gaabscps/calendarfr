import type { StickyColor } from '../types.js';
import { STICKY_COLOR_HEX } from '../types.js';

import styles from './StickyTab.module.css';

interface StickyTabProps {
  color: StickyColor;
  isOpen: boolean;
  isLoading: boolean;
  tabRef: React.RefObject<HTMLButtonElement | null>;
  onToggle: () => void;
}

export function StickyTab({ color, isOpen, isLoading, tabRef, onToggle }: StickyTabProps) {
  const opacity = isLoading ? 0.6 : isOpen ? 1 : 0.55;

  return (
    <button
      ref={tabRef}
      className={styles.tab}
      onClick={onToggle}
      aria-label={`${isOpen ? 'Fechar' : 'Abrir'} post-it ${color.toUpperCase()}`}
      aria-pressed={isOpen}
      style={{ background: STICKY_COLOR_HEX[color], opacity }}
    />
  );
}
