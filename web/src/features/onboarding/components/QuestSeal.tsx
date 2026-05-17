import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { memo, useEffect, useMemo, useRef, useState } from 'react';

import { SparkleBurst } from '@/shared/components/SparkleBurst';
import { useSoundController } from '@/shared/sound/useSoundController';

import { QuestSealSticker } from '../assets/QuestSealSticker.js';

import styles from './QuestSeal.module.css';

export interface QuestSealProps {
  completed: boolean;
  onAnimationComplete?: () => void;
}

function QuestSealInner({ completed, onAnimationComplete }: QuestSealProps) {
  const prefersReducedMotion = useReducedMotion();
  const { play } = useSoundController();
  const randomRotate = useMemo(() => Math.random() * 10 - 5, []);
  const wasCompletedOnMount = useRef(completed);
  const previousCompletedRef = useRef(completed);
  const [burstKey, setBurstKey] = useState(0);

  // pending → completed durante este ciclo (NÃO no mount inicial) dispara o som e remonta
  // o SparkleBurst (key incrementa) para reanimar as partículas a cada novo "apply".
  useEffect(() => {
    const wasJustApplied = previousCompletedRef.current === false && completed === true;
    if (wasJustApplied && !wasCompletedOnMount.current) {
      play('mission-complete');
      setBurstKey((k) => k + 1);
    }
    previousCompletedRef.current = completed;
  }, [completed, play]);

  const applyVariant = prefersReducedMotion
    ? { opacity: 1 }
    : {
        scale: [0, 1.2, 0.95, 1] as number[],
        rotate: [12, randomRotate] as number[],
        y: 0,
        opacity: 1,
      };

  const initialVariant = wasCompletedOnMount.current
    ? prefersReducedMotion
      ? { opacity: 1 }
      : { scale: 1, rotate: randomRotate, y: 0, opacity: 1 }
    : prefersReducedMotion
      ? { opacity: 0 }
      : { scale: 0, rotate: 12, y: -8, opacity: 0 };

  const peelExit = prefersReducedMotion ? { opacity: 0 } : { rotate: 15, x: 4, y: 6, opacity: 0 };

  const transition = prefersReducedMotion
    ? { duration: 0.15 }
    : { type: 'spring', stiffness: 240, damping: 14, duration: 0.5 };

  return (
    <span
      className={styles.seal}
      aria-hidden="true"
      data-testid="quest-seal"
      data-completed={String(completed)}
    >
      <AnimatePresence>
        {completed && (
          <motion.span
            className={styles.stickerWrap}
            data-testid="quest-seal-motion"
            initial={initialVariant}
            animate={applyVariant}
            exit={peelExit}
            transition={transition}
            {...(onAnimationComplete ? { onAnimationComplete } : {})}
          >
            <QuestSealSticker size={28} />
          </motion.span>
        )}
      </AnimatePresence>

      {burstKey > 0 && completed && !prefersReducedMotion && (
        <SparkleBurst key={burstKey} count={4} size={44} />
      )}
    </span>
  );
}

export const QuestSeal = memo(QuestSealInner, (prev, next) => prev.completed === next.completed);
