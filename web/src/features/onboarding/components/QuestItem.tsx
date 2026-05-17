import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import type { MissionDef, MissionId } from '../types.js';

import { QuestActionButton } from './QuestActionButton.js';
import styles from './QuestItem.module.css';
import { QuestSeal } from './QuestSeal.js';

export interface QuestItemProps {
  mission: MissionDef;
  completed: boolean;
  onCompletedAnimation?: () => void;
  onActionClick?: (missionId: MissionId) => void;
}

function QuestItemInner({
  mission,
  completed,
  onCompletedAnimation,
  onActionClick,
}: QuestItemProps) {
  const prefersReducedMotion = useReducedMotion();
  const statusLabel = completed ? 'concluída' : 'pendente';
  const ariaLabel = `${mission.label}, ${statusLabel}`;

  const completedIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        fill="var(--color-accent, #c0392b)"
        stroke="var(--color-accent, #c0392b)"
        strokeWidth="1.5"
      />
      <path
        d="M4 8.5l2.5 2.5 5.5-5"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  const pendingIcon = (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect
        x="1"
        y="1"
        width="14"
        height="14"
        rx="2"
        stroke="var(--color-ink-muted, #9a8a72)"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
    </svg>
  );

  return (
    <div className={styles.item} role="listitem" aria-label={ariaLabel}>
      <motion.span
        className={styles.icon}
        aria-hidden="true"
        animate={{ opacity: completed ? 1 : 0.6 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.22 }}
      >
        {completed ? completedIcon : pendingIcon}
      </motion.span>

      <span className={styles.labelWrapper}>
        <span className={styles.label}>{mission.label}</span>
        <AnimatePresence>
          {completed && (
            <motion.svg
              className={styles.strikethrough}
              aria-hidden="true"
              width="100%"
              height="2"
              viewBox="0 0 100 2"
              preserveAspectRatio="none"
              initial={false}
            >
              <motion.path
                d="M 2 1 Q 25 0.2, 50 1 T 98 0.8"
                stroke="var(--color-accent, #c0392b)"
                strokeWidth="1.5"
                strokeOpacity="0.7"
                strokeLinecap="round"
                fill="none"
                data-testid="strike-line"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                exit={{ pathLength: 0 }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.45, ease: 'easeOut', delay: 0.1 }
                }
              />
            </motion.svg>
          )}
        </AnimatePresence>
      </span>

      <QuestActionButton
        missionId={mission.id}
        missionLabel={mission.label}
        onClick={() => onActionClick?.(mission.id)}
      />

      <QuestSeal
        completed={completed}
        {...(onCompletedAnimation ? { onAnimationComplete: onCompletedAnimation } : {})}
      />
    </div>
  );
}

export const QuestItem = memo(QuestItemInner, (prev, next) => {
  return (
    prev.mission.id === next.mission.id &&
    prev.completed === next.completed &&
    prev.onActionClick === next.onActionClick
  );
});
