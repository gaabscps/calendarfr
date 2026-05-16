import { describe, it, expect } from '@jest/globals';

import { stickerRotation } from '../stickerRotation.js';

describe('stickerRotation', () => {
  it('retorna o mesmo valor para o mesmo índice (estável)', () => {
    expect(stickerRotation(0)).toBe(stickerRotation(0));
    expect(stickerRotation(7)).toBe(stickerRotation(7));
  });

  it('cobre 12 índices únicos com pelo menos 6 valores distintos', () => {
    const values = new Set<number>();
    for (let i = 0; i < 12; i++) {
      values.add(stickerRotation(i));
    }
    expect(values.size).toBeGreaterThan(6);
  });

  it('todas as rotações estão entre -3 e +3 graus', () => {
    for (let i = 0; i < 12; i++) {
      const rot = stickerRotation(i);
      expect(rot).toBeGreaterThanOrEqual(-3);
      expect(rot).toBeLessThanOrEqual(3);
    }
  });

  it('faz wrap pra índices >= 12', () => {
    expect(stickerRotation(12)).toBe(stickerRotation(0));
    expect(stickerRotation(25)).toBe(stickerRotation(1));
  });

  it('nem todos os valores são zero', () => {
    const values = Array.from({ length: 12 }, (_, i) => stickerRotation(i));
    expect(values.some((v) => v !== 0)).toBe(true);
  });
});
