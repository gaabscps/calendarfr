import { useId } from 'react';

export function SealHandDrawn({ completed }: { completed: boolean }) {
  const uid = useId();
  const filterId = `seal-turbulence-${uid}`;
  const strokeColor = completed
    ? 'var(--color-accent, #c0392b)'
    : 'var(--color-ink-muted, #9a8a72)';
  const fillColor = completed ? 'var(--color-accent, #c0392b)' : 'none';
  const strokeDasharray = completed ? 'none' : '3 3';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="28"
      height="28"
      viewBox="0 0 28 28"
      aria-hidden="true"
    >
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
    </svg>
  );
}
