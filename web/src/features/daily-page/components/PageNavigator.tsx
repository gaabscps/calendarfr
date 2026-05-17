/**
 * PageNavigator — header section with date, nav buttons, and save indicator.
 *
 * Covers: AC-038 (header region), AC-039 (aria-live on date), AC-041
 * (aria-label + aria-keyshortcuts on nav buttons), AC-042 (focus visible).
 *
 * FEAT-017 (Decisions 4 + 7): the visible header row is exactly 48px tall
 * (chevrons via IconButton size="md" + date heading line-height: 48), and
 * the block contributes 72px total (48 + 24 margin-bottom) so that the
 * GridContainer starts at y = 96px relative to the PaperSheet (4 × baseline).
 * SaveIndicator is rendered as an absolute overlay anchored on PaperSheet —
 * it does NOT consume a grid row inside the navigator (AC-007).
 *
 * Design: renders as <section role="region" aria-label="Cabeçalho do dia">
 * (not <header role="banner">) because DailyPage may be embedded inside a
 * layout that already has a landmark banner. role="region" with aria-label
 * satisfies AC-038 and is safe for nested contexts.
 */

import type { ReactNode } from 'react';

import { IconButton } from '@/shared/components/IconButton';

import { KEYBOARD_SHORTCUTS } from '../hooks/usePageNavigation.js';
import { formatDateLong } from '../lib/formatDate.js';
import type { SaveStatus } from '../types.js';

import styles from './PageNavigator.module.css';
import { SaveIndicator } from './SaveIndicator.js';

export interface PageNavigatorProps {
  date: string;
  saveStatus: SaveStatus;
  isAnimating: boolean;
  goToPrev: () => void | Promise<void>;
  goToNext: () => void | Promise<void>;
  onRetry: () => void;
  /**
   * Slot opcional renderizado ao lado da data — usado para o MoodPopover
   * compacto. Mantém o picker visível mas sem ocupar uma linha inteira.
   */
  moodSlot?: ReactNode;
  /**
   * Slot opcional renderizado abaixo da data — usado pra IntentionChip
   * (intenção do dia, manhã do daily ritual loop).
   */
  intentionSlot?: ReactNode;
  /**
   * Slot opcional renderizado no centro do header (após intentionSlot) —
   * usado pelo MissionSealSlot do onboarding pra ficar visualmente colado
   * na data, em vez de flutuar num canto.
   */
  sealSlot?: ReactNode;
}

export function PageNavigator({
  date,
  saveStatus,
  isAnimating,
  goToPrev,
  goToNext,
  onRetry,
  moodSlot,
  intentionSlot,
  sealSlot,
}: PageNavigatorProps) {
  return (
    <>
      {/* AC-007: SaveIndicator rendered as absolute overlay anchored on PaperSheet,
          outside the navigator flow so it does not steal a 24px row. */}
      <SaveIndicator saveStatus={saveStatus} onRetry={onRetry} />

      <section className={styles.header} role="region" aria-label="Cabeçalho do dia">
        <IconButton
          aria-label="Dia anterior"
          aria-keyshortcuts={KEYBOARD_SHORTCUTS.prev}
          variant="ghost"
          size="md"
          disabled={isAnimating}
          onClick={() => {
            void goToPrev();
          }}
        >
          ‹
        </IconButton>

        {/* AC-039: date heading announced on change.
            Todos os tokens (data + mood + intention) ficam INLINE na mesma
            row pra preservar o baseline 48px do header (= 2 × --baseline). */}
        <div className={styles.center}>
          <h1 className={styles.dateHeading} aria-live="polite">
            {formatDateLong(date)}
          </h1>
          {moodSlot !== undefined && <div className={styles.moodSlot}>{moodSlot}</div>}
          {intentionSlot !== undefined && (
            <div className={styles.intentionSlot}>{intentionSlot}</div>
          )}
          {sealSlot !== undefined && <div className={styles.sealSlot}>{sealSlot}</div>}
        </div>

        <IconButton
          aria-label="Próximo dia"
          aria-keyshortcuts={KEYBOARD_SHORTCUTS.next}
          variant="ghost"
          size="md"
          disabled={isAnimating}
          onClick={() => {
            void goToNext();
          }}
        >
          ›
        </IconButton>
      </section>
    </>
  );
}
