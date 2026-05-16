import styles from './GratitudeWashiTape.module.css';

export interface GratitudeWashiTapeProps {
  side: 'left' | 'right';
  rotation?: number;
}

export function GratitudeWashiTape({ side, rotation = 12 }: GratitudeWashiTapeProps) {
  const angle = side === 'left' ? -rotation : rotation;
  return (
    <svg
      data-testid="washi-tape"
      aria-hidden="true"
      width="48"
      height="18"
      viewBox="0 0 48 18"
      className={`${styles.tape} ${side === 'left' ? styles.left : styles.right}`}
      style={{ transform: `rotate(${angle}deg)` }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={`wt-grad-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-paper, #fff9f0)" stopOpacity="0.92" />
          <stop offset="50%" stopColor="var(--color-accent, #c0392b)" stopOpacity="0.28" />
          <stop offset="100%" stopColor="var(--color-paper, #fff9f0)" stopOpacity="0.85" />
        </linearGradient>
        <filter id={`wt-fiber-${side}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.75"
            numOctaves="2"
            stitchTiles="stitch"
          />
          <feColorMatrix values="0 0 0 0 0.18  0 0 0 0 0.14  0 0 0 0 0.08  0 0 0 0.12 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
      </defs>
      <rect
        x="1"
        y="1"
        width="46"
        height="16"
        rx="2"
        fill={`url(#wt-grad-${side})`}
        stroke="var(--color-accent, #c0392b)"
        strokeWidth="0.4"
        strokeOpacity="0.18"
      />
      <rect
        x="1"
        y="1"
        width="46"
        height="16"
        rx="2"
        filter={`url(#wt-fiber-${side})`}
        opacity="0.6"
      />
    </svg>
  );
}
