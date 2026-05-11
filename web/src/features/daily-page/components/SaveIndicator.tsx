/**
 * SaveIndicator — 4-state autosave pill with PT-BR labels.
 *
 * Decision log:
 * - `dirty` and `saving` show distinct labels (L-MINOR-1, AC-012).
 *   dirty = "Editando…" (debounce window, not yet saving).
 *   saving = "Salvando…" (PUT in-flight).
 *   This accurately reflects the 4 AC-012 states without collapsing them.
 * - Uses role="status" (implicit aria-live="polite" + aria-atomic="true").
 *   Explicit attributes added for screen reader compatibility across impls.
 *
 * Covers: AC-009 (saving label), AC-012 (4 states), AC-027 (retry button), AC-040 (aria-live).
 */

import type { SaveStatus } from '../types.js';

import styles from './SaveIndicator.module.css';

export interface SaveIndicatorProps {
  saveStatus: SaveStatus;
  onRetry: () => void;
}

const LABELS: Record<SaveStatus, string> = {
  saved: 'Salvo',
  dirty: 'Editando…',
  saving: 'Salvando…',
  error: 'Erro ao salvar',
};

export function SaveIndicator({ saveStatus, onRetry }: SaveIndicatorProps) {
  return (
    <span className={styles.wrapper}>
      {/* AC-040: aria-live="polite" + aria-atomic="true" for screen readers */}
      <span
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={`${styles.label} ${styles[`label--${saveStatus}`]}`}
      >
        {LABELS[saveStatus]}
      </span>
      {/* AC-027: retry button — only in error state */}
      {saveStatus === 'error' && (
        <button
          type="button"
          className={styles.retryButton}
          onClick={onRetry}
          aria-label="Tentar novamente"
        >
          Tentar novamente
        </button>
      )}
    </span>
  );
}
