/**
 * Placeholder strings for the 3 priority slots.
 *
 * Exported as a standalone module so both PriorityItem and tests can import
 * without triggering react-refresh/only-export-components lint rule.
 *
 * Covers: AC-010.
 */

const PLACEHOLDERS = ['1ª prioridade', '2ª prioridade', '3ª prioridade'] as const;

/**
 * Returns the placeholder for a given 0-based slot index.
 * Falls back to "<n+1>ª prioridade" for out-of-range indices (defensive).
 */
export function placeholderForIndex(index: number): string {
  return PLACEHOLDERS[index as 0 | 1 | 2] ?? `${String(index + 1)}ª prioridade`;
}
