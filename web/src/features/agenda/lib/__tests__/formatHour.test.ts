/**
 * Unit tests for formatHour helpers.
 *
 * Covers: AC-006.
 *
 * Strategy: pure functions — no React, no mocks required.
 */

import { formatHourAriaLabel, formatHourLabel } from '../formatHour.js';

describe('formatHourLabel', () => {
  it('zero-pads single-digit hours', () => {
    expect(formatHourLabel(6)).toBe('06');
    expect(formatHourLabel(7)).toBe('07');
    expect(formatHourLabel(9)).toBe('09');
  });

  it('does not pad two-digit hours', () => {
    expect(formatHourLabel(10)).toBe('10');
    expect(formatHourLabel(14)).toBe('14');
    expect(formatHourLabel(23)).toBe('23');
  });

  it('produces "06" for hour 6 (boundary)', () => {
    expect(formatHourLabel(6)).toBe('06');
  });

  it('produces "23" for hour 23 (boundary)', () => {
    expect(formatHourLabel(23)).toBe('23');
  });

  it('covers all 18 agenda hours with correct format', () => {
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    const expected = [
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
    ];
    hours.forEach((h, i) => {
      expect(formatHourLabel(h)).toBe(expected[i]);
    });
  });
});

describe('formatHourAriaLabel', () => {
  it('returns PT-BR label for single-digit hour (no zero-padding)', () => {
    expect(formatHourAriaLabel(6)).toBe('Agenda das 6 horas');
    expect(formatHourAriaLabel(8)).toBe('Agenda das 8 horas');
    expect(formatHourAriaLabel(9)).toBe('Agenda das 9 horas');
  });

  it('returns PT-BR label for two-digit hours', () => {
    expect(formatHourAriaLabel(10)).toBe('Agenda das 10 horas');
    expect(formatHourAriaLabel(14)).toBe('Agenda das 14 horas');
    expect(formatHourAriaLabel(23)).toBe('Agenda das 23 horas');
  });

  it('uses natural number (not zero-padded) in spoken label', () => {
    // "Agenda das 06 horas" would be unnatural in PT-BR
    expect(formatHourAriaLabel(6)).not.toContain('06');
    expect(formatHourAriaLabel(8)).not.toContain('08');
  });

  it('returns correct boundary labels', () => {
    expect(formatHourAriaLabel(6)).toBe('Agenda das 6 horas');
    expect(formatHourAriaLabel(23)).toBe('Agenda das 23 horas');
  });

  it('covers all 18 agenda hours', () => {
    const hours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    hours.forEach((h) => {
      expect(formatHourAriaLabel(h)).toBe(`Agenda das ${String(h)} horas`);
    });
  });
});
