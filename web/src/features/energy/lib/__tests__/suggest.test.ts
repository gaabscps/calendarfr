import { describe, it, expect } from '@jest/globals';

import { suggestEnergy } from '../suggest.js';

describe('suggestEnergy', () => {
  it('retorna null para texto vazio', () => {
    expect(suggestEnergy('')).toBeNull();
  });

  it('retorna null para texto sem palavra-chave conhecida', () => {
    expect(suggestEnergy('alguma coisa qualquer xyz')).toBeNull();
  });

  it.each([
    ['Reunião com cliente', '🤝'],
    ['meeting with team', '🤝'],
    ['Daily call', '🤝'],
    ['Foco na refatoração', '🎯'],
    ['deep work session', '🎯'],
    ['coding the API', '🎯'],
    ['Almoço em casa', '🍕'],
    ['café da tarde', '🍕'],
    ['Treino de musculação', '💪'],
    ['gym session', '💪'],
    ['estou cansado demais', '😴'],
    ['pausa rápida', '☕'],
    ['Estudo de SQL', '🤔'],
    ['sobrecarga de trabalho', '🤯'],
  ])('texto "%s" sugere %s', (text, emoji) => {
    expect(suggestEnergy(text)).toBe(emoji);
  });

  it('strip HTML antes de fazer match', () => {
    expect(suggestEnergy('<b>Reunião</b> com <i>cliente</i>')).toBe('🤝');
  });

  it('case-insensitive', () => {
    expect(suggestEnergy('REUNIÃO IMPORTANTE')).toBe('🤝');
  });

  it('first-match wins', () => {
    expect(suggestEnergy('Reunião e almoço')).toBe('🤝');
  });
});
