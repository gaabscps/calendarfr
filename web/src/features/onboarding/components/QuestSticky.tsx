import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, type ReactNode } from 'react';

import { MuteToggle } from '@/shared/components/MuteToggle';
import { useSoundController } from '@/shared/sound/useSoundController';

import styles from './QuestSticky.module.css';

export interface QuestStickyProps {
  children: ReactNode;
  ariaLabel: string;
  headerLabel?: string;
  onDismiss?: () => void;
  /** Controls mount/unmount for AnimatePresence exit animation. Defaults true. */
  visible?: boolean;
}

export function QuestSticky({
  children,
  ariaLabel,
  headerLabel,
  onDismiss,
  visible = true,
}: QuestStickyProps) {
  const prefersReducedMotion = useReducedMotion();
  const { play } = useSoundController();
  // wasVisibleRef começa false para que o primeiro paint com visible=true dispare attach.
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      play('sticky-attach');
    } else if (!visible && wasVisibleRef.current) {
      play('sticky-peel');
    }
    wasVisibleRef.current = visible;
  }, [visible, play]);

  const enter = prefersReducedMotion
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.15 },
      }
    : {
        initial: { opacity: 0, rotateX: -45, y: -60, scale: 1.05 },
        animate: {
          opacity: 1,
          rotateX: 0,
          y: 0,
          scale: 1,
          rotate: [-3, -1.5, -3],
        },
        exit: {
          opacity: [1, 1, 0],
          y: [0, -20, 200],
          rotate: [-3, -8, -12],
          transition: { duration: 0.5, times: [0, 0.25, 1] },
        },
        transition: { type: 'spring', stiffness: 180, damping: 16, mass: 0.9, duration: 0.6 },
      };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label={ariaLabel}
          className={styles.sticky}
          initial={enter.initial}
          animate={enter.animate}
          exit={enter.exit}
          transition={enter.transition}
        >
          <div className={styles.header}>
            <span className={styles.headerLabel}>{headerLabel ?? 'Roteiro do diário'}</span>
            <MuteToggle {...(styles.muteToggle ? { className: styles.muteToggle } : {})} />
          </div>

          <div className={styles.body}>{children}</div>

          {onDismiss !== undefined && (
            <div className={styles.footer}>
              <button type="button" className={styles.dismissLink} onClick={onDismiss}>
                ocultar roteiro
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
