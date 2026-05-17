import { motion, useReducedMotion } from 'framer-motion';
import { useMemo } from 'react';

import styles from './SparkleBurst.module.css';

export interface SparkleBurstProps {
  /** Number of particles to render (clamped 1..8). Default 4. */
  count?: number;
  /** Container size in px. Default 60. */
  size?: number;
  /** Particle color. Default coral. */
  color?: string;
}

const DEFAULT_COUNT = 4;
const DURATION = 0.4;

interface Particle {
  key: number;
  angle: number;
  distance: number;
  size: number;
  delay: number;
}

export function SparkleBurst({
  count = DEFAULT_COUNT,
  size = 60,
  color = '#f5854b',
}: SparkleBurstProps) {
  const prefersReducedMotion = useReducedMotion();
  const clamped = Math.max(1, Math.min(8, count));

  const particles = useMemo<Particle[]>(() => {
    const arr: Particle[] = [];
    for (let i = 0; i < clamped; i++) {
      const base = (i / clamped) * Math.PI * 2;
      arr.push({
        key: i,
        angle: base + (Math.random() - 0.5) * 0.6,
        distance: 14 + Math.random() * 8,
        size: 4 + Math.random() * 2.5,
        delay: Math.random() * 0.08,
      });
    }
    return arr;
  }, [clamped]);

  if (prefersReducedMotion) return null;

  return (
    <span
      className={styles.root}
      aria-hidden="true"
      data-testid="sparkleBurst-root"
      style={{ width: size, height: size }}
    >
      {particles.map((p) => {
        const dx = Math.cos(p.angle) * p.distance;
        const dy = Math.sin(p.angle) * p.distance;
        return (
          <motion.span
            key={p.key}
            data-testid="sparkleBurst-particle"
            className={styles.particle}
            initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
            animate={{
              x: [0, dx],
              y: [0, dy],
              opacity: [0, 1, 0],
              scale: [0.4, 1, 0.6],
            }}
            transition={{ duration: DURATION, delay: p.delay, ease: 'easeOut' }}
            style={{
              width: p.size,
              height: p.size,
              background: color,
              borderRadius: '50%',
            }}
          />
        );
      })}
    </span>
  );
}
