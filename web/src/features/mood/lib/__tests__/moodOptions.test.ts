/**
 * Unit tests for MOOD_OPTIONS and findMoodOption.
 *
 * Covers: AC-003 (6 chips ordered), AC-005 (null input handled),
 *         AC-007 (non-curated shape returns null).
 *
 * Strategy: pure functions — no React, no mocks required.
 */

import type { Mood } from '@calendarfr/shared';

import type { MoodOption } from '../../types.js';
import { MOOD_OPTIONS, findMoodOption } from '../moodOptions.js';

// ── MOOD_OPTIONS ──────────────────────────────────────────────────────────────

describe('MOOD_OPTIONS', () => {
  it('has exactly 6 elements (AC-003)', () => {
    expect(MOOD_OPTIONS).toHaveLength(6);
  });

  it('is frozen (Object.freeze applied)', () => {
    expect(Object.isFrozen(MOOD_OPTIONS)).toBe(true);
  });

  it('preserves order: positivo → negativo gradient', () => {
    expect(MOOD_OPTIONS[0]?.label).toBe('feliz');
    expect(MOOD_OPTIONS[1]?.label).toBe('tranquilo');
    expect(MOOD_OPTIONS[2]?.label).toBe('neutro');
    expect(MOOD_OPTIONS[3]?.label).toBe('ansioso');
    expect(MOOD_OPTIONS[4]?.label).toBe('triste');
    expect(MOOD_OPTIONS[5]?.label).toBe('irritado');
  });

  it('every option has a non-empty emoji', () => {
    for (const opt of MOOD_OPTIONS) {
      expect(opt.emoji.length).toBeGreaterThan(0);
    }
  });

  it('every option has a non-empty PT-BR label', () => {
    for (const opt of MOOD_OPTIONS) {
      expect(typeof opt.label).toBe('string');
      expect(opt.label.length).toBeGreaterThan(0);
    }
  });

  it('every option color is in hex format (#rrggbb or #rgb)', () => {
    const hexPattern = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
    for (const opt of MOOD_OPTIONS) {
      expect(opt.color).toMatch(hexPattern);
    }
  });

  it('emojis match canonical paleta (verbatim)', () => {
    expect(MOOD_OPTIONS[0]?.emoji).toBe('😊');
    expect(MOOD_OPTIONS[1]?.emoji).toBe('🙂');
    expect(MOOD_OPTIONS[2]?.emoji).toBe('😐');
    expect(MOOD_OPTIONS[3]?.emoji).toBe('😟');
    expect(MOOD_OPTIONS[4]?.emoji).toBe('😢');
    expect(MOOD_OPTIONS[5]?.emoji).toBe('😡');
  });

  it('colors match canonical paleta (verbatim)', () => {
    expect(MOOD_OPTIONS[0]?.color).toBe('#f6c945');
    expect(MOOD_OPTIONS[1]?.color).toBe('#a3c4a8');
    expect(MOOD_OPTIONS[2]?.color).toBe('#cfc9bd');
    expect(MOOD_OPTIONS[3]?.color).toBe('#d4a373');
    expect(MOOD_OPTIONS[4]?.color).toBe('#8da9c4');
    expect(MOOD_OPTIONS[5]?.color).toBe('#c97064');
  });
});

// ── findMoodOption ────────────────────────────────────────────────────────────

describe('findMoodOption', () => {
  // Happy path: each of the 6 options returns itself
  it.each(MOOD_OPTIONS.map((opt, i) => [i, opt] as [number, MoodOption]))(
    'returns option[%i] when given exact match',
    (_, option) => {
      const result = findMoodOption(option);
      expect(result).toBe(option);
    },
  );

  // null input → null (AC-005)
  it('returns null for null input (AC-005)', () => {
    const result = findMoodOption(null);
    expect(result).toBeNull();
  });

  // Non-matching shape: same emoji, different color → null (AC-007)
  it('returns null when emoji matches but color differs (partial match, AC-007)', () => {
    const partialMatch: Mood = {
      emoji: '😊',
      label: 'feliz',
      color: '#000000', // wrong color
    };
    const result = findMoodOption(partialMatch);
    expect(result).toBeNull();
  });

  // Non-matching shape: same emoji, different label → null
  it('returns null when emoji matches but label differs', () => {
    const partialMatch: Mood = {
      emoji: '😊',
      label: 'wrong-label',
      color: '#f6c945',
    };
    const result = findMoodOption(partialMatch);
    expect(result).toBeNull();
  });

  // Symmetric coverage: same label + same color + DIFFERENT emoji → null
  it('returns null when label and color match but emoji differs (AC-007)', () => {
    const tranquilo = MOOD_OPTIONS[1];
    const wrongEmoji: Mood = {
      emoji: '🌿',
      label: tranquilo.label,
      color: tranquilo.color,
    };
    expect(findMoodOption(wrongEmoji)).toBeNull();
  });

  // Symmetric coverage: same emoji + same color + DIFFERENT label → null
  it('returns null when emoji and color match but label differs (AC-007)', () => {
    const triste = MOOD_OPTIONS[4];
    const wrongLabel: Mood = {
      emoji: triste.emoji,
      label: 'melancolico',
      color: triste.color,
    };
    expect(findMoodOption(wrongLabel)).toBeNull();
  });

  // Tolerância a campos extras (TS structural typing): match continua válido
  it('matches when value has extra (unknown) fields beyond emoji/label/color', () => {
    const feliz = MOOD_OPTIONS[0];
    const withExtra = {
      ...feliz,
      timestamp: '2026-05-10T12:00:00Z',
      saturation: 0.8,
    } as Mood;
    expect(findMoodOption(withExtra)).toBe(feliz);
  });

  // Completely unknown shape → null (AC-007)
  it('returns null for a completely non-curated mood object', () => {
    const unknown: Mood = {
      emoji: '🤔',
      label: 'pensativo',
      color: '#123456',
    };
    const result = findMoodOption(unknown);
    expect(result).toBeNull();
  });

  // No console.warn from findMoodOption (warn is picker's responsibility)
  it('does NOT emit console.warn for non-matching shape (warn is picker responsibility)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      findMoodOption({ emoji: '🤔', label: 'pensativo', color: '#123456' });
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });
});
