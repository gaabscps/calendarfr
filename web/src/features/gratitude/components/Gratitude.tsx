import type { GratitudeItem } from '@calendarfr/shared';
import { useCallback, useEffect, useRef } from 'react';

import type { RichTextEditorRef } from '@/features/rich-text-line';

import { useFoldState } from '../hooks/useFoldState.js';

import styles from './Gratitude.module.css';
import { GratitudeCardFolded } from './GratitudeCardFolded.js';
import { GratitudeCardUnfolded } from './GratitudeCardUnfolded.js';

export interface GratitudeProps {
  /** Itens do dia — pode ter 0–3 entradas. */
  value: GratitudeItem[];
  /** Emitido a cada edição. Disk format (trimmed trailing). */
  onChange: (next: GratitudeItem[]) => void;
}

export function Gratitude({ value, onChange }: GratitudeProps) {
  const { state, requestOpen, requestClose, onAnimationOpenComplete, onAnimationCloseComplete } =
    useFoldState();

  const foldedRootRef = useRef<HTMLDivElement | null>(null);
  const firstEditorRef: RichTextEditorRef = useRef(null);
  const prevStateRef = useRef<typeof state | null>(null);

  const handleOpen = useCallback(() => {
    requestOpen();
  }, [requestOpen]);

  const handleClose = useCallback(() => {
    requestClose();
  }, [requestClose]);

  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = state;
    if (prev === null) return;
    if (state === 'unfolded' && prev !== 'unfolded') {
      firstEditorRef.current?.commands.focus();
    }
    if (state === 'folded' && prev !== 'folded') {
      foldedRootRef.current?.focus();
    }
  }, [state]);

  const isAnimating = state === 'animating-open' || state === 'animating-close';

  // Both terminal renders + intermediate "animating-*" states show their content
  // (no transition visual). The state machine still flows folded → animating-open →
  // unfolded etc. so contract is preserved; `bodyTarget` and the body-complete callback
  // just advance state instantly via useEffect inside GratitudeCardUnfolded.
  const showFolded = state === 'folded' || isAnimating;
  const showUnfolded = state !== 'folded';

  const bodyTarget: 'open' | 'closed' =
    state === 'unfolded' || state === 'animating-open' ? 'open' : 'closed';

  const handleBodyAnimationComplete = useCallback(() => {
    if (state === 'animating-open') onAnimationOpenComplete();
    else if (state === 'animating-close') onAnimationCloseComplete();
  }, [state, onAnimationOpenComplete, onAnimationCloseComplete]);

  return (
    <div className={styles.container}>
      {showUnfolded && (
        <GratitudeCardUnfolded
          value={value}
          onChange={onChange}
          onClose={handleClose}
          firstEditorRef={firstEditorRef}
          bodyTarget={bodyTarget}
          onBodyAnimationComplete={handleBodyAnimationComplete}
        />
      )}
      {showFolded && !showUnfolded && (
        <GratitudeCardFolded value={value} onOpen={handleOpen} rootRef={foldedRootRef} />
      )}
    </div>
  );
}
