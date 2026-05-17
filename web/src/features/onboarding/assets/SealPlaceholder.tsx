export interface SealPlaceholderProps {
  size?: number;
  /** Quantas missões já estão completas. Default 0. */
  completed?: number;
  /** Total de missões (define quantos arcos formam o anel). Default 7. */
  total?: number;
}

const RADIUS = 11.5;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const GAP = 1.4;
const COMPLETE_COLOR = '#f5854b';

/**
 * Placeholder clicável do selo "Boa!". Mostra um anel composto por `total`
 * arcos individuais ao redor do círculo. Os primeiros `completed` arcos são
 * desenhados em coral cheio (mesma cor do GoldenSeal); os pendentes ficam
 * pontilhados/desbotados. Comunica progresso N/total no próprio ícone.
 */
export function SealPlaceholder({ size = 18, completed = 0, total = 7 }: SealPlaceholderProps) {
  const segment = (CIRCUMFERENCE - total * GAP) / total;
  const clampedCompleted = Math.max(0, Math.min(total, completed));

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 28 28"
      aria-hidden="true"
      data-testid="sealPlaceholder-svg"
      data-completed={clampedCompleted}
      data-total={total}
    >
      <g transform="rotate(-90 14 14)" data-testid="sealPlaceholder-ring">
        {Array.from({ length: total }, (_, i) => {
          const isComplete = i < clampedCompleted;
          const offset = -(i * (segment + GAP) + GAP / 2);
          return (
            <circle
              key={i}
              cx="14"
              cy="14"
              r={RADIUS}
              fill="none"
              stroke={isComplete ? COMPLETE_COLOR : 'currentColor'}
              strokeWidth={isComplete ? 2.4 : 1.6}
              strokeOpacity={isComplete ? 0.95 : 0.45}
              strokeDasharray={`${segment} ${CIRCUMFERENCE}`}
              strokeDashoffset={offset}
              strokeLinecap="round"
              data-segment-index={i}
              data-segment-complete={String(isComplete)}
            />
          );
        })}
      </g>
    </svg>
  );
}
