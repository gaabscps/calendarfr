import type { ReactNode } from 'react';

import styles from './PaperSheet.module.css';

export interface PaperSheetProps {
  children: ReactNode;
  as?: 'div' | 'section' | 'article';
  padded?: boolean;
  ruled?: boolean;
  ariaLabel?: string;
}

export function PaperSheet({
  children,
  as: Tag = 'div',
  padded = true,
  ruled = true,
  ariaLabel,
}: PaperSheetProps) {
  const className = [styles.sheet, padded && styles.padded, ruled && styles.ruled]
    .filter(Boolean)
    .join(' ');

  return (
    <Tag className={className} aria-label={ariaLabel} data-paper-sheet="true">
      {children}
    </Tag>
  );
}
