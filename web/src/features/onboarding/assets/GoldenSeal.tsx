import { useId } from 'react';

/**
 * Selo dourado que carimba o canto da página quando o dia chega a 7/7.
 * Layout: anel duplo dourado + ✓ central em tinta esmaecida + micro caption
 * "Roteiro ✓" para deixar inequívoco que a missão do dia foi cumprida.
 * Largura 72 (era 60 — o anterior ficava fraco para o que comunica).
 */
export function GoldenSeal() {
  const uid = useId();
  const gradientId = `golden-seal-gradient-${uid}`;
  const filterId = `golden-seal-shine-${uid}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="72"
      height="72"
      viewBox="0 0 72 72"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d4a72c" />
          <stop offset="60%" stopColor="#f4d35e" />
          <stop offset="100%" stopColor="#c69216" />
        </linearGradient>
        <filter id={filterId} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
        </filter>
      </defs>
      {/* Halo dourado esmaecido — sugere luz refletida do selo metálico. */}
      <circle
        cx="36"
        cy="36"
        r="32"
        fill={`url(#${gradientId})`}
        filter={`url(#${filterId})`}
        opacity="0.35"
      />
      {/* Corpo do selo. */}
      <circle cx="36" cy="36" r="28" fill={`url(#${gradientId})`} />
      {/* Anel interno serrilhado para textura de medalha. */}
      <circle
        cx="36"
        cy="36"
        r="23"
        fill="none"
        stroke="#8a6000"
        strokeWidth="0.9"
        strokeOpacity="0.45"
        strokeDasharray="2 2.5"
      />
      {/* Checkmark central em tinta escura — comunicação inequívoca. */}
      <path
        d="M24 37 l8 8 l16 -18"
        fill="none"
        stroke="#5a3a00"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.85"
      />
      {/* Microletra hand-drawn embaixo do ✓ para reforçar o significado. */}
      <text
        x="36"
        y="62"
        textAnchor="middle"
        fontSize="9"
        fontFamily="'Caveat', cursive"
        fill="#5a3a00"
        opacity="0.7"
        fontWeight="700"
      >
        completo
      </text>
    </svg>
  );
}
