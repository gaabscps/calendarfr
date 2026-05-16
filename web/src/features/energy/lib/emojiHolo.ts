/**
 * Identidade visual do sticker por emoji.
 *
 * Cada figurinha tem uma COR BASE semântica (ex: 🔥 quente/laranja,
 * 💤 azul-frio, 🤝 verde-teal). É essa cor que sinaliza a hora — bate
 * o olho e já reconhece a vibe sem ler o emoji.
 *
 * O efeito foil/holográfico é só um toque de "carinha de sticker"
 * aplicado por cima (CSS) — não substitui a cor base.
 */

export interface StickerIdentity {
  /** Cor base pastel — fundo do sticker. */
  base: string;
  /** Tom mais escuro p/ borda interna sutil e leitura de "etiqueta". */
  accent: string;
  /** Ângulo do reflexo foil em graus (varia p/ luz pegar diferente). */
  angle: number;
}

/** Mapa curado: cada emoji da paleta + cor que evoca seu significado. */
const IDENTITY_MAP: Record<string, { base: string; accent: string }> = {
  '🔥': { base: '#ffd0b8', accent: '#e85a2a' }, // em chamas — laranja quente
  '🎯': { base: '#ffc9c9', accent: '#c0392b' }, // focado — vermelho-alvo
  '💪': { base: '#ffe2a8', accent: '#d18a1a' }, // forte — âmbar/dourado
  '🚀': { base: '#d9c9f5', accent: '#6a3fc4' }, // produtivo — roxo elétrico
  '😌': { base: '#c8e8c2', accent: '#3a8a3a' }, // tranquilo — verde-sálvia
  '🤔': { base: '#d6cce8', accent: '#7657b0' }, // pensativo — lavanda
  '😴': { base: '#c8d8e8', accent: '#5a7a96' }, // sonolento — azul-poeira
  '🤯': { base: '#ffc4d8', accent: '#d83465' }, // sobrecarregado — rosa-quente
  '☕': { base: '#e0ccb8', accent: '#8a5a32' }, // pausa — marrom-café
  '🤝': { base: '#b8e0d4', accent: '#2a8a7a' }, // reunião — teal
  '🍕': { base: '#ffe0b0', accent: '#d88a30' }, // refeição — amarelo-mostarda
  '💤': { base: '#c8cde8', accent: '#4a5aa8' }, // descansando — índigo
};

/** Fallback para emojis fora do mapa (full picker): cinza-papel neutro. */
const FALLBACK = { base: '#ede7d8', accent: '#9a8a72' };

/**
 * FNV-1a 32-bit-ish — barato, determinístico, distribui razoavelmente
 * para strings curtas. Só pra derivar o ângulo do reflexo foil.
 */
function hashEmoji(emoji: string): number {
  let h = 2166136261;
  for (const ch of emoji) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function emojiHolo(emoji: string): StickerIdentity {
  const identity = IDENTITY_MAP[emoji] ?? FALLBACK;
  return {
    ...identity,
    angle: hashEmoji(emoji) % 360,
  };
}
