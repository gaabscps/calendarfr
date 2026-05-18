import type { DailyPageData } from '@calendarfr/shared';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { SparkleBurst } from '@/shared/components/SparkleBurst';

import { GoldenSeal } from '../assets/GoldenSeal.js';
import { SealPlaceholder } from '../assets/SealPlaceholder.js';
import { useOnboardingState } from '../hooks/useOnboardingState.js';
import { selectVisibleMissionCompletion } from '../lib/deriveMissionProgress.js';
import { MISSION_IDS } from '../lib/missions.js';
import { setReadonlyVisible } from '../lib/readonlyController.js';
import type { MissionId } from '../types.js';

import styles from './MissionSealSlot.module.css';

interface MissionSealSlotProps {
  date: string;
  data?: DailyPageData | null;
}

/**
 * Único ponto de entrada visual+clicável para o roteiro de missões.
 * - Dia incompleto: placeholder tracejado com progresso N/total (abre sticky).
 * - Dia 7/7: GoldenSeal "Boa!" clicável (abre a sticky em modo readonly).
 *
 * Substitui o antigo HelpButton (no PageNavigator) e o CompletedDayDecor
 * (que só aparecia no 7/7).
 */
export function MissionSealSlot({ date, data = null }: MissionSealSlotProps) {
  const { state, reopen } = useOnboardingState();
  const dateSlice: Record<MissionId, string | null> =
    state.progressByDate[date] ?? ({} as Record<MissionId, string | null>);
  const visibleSlice = selectVisibleMissionCompletion(data, dateSlice);
  const completedCount = MISSION_IDS.filter((id) => visibleSlice[id] != null).length;
  const isCompleteForDay = completedCount === MISSION_IDS.length;

  const wasCompleteOnMountRef = useRef(isCompleteForDay);
  const prefersReducedMotion = useReducedMotion();
  const lastDateRef = useRef(date);

  useEffect(() => {
    // MissionSealSlot fica montado entre dias (PageNavigator preserva a
    // instância). Sem este reset, o ref "já estava 7/7 no mount" captura o
    // estado do primeiro dia e impede a animação/sparkle nos dias seguintes.
    if (lastDateRef.current !== date) {
      wasCompleteOnMountRef.current = isCompleteForDay;
      lastDateRef.current = date;
    }
  }, [isCompleteForDay, date]);

  function handleClick(): void {
    if (state.status === 'dismissed' || state.status === 'pending') {
      reopen();
    } else {
      setReadonlyVisible(true);
    }
  }

  const skipEntrance = wasCompleteOnMountRef.current;
  const showSparkle = isCompleteForDay && !wasCompleteOnMountRef.current && !prefersReducedMotion;

  const ariaLabel = isCompleteForDay
    ? 'Roteiro concluído — abrir para revisar'
    : `Abrir roteiro de missões (${completedCount} de ${MISSION_IDS.length})`;

  const sealInitial = isCompleteForDay
    ? prefersReducedMotion
      ? skipEntrance
        ? false
        : { opacity: 0 }
      : skipEntrance
        ? false
        : { scale: 0, rotate: 0 }
    : false;

  const sealAnimate = isCompleteForDay
    ? prefersReducedMotion
      ? { opacity: 1 }
      : { scale: 1, rotate: [0, -8, 8, 0] }
    : { opacity: 1, scale: 1 };

  const sealTransition = isCompleteForDay
    ? prefersReducedMotion
      ? { duration: 0.2 }
      : { type: 'spring', stiffness: 220, damping: 16, delay: 0.3 }
    : { duration: 0.15 };

  return (
    <div className={styles.slot}>
      <button
        type="button"
        aria-label={ariaLabel}
        className={styles.sealButton}
        onClick={handleClick}
        data-testid="missionSealSlot-button"
      >
        <motion.span
          className={styles.sealWrap}
          initial={sealInitial}
          animate={sealAnimate}
          transition={sealTransition}
          data-testid={isCompleteForDay ? 'golden-seal' : 'seal-placeholder'}
        >
          {isCompleteForDay ? (
            <GoldenSeal size={64} />
          ) : (
            <SealPlaceholder size={60} completed={completedCount} total={MISSION_IDS.length} />
          )}
        </motion.span>
        {showSparkle && (
          <span className={styles.sparkleAnchor}>
            <SparkleBurst count={6} size={96} color="#f5854b" />
          </span>
        )}
      </button>
    </div>
  );
}
