import type { GratitudeItem } from '@calendarfr/shared';
import type { KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef } from 'react';

import { RichTextBlock } from '@/features/rich-text-line';
import type { RichTextEditorRef } from '@/features/rich-text-line';

import { GRATITUDE_SLOTS, normalizeGratitude, trimTrailing } from '../lib/normalize.js';

import styles from './GratitudeCardUnfolded.module.css';
import { GratitudeWashiTape } from './GratitudeWashiTape.js';

export type GratitudeBodyTarget = 'open' | 'closed';

export interface GratitudeCardUnfoldedProps {
  value: GratitudeItem[];
  onChange: (next: GratitudeItem[]) => void;
  onClose: () => void;
  firstEditorRef?: RichTextEditorRef;
  /** No-op visually (no fold animation). Kept for state-machine compatibility. */
  bodyTarget?: GratitudeBodyTarget;
  /** Fired on mount and on bodyTarget change so the parent state machine can advance. */
  onBodyAnimationComplete?: () => void;
  /** Accepted for API compatibility; ignored (no animation). */
  prefersReduced?: boolean;
}

const PLACEHOLDERS = ['algo que me marcou…', 'alguém especial hoje…', 'um pequeno bom momento…'];

export function GratitudeCardUnfolded({
  value,
  onChange,
  onClose,
  firstEditorRef,
  bodyTarget = 'open',
  onBodyAnimationComplete,
}: GratitudeCardUnfoldedProps) {
  const slots = useMemo(() => normalizeGratitude(value), [value]);

  const editorRefsRef = useRef<Map<string, RichTextEditorRef>>(new Map());
  function getEditorRef(id: string, index: number): RichTextEditorRef {
    if (index === 0 && firstEditorRef !== undefined) return firstEditorRef;
    let ref = editorRefsRef.current.get(id);
    if (!ref) {
      ref = { current: null };
      editorRefsRef.current.set(id, ref);
    }
    return ref;
  }

  function handleChangeText(index: number, html: string) {
    const next = slots.map((item, i) => (i === index ? { ...item, text: html } : item));
    onChange(trimTrailing(next));
  }

  function handleContainerKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  // Drives state-machine advancement: fires synchronously every time bodyTarget
  // changes (and on mount). No visual animation — transitions are instant.
  useEffect(() => {
    onBodyAnimationComplete?.();
  }, [bodyTarget, onBodyAnimationComplete]);

  return (
    <div aria-label="Gratidão do dia" className={styles.root} onKeyDown={handleContainerKeyDown}>
      <GratitudeWashiTape side="left" rotation={12} />
      <GratitudeWashiTape side="right" rotation={12} />
      <div className={styles.header}>
        <span className={styles.title}>Gratidão</span>
        <button
          type="button"
          aria-label="Dobrar cartão de gratidão"
          aria-expanded={true}
          className={styles.closeButton}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <ul className={styles.list}>
        {slots.map((item, index) => (
          <li key={item.id} className={styles.item}>
            <span aria-hidden="true" className={styles.bullet}>
              ♡
            </span>
            <div className={styles.editor}>
              <RichTextBlock
                value={item.text}
                onChange={(html) => handleChangeText(index, html)}
                placeholder={PLACEHOLDERS[index] ?? 'algo bom de hoje…'}
                ariaLabel={`Gratidão ${String(index + 1)} de ${String(GRATITUDE_SLOTS)}`}
                editorRef={getEditorRef(item.id, index)}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
