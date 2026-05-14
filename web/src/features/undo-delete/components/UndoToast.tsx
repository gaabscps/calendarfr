/**
 * UndoToast — FEAT-022 (undo-delete) AC-001, AC-002.
 *
 * Presentational pill that shows a label + countdown + "Desfazer" action.
 * Stateless: parent controls visibility/lifecycle via the queue hook.
 */

import type { JSX } from 'react';

import styles from './UndoToast.module.css';

export interface UndoToastProps {
  /** Texto descritivo do item removido (ex.: "Prioridade removida"). */
  label: string;
  /** Segundos restantes antes da expiração da janela de undo. */
  secondsRemaining: number;
  /** Callback disparado quando o usuário clica em "Desfazer". */
  onUndo: () => void;
}

export function UndoToast({ label, secondsRemaining, onUndo }: UndoToastProps): JSX.Element {
  const seconds = Math.max(0, Math.ceil(secondsRemaining));

  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span className={styles.label}>{label}</span>
      <button
        type="button"
        className={styles.undoButton}
        aria-label="Desfazer remoção"
        onClick={onUndo}
      >
        Desfazer
      </button>
      <span className={styles.countdown} aria-hidden="true">
        {seconds}s
      </span>
    </div>
  );
}
