import { useId } from 'react';

interface WashiTapeProps {
  position: 'topLeft' | 'topRight';
}

export function WashiTape({ position }: WashiTapeProps) {
  const uid = useId();
  const gradientId = `washi-gradient-${uid}`;
  const rotation = position === 'topLeft' ? -12 : 12;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="80"
      height="24"
      viewBox="0 0 80 24"
      aria-hidden="true"
      style={{ transform: `rotate(${rotation}deg)` }}
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="var(--color-paper, #fffef7)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--color-accent, #c0392b)" stopOpacity="0.3" />
        </linearGradient>
      </defs>
      <rect
        x="2"
        y="2"
        width="76"
        height="20"
        rx="4"
        ry="4"
        fill={`url(#${gradientId})`}
        stroke="var(--color-accent, #c0392b)"
        strokeWidth="0.5"
        strokeOpacity="0.2"
      />
    </svg>
  );
}
