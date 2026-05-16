/**
 * Public surface of the gratitude feature.
 *
 * Gratitude = 3 razões de gratidão do dia (noite do daily ritual loop).
 * Inspirado no Five-Minute Journal. Espelha o padrão visual de Priorities
 * mas com bullet ♡ (sem checkbox de "done") e 3 slots fixos (sem add/remove
 * livre nem reorder por enquanto).
 */

export { Gratitude } from './components/Gratitude.js';
export type { GratitudeProps } from './components/Gratitude.js';

export { GRATITUDE_SLOTS, normalizeGratitude } from './lib/normalize.js';
