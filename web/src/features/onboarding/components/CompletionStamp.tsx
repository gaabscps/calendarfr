import { motion, useReducedMotion } from 'framer-motion';

import { CompletionStampHandDrawn } from '../assets/CompletionStampHandDrawn.js';

import styles from './CompletionStamp.module.css';

export interface CompletionStampProps {
  completedOnDate: string | null;
  currentDate: string;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatDate(isoDate: string): string {
  const parts = isoDate.split('-').map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return dateFormatter.format(new Date(year, month - 1, day));
}

export function CompletionStamp({ completedOnDate, currentDate }: CompletionStampProps) {
  const prefersReducedMotion = useReducedMotion();

  if (completedOnDate === null || completedOnDate !== currentDate) {
    return null;
  }

  const formattedDate = formatDate(completedOnDate);

  if (prefersReducedMotion) {
    return (
      <motion.div
        className={styles.container}
        data-testid="stamp-reduced-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.2 }}
      >
        <CompletionStampHandDrawn />
        <p className={styles.tagline}>iniciado em {formattedDate}</p>
      </motion.div>
    );
  }

  return (
    <div className={styles.container} data-testid="completion-stamp">
      <motion.div
        className={styles.shadow}
        data-testid="stamp-shadow"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.28 }}
      />

      <motion.div
        data-testid="stamp-svg"
        initial={{ scale: 0.6, rotate: 0 }}
        animate={{ scale: 1, rotate: [0, -3, 3, 0] }}
        transition={{ type: 'spring', stiffness: 220, damping: 20, mass: 1.2, delay: 0.2 }}
      >
        <CompletionStampHandDrawn />
      </motion.div>

      <motion.p
        className={styles.tagline}
        data-testid="completion-stamp-tagline"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.32, delay: 0.6 }}
      >
        iniciado em {formattedDate}
      </motion.p>
    </div>
  );
}
