/**
 * PageNavigator — header section with date, nav buttons, and save indicator.
 *
 * Covers: AC-038 (header region), AC-039 (aria-live on date), AC-041
 * (aria-label + aria-keyshortcuts on nav buttons), AC-042 (focus visible).
 *
 * Design: renders as <section role="region" aria-label="Cabeçalho do dia">
 * (not <header role="banner">) because DailyPage may be embedded inside a
 * layout that already has a landmark banner. role="region" with aria-label
 * satisfies AC-038 and is safe for nested contexts.
 */

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
}

export function PageNavigator({
  date,
  saveStatus,
  isAnimating,
  goToPrev,
  goToNext,
  onRetry,
}: PageNavigatorProps) {
  return (
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

      {/* AC-039: date heading announced on change */}
      <div className={styles.center}>
        <h1 className={styles.dateHeading} aria-live="polite">
          {formatDateLong(date)}
        </h1>

        <SaveIndicator saveStatus={saveStatus} onRetry={onRetry} />
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
  );
}
