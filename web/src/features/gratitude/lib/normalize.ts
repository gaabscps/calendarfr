/**
 * Normalização de gratitude.
 *
 * Disk format: array de 0–3 GratitudeItem (zod aceita até 3).
 * UI format: sempre 3 slots fixos — empty trailing são padded com placeholders
 * estáveis (mesmo id durante a sessão pra não re-mountar editor).
 */

import { newId, type GratitudeItem } from '@calendarfr/shared';

/** Total de slots renderizados na UI. */
export const GRATITUDE_SLOTS = 3;

/**
 * Garante exatamente GRATITUDE_SLOTS itens. Padding com ids ULID novos.
 * Idempotente — chamar 2x com o mesmo input gera ids diferentes nos paddings
 * (callers devem chamar 1x por render e segurar a referência).
 */
export function normalizeGratitude(items: readonly GratitudeItem[]): GratitudeItem[] {
  const result: GratitudeItem[] = items.slice(0, GRATITUDE_SLOTS).map((item) => ({ ...item }));
  while (result.length < GRATITUDE_SLOTS) {
    result.push({ id: newId(), text: '' });
  }
  return result;
}

/**
 * Remove trailing empty itens — usado antes de emitir onChange pra evitar
 * persistir slots placeholder vazios no fim. Slots vazios NO MEIO são
 * preservados (o usuário pode ter preenchido o 1 e o 3 deixando o 2 em branco).
 */
export function trimTrailing(items: readonly GratitudeItem[]): GratitudeItem[] {
  let last = items.length - 1;
  while (last >= 0 && items[last]!.text.trim() === '') {
    last--;
  }
  return items.slice(0, last + 1).map((item) => ({ ...item }));
}
