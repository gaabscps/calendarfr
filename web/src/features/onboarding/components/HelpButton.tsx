import { IconButton } from '@/shared/components/IconButton';

import { SealPlaceholder } from '../assets/SealPlaceholder.js';

import styles from './HelpButton.module.css';

export interface HelpButtonProps {
  onClick: () => void;
  ariaLabel?: string;
}

export function HelpButton({ onClick, ariaLabel = 'Abrir roteiro do diário' }: HelpButtonProps) {
  return (
    <IconButton
      aria-label={ariaLabel}
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={styles.button}
    >
      <SealPlaceholder />
    </IconButton>
  );
}
