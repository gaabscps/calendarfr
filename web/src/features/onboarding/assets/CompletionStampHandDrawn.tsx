const PATH_ID = 'stamp-circle-path';
const FILTER_ID = 'stamp-turbulence';

export function CompletionStampHandDrawn() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="140"
      height="140"
      viewBox="0 0 140 140"
      role="img"
      aria-label="Planner iniciado"
    >
      <defs>
        <path id={PATH_ID} d="M 70,70 m -52,0 a 52,52 0 1,1 104,0 a 52,52 0 1,1 -104,0" />
        <filter id={FILTER_ID} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="4" result="noise" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="2"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
      <circle
        cx="70"
        cy="70"
        r="60"
        fill="none"
        stroke="var(--color-accent, #c0392b)"
        strokeWidth="3"
        filter={`url(#${FILTER_ID})`}
        opacity="0.9"
      />
      <circle
        cx="70"
        cy="70"
        r="50"
        fill="none"
        stroke="var(--color-accent, #c0392b)"
        strokeWidth="1.5"
        strokeDasharray="4 3"
        opacity="0.7"
      />
      <text
        fill="var(--color-accent, #c0392b)"
        fontFamily="var(--font-hand, 'Caveat', cursive)"
        fontSize="13"
        letterSpacing="2"
        opacity="0.92"
      >
        <textPath href={`#${PATH_ID}`} startOffset="8%">
          PLANNER INICIADO ✓
        </textPath>
      </text>
    </svg>
  );
}
