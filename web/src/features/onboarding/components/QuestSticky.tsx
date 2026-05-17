import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

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

  const enterVariants = prefersReducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, y: -10, rotate: -3 },
        animate: { opacity: 1, y: 0, rotate: -3 },
        exit: { scale: [1, 1.05, 0], opacity: [1, 1, 0], rotate: [0, -2, -8] },
      };

  const transition = prefersReducedMotion
    ? { duration: 0.15 }
    : { duration: 0.52, type: 'spring', stiffness: 220, damping: 14 };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="region"
          aria-label={ariaLabel}
          className={styles.sticky}
          initial={enterVariants.initial}
          animate={enterVariants.animate}
          exit={enterVariants.exit}
          transition={transition}
        >
          <div className={styles.header}>
            <span className={styles.headerLabel}>{headerLabel ?? 'Roteiro do diário'}</span>
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
