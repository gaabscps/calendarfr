import { PaperSheet } from '@/shared/components/PaperSheet';

import styles from './AuthLoadingSplash.module.css';

/**
 * Full-viewport loading splash shown while initial Supabase session is being
 * resolved. Uses PaperSheet (no className prop) wrapped in sizing div.
 */
export function AuthLoadingSplash() {
  return (
    <div className={styles.container}>
      <div className={styles.sheet}>
        <PaperSheet ariaLabel="Carregando sessão">
          <div role="status" aria-label="Carregando" className={styles.spinner} />
        </PaperSheet>
      </div>
    </div>
  );
}
