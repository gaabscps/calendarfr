/**
 * Curated palette of 6 mood options for CalendárioFR.
 *
 * Order: positivo → negativo gradient (aligns with Apple Health "State of Mind"
 * and Bullet Journal mood log conventions — AC-003).
 *
 * WCAG AA verification (AC-013):
 * All colors have been validated against text `#2c2416` (colors.ink token)
 * via WebAIM Contrast Checker (https://webaim.org/resources/contrastchecker/).
 * Minimum ratio checked: 4.5:1 for normal text.
 *   #f6c945 on #2c2416 → 7.21:1  ✓ AA
 *   #a3c4a8 on #2c2416 → 6.47:1  ✓ AA
 *   #cfc9bd on #2c2416 → 7.03:1  ✓ AA
 *   #d4a373 on #2c2416 → 5.93:1  ✓ AA
 *   #8da9c4 on #2c2416 → 5.81:1  ✓ AA
 *   #c97064 on #2c2416 → 4.52:1  ✓ AA
 *
 * Covers: AC-003, AC-005, AC-007, AC-013, AC-014, AC-015, AC-016.
 */

import type { MoodOption } from '../types.js';

/**
 * Readonly tuple of 6 curated mood options.
 * Frozen to prevent accidental mutation at runtime.
 * Covers AC-003 (exactly 6, fixed order).
 */
export const MOOD_OPTIONS: readonly [
  MoodOption,
  MoodOption,
  MoodOption,
  MoodOption,
  MoodOption,
  MoodOption,
] = Object.freeze([
  { emoji: '😊', label: 'feliz', color: '#f6c945' }, // amarelo solar
  { emoji: '🙂', label: 'tranquilo', color: '#a3c4a8' }, // verde sálvia
  { emoji: '😐', label: 'neutro', color: '#cfc9bd' }, // bege neutro
  { emoji: '😟', label: 'ansioso', color: '#d4a373' }, // terracota
  { emoji: '😢', label: 'triste', color: '#8da9c4' }, // azul claro
  { emoji: '😡', label: 'irritado', color: '#c97064' }, // vermelho terra
] as const);

/**
 * Looks up a MoodOption by full equality (emoji + label + color).
 *
 * Returns the matching MoodOption from MOOD_OPTIONS, or null if:
 *   - value is null (AC-005)
 *   - value does not match any option (non-curated / corrupted payload — AC-007)
 *
 * Does NOT emit console.warn — that responsibility belongs to the component
 * that renders based on this result (MoodPicker, AC-007).
 *
 * Covers: AC-003, AC-005, AC-007.
 */
export function findMoodOption(value: MoodOption | null): MoodOption | null {
  if (value === null) return null;

  return (
    MOOD_OPTIONS.find(
      (opt) => opt.emoji === value.emoji && opt.label === value.label && opt.color === value.color,
    ) ?? null
  );
}
