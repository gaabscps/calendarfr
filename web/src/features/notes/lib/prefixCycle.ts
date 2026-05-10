/**
 * prefixCycle — pure helpers for cycling the 4 note prefix symbols.
 *
 * Covers: AC-008 (cycle order • → → → — → ★ → •).
 *
 * Industry reference: Notion (cycle list types), Bear (cycle icon).
 * 4 prefixes are fixed by server schema (FEAT-006 zod).
 */

import type { NotePrefix } from '@calendarfr/shared';

/**
 * Canonical cycle order for note prefixes.
 * Frozen at module level — treat as immutable constant.
 * Matches server zod enum: z.enum(['•', '→', '—', '★']).
 */
export const PREFIX_ORDER: readonly NotePrefix[] = Object.freeze(['•', '→', '—', '★'] as const);

/**
 * Returns the next prefix in the cycle after `current`.
 *
 * Cycle: • → → → — → ★ → •
 *
 * Defensive: if `current` is not in PREFIX_ORDER (runtime corruption),
 * returns the first prefix '•' rather than throwing.
 */
export function nextPrefix(current: NotePrefix): NotePrefix {
  const i = PREFIX_ORDER.indexOf(current);
  if (i === -1) return PREFIX_ORDER[0]!;
  return PREFIX_ORDER[(i + 1) % PREFIX_ORDER.length]!;
}
