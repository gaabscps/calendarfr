import { motion, useReducedMotion } from 'framer-motion';
import { memo, useId, useMemo, useRef } from 'react';

import styles from './QuestSeal.module.css';

export interface QuestSealProps {
  completed: boolean;
  onAnimationComplete?: () => void;
}

function QuestSealInner({ completed, onAnimationComplete }: QuestSealProps) {
  const prefersReducedMotion = useReducedMotion();
  const uid = useId();

  const randomRotate = useMemo(() => Math.random() * 10 - 5, []);

  // Track whether this seal was already completed when it mounted.
  // Only missions that transition pending→completed during the current lifecycle animate (AC-018).
  const wasCompletedOnMount = useRef(completed);

  const filterId = `seal-filter-${uid}`;
  const strokeColor = completed
    ? 'var(--color-accent, #c0392b)'
    : 'var(--color-ink-muted, #9a8a72)';
  const fillColor = completed ? 'var(--color-accent, #c0392b)' : 'none';
  const strokeDasharray = completed ? 'none' : '3 3';

  const inner = (
    <>
      <defs>
        <filter id={filterId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="2" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="1.2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <circle
        cx="14"
        cy="14"
        r="11"
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth="1.5"
        strokeDasharray={strokeDasharray}
        filter={`url(#${filterId})`}
        opacity={completed ? 0.9 : 1}
      />
    </>
  );

  if (prefersReducedMotion) {
    // Already completed on mount: render static at opacity 1, no entrance fade.
    const reducedInitial = wasCompletedOnMount.current ? { opacity: 1 } : { opacity: 0 };
    const reducedAnimate = { opacity: completed ? 1 : 0 };
    return (
      <span
        className={styles.seal}
        aria-hidden="true"
        data-testid="quest-seal"
        data-completed={String(completed)}
      >
        <motion.svg
          xmlns="http://www.w3.org/2000/svg"
          width="28"
          height="28"
          viewBox="0 0 28 28"
          aria-hidden="true"
          data-testid="quest-seal-motion"
          initial={reducedInitial}
          animate={reducedAnimate}
          transition={{ duration: 0.08 }}
          {...(onAnimationComplete ? { onAnimationComplete } : {})}
        >
          {inner}
        </motion.svg>
      </span>
    );
  }

  // Seal already completed on mount: use scalar animate target with stable initial so
  // framer-motion sees no change and does not drive an entrance animation (AC-018).
  // Seal transitioning pending→completed during this lifecycle: keyframe array for spring overshoot.
  const animateTarget = wasCompletedOnMount.current
    ? { scale: 1, rotate: randomRotate }
    : completed
      ? { scale: [0, 1.15, 1] as number[], rotate: [0, randomRotate] as number[] }
      : { scale: 0, rotate: 0 };

  const initialValue = wasCompletedOnMount.current
    ? { scale: 1, rotate: randomRotate }
    : { scale: 0, rotate: 0 };

  return (
    <span
      className={styles.seal}
      aria-hidden="true"
      data-testid="quest-seal"
      data-completed={String(completed)}
    >
      <motion.svg
        xmlns="http://www.w3.org/2000/svg"
        width="28"
        height="28"
        viewBox="0 0 28 28"
        aria-hidden="true"
        data-testid="quest-seal-motion"
        initial={initialValue}
        animate={animateTarget}
        transition={{ type: 'spring', stiffness: 220, damping: 18, duration: 0.48 }}
        {...(onAnimationComplete ? { onAnimationComplete } : {})}
      >
        {inner}
      </motion.svg>
    </span>
  );
}

export const QuestSeal = memo(QuestSealInner, (prev, next) => prev.completed === next.completed);
