import { GRATITUDE_SLOTS, normalizeGratitude, trimTrailing } from '../normalize.js';

describe('normalizeGratitude', () => {
  it('preenche até GRATITUDE_SLOTS quando array vazio', () => {
    const out = normalizeGratitude([]);
    expect(out).toHaveLength(GRATITUDE_SLOTS);
    expect(out.every((i) => i.text === '')).toBe(true);
    // ids únicos
    expect(new Set(out.map((i) => i.id)).size).toBe(GRATITUDE_SLOTS);
  });

  it('preserva itens existentes e padda o restante', () => {
    const out = normalizeGratitude([{ id: 'a', text: 'gratidão 1' }]);
    expect(out).toHaveLength(3);
    expect(out[0]).toEqual({ id: 'a', text: 'gratidão 1' });
    expect(out[1]!.text).toBe('');
    expect(out[2]!.text).toBe('');
  });

  it('trunca quando entram mais que GRATITUDE_SLOTS itens', () => {
    const out = normalizeGratitude([
      { id: 'a', text: '1' },
      { id: 'b', text: '2' },
      { id: 'c', text: '3' },
      { id: 'd', text: '4' },
    ]);
    expect(out).toHaveLength(3);
    expect(out.map((i) => i.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('trimTrailing', () => {
  it('remove itens vazios do final', () => {
    const out = trimTrailing([
      { id: 'a', text: 'cheio' },
      { id: 'b', text: '' },
      { id: 'c', text: '' },
    ]);
    expect(out).toEqual([{ id: 'a', text: 'cheio' }]);
  });

  it('preserva empty no meio', () => {
    const out = trimTrailing([
      { id: 'a', text: 'cheio' },
      { id: 'b', text: '' },
      { id: 'c', text: 'cheio também' },
    ]);
    expect(out).toHaveLength(3);
  });

  it('trata whitespace-only como vazio', () => {
    const out = trimTrailing([
      { id: 'a', text: 'real' },
      { id: 'b', text: '   ' },
    ]);
    expect(out).toEqual([{ id: 'a', text: 'real' }]);
  });

  it('retorna [] quando tudo vazio', () => {
    const out = trimTrailing([
      { id: 'a', text: '' },
      { id: 'b', text: '' },
    ]);
    expect(out).toEqual([]);
  });
});
