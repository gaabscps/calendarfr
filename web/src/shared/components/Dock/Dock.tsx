import type { ReactNode } from 'react';

import styles from './Dock.module.css';

export interface DockProps {
  children: ReactNode;
  'aria-label'?: string;
}

export function Dock({ children, 'aria-label': ariaLabel = 'Dock' }: DockProps) {
  return (
    <nav aria-label={ariaLabel} className={styles.dock}>
      {children}
    </nav>
  );
}
