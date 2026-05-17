export interface GoldenSealProps {
  size?: number;
}

/**
 * Selo "happy sticker" do dia 7/7. Substitui o desenho dourado/metálico anterior por um
 * sticker chapado coral com borda branca die-cut e checkmark em tinta escura, alinhado ao
 * idioma dos energy stickers do app. Texto handwriting "Boa!" centralizado.
 */
export function GoldenSeal({ size = 72 }: GoldenSealProps = {}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 72 72"
      aria-hidden="true"
      data-testid="goldenSeal-svg"
    >
      <circle
        data-testid="goldenSeal-die"
        cx="36"
        cy="36"
        r="30"
        fill="#f5854b"
        stroke="#fff"
        strokeWidth="4"
      />
      <path
        data-testid="goldenSeal-check"
        d="M22 38 l8 8 l20 -22"
        fill="none"
        stroke="#2c2416"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.92"
      />
      <text
        x="36"
        y="60"
        textAnchor="middle"
        fontSize="13"
        fontFamily="'Caveat', cursive"
        fill="#2c2416"
        fontWeight="700"
      >
        Boa!
      </text>
    </svg>
  );
}
