/**
 * FEAT-022 T-006 — ConfirmDeleteButton (2-click inline confirmation).
 *
 * Estado interno: 'idle' | 'confirming'.
 * - Idle click → confirming + arma timer 3s; expiração reverte sem confirmar.
 * - Confirming click → onConfirm() + reset.
 * - pointerdown fora do botão → cancela.
 * - blur com relatedTarget fora (Tab away) → cancela.
 *
 * Cobre AC-006, AC-007, AC-008, AC-009.
 */

import { useEffect, useRef, useState } from 'react';
import type { FocusEvent, ReactNode } from 'react';

import styles from './ConfirmDeleteButton.module.css';

export interface ConfirmDeleteButtonProps {
  onConfirm: () => void;
  idleLabel?: string;
  confirmingLabel?: string;
  idleAriaLabel?: string;
  confirmingAriaLabel?: string;
  children?: ReactNode;
  /**
   * `string | undefined` (not `string?`) so callers can pass `styles.xxx`
   * from CSS modules under `exactOptionalPropertyTypes: true`.
   */
  className?: string | undefined;
}

const CONFIRM_TIMEOUT_MS = 3000;

type State = 'idle' | 'confirming';

export function ConfirmDeleteButton({
  onConfirm,
  idleLabel = 'Remover',
  confirmingLabel = 'Confirmar?',
  idleAriaLabel,
  confirmingAriaLabel = 'Confirmar remoção',
  children,
  className,
}: ConfirmDeleteButtonProps) {
  const [state, setState] = useState<State>('idle');
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearArmedTimer = () => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const resetToIdle = () => {
    clearArmedTimer();
    setState('idle');
  };

  // Arm timer + outside pointerdown listener while confirming.
  useEffect(() => {
    if (state !== 'confirming') {
      return;
    }

    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setState('idle');
    }, CONFIRM_TIMEOUT_MS);

    const handlePointerDown = (event: PointerEvent) => {
      const node = buttonRef.current;
      if (!node) {
        return;
      }
      const target = event.target as Node | null;
      if (target && node.contains(target)) {
        return;
      }
      clearArmedTimer();
      setState('idle');
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      clearArmedTimer();
    };
  }, [state]);

  // Cleanup on unmount (covers idle-state mounted timers — defensive).
  useEffect(() => {
    return () => {
      clearArmedTimer();
    };
  }, []);

  const handleClick = () => {
    if (state === 'idle') {
      setState('confirming');
      return;
    }
    // confirming → confirm
    clearArmedTimer();
    setState('idle');
    onConfirm();
  };

  const handleBlur = (event: FocusEvent<HTMLButtonElement>) => {
    if (state !== 'confirming') {
      return;
    }
    const next = event.relatedTarget as Node | null;
    const node = buttonRef.current;
    if (next && node?.contains(next)) {
      return;
    }
    resetToIdle();
  };

  const isConfirming = state === 'confirming';
  const stateClass = isConfirming ? styles.confirming : styles.idle;
  const classList = [styles.button, stateClass, className].filter(Boolean).join(' ');
  const ariaLabel = isConfirming ? confirmingAriaLabel : (idleAriaLabel ?? idleLabel);

  return (
    <button
      ref={buttonRef}
      type="button"
      className={classList}
      aria-pressed={isConfirming}
      aria-label={ariaLabel}
      onClick={handleClick}
      onBlur={handleBlur}
    >
      {isConfirming ? confirmingLabel : (children ?? idleLabel)}
    </button>
  );
}
