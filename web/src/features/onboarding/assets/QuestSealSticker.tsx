export interface QuestSealStickerProps {
  size?: number;
}

/**
 * Mini sticker (28×28 default) que combina com o GoldenSeal redesenhado:
 * disco coral, borda branca die-cut, checkmark em tinta escura. Substitui
 * o círculo SVG inline antigo do QuestSeal por uma "família visual" coerente
 * com o stickerage do app.
 */
export function QuestSealSticker({ size = 28 }: QuestSealStickerProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      data-testid="questSealSticker-svg"
    >
      <circle
        data-testid="questSealSticker-die"
        cx="14"
        cy="14"
        r="12"
        fill="#f5854b"
        stroke="#fff"
        strokeWidth="2.5"
      />
      <path
        data-testid="questSealSticker-check"
        d="M8.5 14.5 l3.2 3.2 l7.8 -8"
        fill="none"
        stroke="#2c2416"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
