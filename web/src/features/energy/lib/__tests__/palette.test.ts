import { describe, it, expect } from '@jest/globals';

import { ENERGY_PALETTE } from '../palette.js';

describe('ENERGY_PALETTE', () => {
  it('contém exatamente 12 entradas', () => {
    expect(ENERGY_PALETTE).toHaveLength(12);
  });

  it('todas as entradas têm emoji, label e description não-vazios', () => {
    for (const entry of ENERGY_PALETTE) {
      expect(typeof entry.emoji).toBe('string');
      expect(entry.emoji.length).toBeGreaterThan(0);
      expect(typeof entry.label).toBe('string');
      expect(entry.label.length).toBeGreaterThan(0);
      expect(typeof entry.description).toBe('string');
      expect(entry.description.length).toBeGreaterThan(0);
    }
  });

  it('emojis são únicos', () => {
    const emojis = ENERGY_PALETTE.map((e) => e.emoji);
    expect(new Set(emojis).size).toBe(emojis.length);
  });

  it('labels estão em minúsculas (estética manuscrita)', () => {
    for (const entry of ENERGY_PALETTE) {
      expect(entry.label).toBe(entry.label.toLowerCase());
    }
  });

  it('ao menos um label contém acento (PT-BR)', () => {
    const hasAccent = ENERGY_PALETTE.some((e) => /[áàâãéêíóôõúç]/i.test(e.label));
    expect(hasAccent).toBe(true);
  });

  it('descriptions têm 5–60 chars (concisas)', () => {
    for (const entry of ENERGY_PALETTE) {
      expect(entry.description.length).toBeGreaterThanOrEqual(5);
      expect(entry.description.length).toBeLessThanOrEqual(60);
    }
  });
});
