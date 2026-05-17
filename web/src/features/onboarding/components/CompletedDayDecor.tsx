import type { DailyPageData } from '@calendarfr/shared';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { SparkleBurst } from '@/shared/components/SparkleBurst';
import { useSoundController } from '@/shared/sound/useSoundController';

import { GoldenSeal } from '../assets/GoldenSeal.js';
import { useOnboardingState } from '../hooks/useOnboardingState.js';
import { selectVisibleMissionCompletion } from '../lib/deriveMissionProgress.js';
import { MISSION_IDS } from '../lib/missions.js';
import type { MissionId } from '../types.js';

import styles from './CompletedDayDecor.module.css';

interface CompletedDayDecorProps {
  date: string;
  data?: DailyPageData | null;
}

export function CompletedDayDecor({ date, data = null }: CompletedDayDecorProps) {
  const { state } = useOnboardingState();
  const dateSlice: Record<MissionId, string | null> =
    state.progressByDate[date] ?? ({} as Record<MissionId, string | null>);
  // Same intersection logic as OnboardingQuest: a day is decoratively "complete" only when
  // every mission's persisted timestamp AND current content condition still hold.
  const visibleSlice = selectVisibleMissionCompletion(data, dateSlice);
  const isCompleteForDay = MISSION_IDS.every((id) => visibleSlice[id] != null);

  const wasCompleteOnMountRef = useRef(isCompleteForDay);
  const prefersReducedMotion = useReducedMotion();
  const { play } = useSoundController();
  const playedDayCompleteRef = useRef(wasCompleteOnMountRef.current);

  useEffect(() => {
    if (isCompleteForDay && !playedDayCompleteRef.current) {
      play('day-complete');
      playedDayCompleteRef.current = true;
    }
  }, [isCompleteForDay, play]);

  if (!isCompleteForDay) return null;

  const skipEntrance = wasCompleteOnMountRef.current;
  const showSparkle = !wasCompleteOnMountRef.current && !prefersReducedMotion;

  if (prefersReducedMotion) {
    return (
      <div className={styles.decor} aria-hidden="true">
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
        className={styles.seal}
        initial={skipEntrance ? false : { scale: 0, rotate: 0 }}
        animate={{ scale: 1, rotate: [0, -8, 8, 0] }}
        transition={{ type: 'spring', stiffness: 220, damping: 16, delay: 0.3 }}
        data-testid="golden-seal"
      >
        <GoldenSeal />
        {showSparkle && (
          <span className={styles.sparkleAnchor}>
            <SparkleBurst count={6} size={96} color="#f5854b" />
          </span>
        )}
      </motion.div>
    </div>
  );
}
