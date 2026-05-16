/**
 * Paleta curada de emojis para a feature energy.
 * 12 emojis cobrem o espectro produtividade + social + descanso (~90% dos casos).
 * Ordenados por nível energético decrescente: pico → produtivo → neutro → repouso.
 *
 * Labels em minúsculas (manuscrito casual). Descriptions em PT-BR, voz natural,
 * usadas no slot fixo do popover quando o usuário focar/hover num sticker.
 */

export interface PaletteEntry {
  readonly emoji: string;
  /** Nome curto, em minúsculas (ex: "em chamas"). Usado em label visual e aria-label. */
  readonly label: string;
  /** Frase curta explicando o sentimento (~6–10 palavras). Mostrada no slot. */
  readonly description: string;
}

export const ENERGY_PALETTE: readonly PaletteEntry[] = [
  { emoji: '🔥', label: 'em chamas', description: 'Hora de pico — tudo fluindo, foco máximo' },
  { emoji: '🎯', label: 'focado', description: 'Trabalho concentrado, sem distrações' },
  { emoji: '💪', label: 'forte', description: 'Energia firme, executando com vigor' },
  { emoji: '🚀', label: 'produtivo', description: 'Avançando rápido, entregando muito' },
  { emoji: '😌', label: 'tranquilo', description: 'Ritmo calmo, tudo sob controle' },
  { emoji: '🤔', label: 'pensativo', description: 'Hora de reflexão, planejamento' },
  { emoji: '😴', label: 'sonolento', description: 'Energia baixa, dificuldade de concentrar' },
  { emoji: '🤯', label: 'sobrecarregado', description: 'Demais coisas ao mesmo tempo' },
  { emoji: '☕', label: 'pausa', description: 'Descansando, recarregando' },
  { emoji: '🤝', label: 'reunião', description: 'Conversa, colaboração' },
  { emoji: '🍕', label: 'refeição', description: 'Comendo, intervalo de fome' },
  { emoji: '💤', label: 'descansando', description: 'Sem trabalho, recuperando' },
] as const;
