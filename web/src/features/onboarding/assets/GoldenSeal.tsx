import { useId } from 'react';

export function GoldenSeal() {
  const uid = useId();
  const gradientId = `golden-seal-gradient-${uid}`;
  const filterId = `golden-seal-shine-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="60"
      height="60"
      viewBox="0 0 60 60"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a72c" />
          <stop offset="100%" stopColor="#f4d35e" />
        </linearGradient>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
        </filter>
      </defs>
      <circle
        cx="30"
        cy="30"
        r="26"
        fill={`url(#${gradientId})`}
        filter={`url(#${filterId})`}
        opacity="0.4"
      />
      <circle cx="30" cy="30" r="24" fill={`url(#${gradientId})`} />
      <circle
        cx="30"
        cy="30"
        r="20"
        fill="none"
        stroke="#d4a72c"
        strokeWidth="0.8"
        strokeOpacity="0.5"
      />
      <text
        x="30"
        y="34"
        textAnchor="middle"
        fontSize="16"
        fill="#8a6000"
        fontFamily="serif"
        opacity="0.7"
      >
        ✦
      </text>
    </svg>
  );
}
