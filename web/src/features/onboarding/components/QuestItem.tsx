import { motion, useReducedMotion } from 'framer-motion';
import { memo } from 'react';

import type { MissionDef } from '../types.js';

import styles from './QuestItem.module.css';
import { QuestSeal } from './QuestSeal.js';

export interface QuestItemProps {
  mission: MissionDef;
  completed: boolean;
  onCompletedAnimation?: () => void;
}

function QuestItemInner({ mission, completed, onCompletedAnimation }: QuestItemProps) {
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
        {completed && (
          <svg
            className={styles.strikethrough}
            aria-hidden="true"
            width="100%"
            height="2"
            preserveAspectRatio="none"
          >
            <motion.line
              x1="0"
              y1="50%"
              x2="100%"
              y2="50%"
              stroke="var(--color-accent, #c0392b)"
              strokeWidth="1.5"
              strokeOpacity="0.7"
              strokeLinecap="round"
              data-testid="strike-line"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={
                prefersReducedMotion ? { duration: 0 } : { duration: 0.32, ease: 'easeOut' }
              }
            />
          </svg>
        )}
      </span>

      <QuestSeal
        completed={completed}
        {...(onCompletedAnimation ? { onAnimationComplete: onCompletedAnimation } : {})}
      />
    </div>
  );
}

export const QuestItem = memo(QuestItemInner, (prev, next) => {
  return prev.mission.id === next.mission.id && prev.completed === next.completed;
});
