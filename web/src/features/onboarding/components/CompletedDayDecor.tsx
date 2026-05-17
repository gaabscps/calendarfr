import { motion, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

import { GoldenSeal } from '../assets/GoldenSeal.js';
import { WashiTape } from '../assets/WashiTape.js';
import { useOnboardingState } from '../hooks/useOnboardingState.js';
import { MISSION_IDS } from '../lib/missions.js';
import type { MissionId } from '../types.js';

import styles from './CompletedDayDecor.module.css';

interface CompletedDayDecorProps {
  date: string;
}

export function CompletedDayDecor({ date }: CompletedDayDecorProps) {
  const { state } = useOnboardingState();
  const dateSlice: Record<MissionId, string | null> =
    state.progressByDate[date] ?? ({} as Record<MissionId, string | null>);
  const isCompleteForDay = MISSION_IDS.every((id) => dateSlice[id] != null);

  const wasCompleteOnMountRef = useRef(isCompleteForDay);
  const prefersReducedMotion = useReducedMotion();

  if (!isCompleteForDay) return null;

  const skipEntrance = wasCompleteOnMountRef.current;

  if (prefersReducedMotion) {
    return (
      <div className={styles.decor} aria-hidden="true">
        <motion.div
          className={styles.washiLeft}
          initial={skipEntrance ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          data-testid="washi-left"
        >
          <WashiTape position="topLeft" />
        </motion.div>
        <motion.div
          className={styles.washiRight}
          initial={skipEntrance ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          data-testid="washi-right"
        >
          <WashiTape position="topRight" />
        </motion.div>
        <motion.div
          className={styles.seal}
          initial={skipEntrance ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          data-testid="golden-seal"
        >
          <GoldenSeal />
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.decor} aria-hidden="true">
      <motion.div
        className={styles.washiLeft}
        initial={skipEntrance ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18 }}
        data-testid="washi-left"
      >
        <WashiTape position="topLeft" />
      </motion.div>
      <motion.div
        className={styles.washiRight}
        initial={skipEntrance ? false : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.1 }}
        data-testid="washi-right"
      >
        <WashiTape position="topRight" />
      </motion.div>
      <motion.div
        className={styles.seal}
        initial={skipEntrance ? false : { scale: 0, rotate: 0 }}
        animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.3 }}
        data-testid="golden-seal"
      >
        <GoldenSeal />
      </motion.div>
    </div>
  );
}
