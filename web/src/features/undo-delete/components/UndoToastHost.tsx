/**
 * UndoToastHost — FEAT-022 T-005 (AC-005, AC-012, AC-013).
 *
 * Renderiza a stack vertical de UndoToasts (bottom-center) consumindo o
 * contexto compartilhado da undo queue. Monta um listener `keydown` global
 * enquanto houver entradas na fila e intercepta `Cmd/Ctrl+Z` para desfazer
 * a última entrada (LIFO), exceto quando o foco está dentro de um editor
 * Tiptap (passthrough para o undo nativo do editor).
 *
 * - Retorna `null` quando a queue está vazia (sem DOM/listener).
 * - Container: `role="status"` `aria-live="polite"` para AT announce.
 * - Countdown recalculado via interval (250ms) enquanto a queue não estiver vazia.
 * - `Cmd+Shift+Z` é deixado passar (reservado para redo).
 */

import { useEffect, useRef, useState, type JSX } from 'react';

import { useUndoQueueContext } from '../context/UndoQueueContext';
import type { UndoEntry } from '../types';

import { UndoToast } from './UndoToast';
import styles from './UndoToastHost.module.css';

const TICK_MS = 250;

function computeSecondsRemaining(entry: UndoEntry, now: number): number {
  return Math.ceil((entry.createdAt + entry.ttlMs - now) / 1000);
}

export function UndoToastHost(): JSX.Element | null {
  const { queue, cancelUndo } = useUndoQueueContext();
  const [now, setNow] = useState(() => Date.now());

  // Refs para acesso à última referência dentro do listener global, sem ter
  // que reanexar a cada mudança da queue.
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const cancelUndoRef = useRef(cancelUndo);
  cancelUndoRef.current = cancelUndo;

  const hasEntries = queue.length > 0;

  // Ticker para atualizar countdown enquanto há entradas.
  useEffect(() => {
    if (!hasEntries) {
      return undefined;
    }
    setNow(Date.now());
    const intervalId = setInterval(() => {
      setNow(Date.now());
    }, TICK_MS);
    return (): void => {
      clearInterval(intervalId);
    };
  }, [hasEntries]);

  // Keyboard handler global enquanto há entradas.
  useEffect(() => {
    if (!hasEntries) {
      return undefined;
    }
    function handler(e: KeyboardEvent): void {
      if (e.key !== 'z' && e.key !== 'Z') {
        return;
      }
      const meta = e.metaKey || e.ctrlKey;
      if (!meta || e.shiftKey || e.altKey) {
        return;
      }
      const ae = document.activeElement;
      if (ae instanceof Element && ae.closest('[data-tiptap-editor]')) {
        return; // passthrough para Tiptap
      }
      const current = queueRef.current;
      if (current.length === 0) {
        return;
      }
      e.preventDefault();
      const last = current[current.length - 1];
      if (!last) {
        return;
      }
      cancelUndoRef.current(last.id);
    }
    window.addEventListener('keydown', handler);
    return (): void => {
      window.removeEventListener('keydown', handler);
    };
  }, [hasEntries]);

  if (!hasEntries) {
    return null;
  }

  return (
    <div role="status" aria-live="polite" className={styles.host}>
      {queue.map((entry) => (
        <UndoToast
          key={entry.id}
          label={entry.label}
          secondsRemaining={computeSecondsRemaining(entry, now)}
          onUndo={() => cancelUndo(entry.id)}
        />
      ))}
    </div>
  );
}
