import { describe, it, expect } from '@jest/globals';

import { ENERGY_PALETTE } from '../palette.js';

describe('ENERGY_PALETTE', () => {
  it('contém exatamente 12 entradas', () => {
    expect(ENERGY_PALETTE).toHaveLength(12);
  });

  it('todas as entradas têm emoji (não vazio) e label (não vazio)', () => {
    for (const entry of ENERGY_PALETTE) {
      expect(typeof entry.emoji).toBe('string');
      expect(entry.emoji.length).toBeGreaterThan(0);
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
    }
  });

  it('emojis são únicos', () => {
    const emojis = ENERGY_PALETTE.map((e) => e.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });

  it('labels estão em português', () => {
    const hasAccent = ENERGY_PALETTE.some((e) => /[áàâãéêíóôõú]/i.test(e.label));
    expect(hasAccent).toBe(true);
  });
});
