/**
 * Paleta curada de emojis para a feature energy.
 * 12 emojis cobrem o espectro produtividade + social + descanso (~90% dos casos).
 * Labels em PT-BR para uso em aria-label.
 */

export interface PaletteEntry {
  readonly emoji: string;
  readonly label: string;
}

export const ENERGY_PALETTE: readonly PaletteEntry[] = [
  { emoji: '🔥', label: 'Em chamas' },
  { emoji: '🎯', label: 'Focado' },
  { emoji: '💪', label: 'Forte' },
  { emoji: '🚀', label: 'Produtivo' },
  { emoji: '😌', label: 'Tranquilo' },
  { emoji: '🤔', label: 'Pensativo' },
  { emoji: '😴', label: 'Sonolento' },
  { emoji: '🤯', label: 'Sobrecarregado' },
  { emoji: '☕', label: 'Pausa' },
  { emoji: '🤝', label: 'Reunião' },
  { emoji: '🍕', label: 'Refeição' },
  { emoji: '💤', label: 'Descansando' },
] as const;
