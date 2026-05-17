export interface SealPlaceholderProps {
  size?: number;
}

/**
 * Silhueta vazia do sticker — usada como placeholder clicável (HelpButton).
 * Mesma forma do QuestSealSticker/GoldenSeal (círculo die-cut) mas sem cor
 * e com stroke tracejado, sugerindo "selo a ser carimbado".
 */
export function SealPlaceholder({ size = 18 }: SealPlaceholderProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      data-testid="sealPlaceholder-svg"
    >
      <circle
        data-testid="sealPlaceholder-outline"
        cx="14"
        cy="14"
        r="11.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeDasharray="2.5 2"
        opacity="0.7"
      />
    </svg>
  );
}
