/**
 * Rotação determinística por índice para os stickers da paleta.
 * Valores escolhidos para evocar colagem manual sem todos pendendo
 * pro mesmo lado. Estável entre renders (não use Math.random).
 */

const ROTATIONS = [-2.5, 1.5, -1, 2, -2, 0.5, 1, -1.5, 2.5, -0.5, -2, 1.5];

/**
 * Retorna a rotação em graus para o sticker no índice dado.
 * Ciclo determinístico de 12 valores; índices >= 12 fazem wrap.
 */
export function stickerRotation(index: number): number {
  return ROTATIONS[index % ROTATIONS.length] ?? 0;
}
