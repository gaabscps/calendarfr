/**
 * LoadErrorScreen — full-screen error display for GET failures.
 *
 * AC-030: When GET returns error, show obvious error UI with Recarregar button.
 * Not a subtle indicator — must be visually dominant so user knows they can retry.
 */

import styles from './LoadErrorScreen.module.css';

export interface LoadErrorScreenProps {
  error: Error;
  onReload: () => void;
}

export function LoadErrorScreen({ error, onReload }: LoadErrorScreenProps) {
  return (
    <div
      className={styles.screen}
      data-testid="load-error-screen"
      role="alert"
      aria-live="assertive"
    >
      <span className={styles.icon} aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          width="48"
          height="48"
          fill="currentColor"
          focusable="false"
        >
          <path d="M1 21L12 2l11 19H1zm11-3h.01v-1.5H12V18zm0-2.5h.01V10H12v5.5z" />
        </svg>
      </span>
      <h2 className={styles.title}>Erro ao carregar o dia</h2>
      <p className={styles.message}>{error.message || 'Não foi possível carregar os dados.'}</p>
      <button
        type="button"
        className={styles.reloadButton}
        onClick={onReload}
        aria-label="Recarregar a página do dia"
      >
        Recarregar
      </button>
    </div>
  );
}
