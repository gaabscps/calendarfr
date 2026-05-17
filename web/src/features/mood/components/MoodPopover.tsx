/**
 * MoodPopover — gatilho compacto + popover contendo o MoodPicker completo.
 *
 * Pensado para a header (ao lado da data): em vez de ocupar uma linha inteira
 * com os 6 chips abertos, mostra um chip único com o humor selecionado (ou
 * placeholder "humor?"). Clicar abre o picker num popover ancorado abaixo do
 * trigger. Toda a a11y do MoodPicker (radiogroup, roving tabindex, Esc) é
 * preservada porque o componente original é renderizado dentro do popover.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';

import { findMoodOption } from '../lib/moodOptions.js';
import type { MoodPickerValue } from '../types.js';

import { MoodPicker } from './MoodPicker.js';
import styles from './MoodPopover.module.css';

export interface MoodPopoverProps {
  value: MoodPickerValue;
  onChange: (next: MoodPickerValue) => void;
}

export function MoodPopover({ value, onChange }: MoodPopoverProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  // Click-away + Escape fecham o popover.
  useEffect(() => {
    if (!open) return;
    function handleClickAway(e: MouseEvent) {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [open]);

  const selected = findMoodOption(value);

  const handleChange = useCallback(
    (next: MoodPickerValue) => {
      onChange(next);
      // Fecha após seleção — toggling de mesma opção (deseleção) também fecha.
      setOpen(false);
      triggerRef.current?.focus();
    },
    [onChange],
  );

  const triggerLabel =
    selected !== null
      ? `Humor do dia: ${selected.label}. Clique para mudar.`
      : 'Definir humor do dia';

  return (
    <div className={styles.wrapper} data-onboarding-target="mood">
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label={triggerLabel}
        style={selected !== null ? { backgroundColor: selected.color } : undefined}
        data-selected={selected !== null}
      >
        <span className={styles.emoji} aria-hidden="true">
          {selected?.emoji ?? '🙂'}
        </span>
        {selected !== null ? (
          <span className={styles.label}>{selected.label}</span>
        ) : (
          <span className={styles.placeholder}>humor?</span>
        )}
      </button>

      {open && (
        <div
          ref={popoverRef}
          id={popoverId}
          className={styles.popover}
          role="dialog"
          aria-label="Escolha de humor"
        >
          <MoodPicker value={value} onChange={handleChange} />
        </div>
      )}
    </div>
  );
}
