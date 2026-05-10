/**
 * Public types for the mood feature.
 *
 * Mood is re-exported from @calendarfr/shared — single source of truth.
 * MoodOption is an alias for Mood — semantically "a curated list entry".
 * MoodPickerValue is the controlled-component value type (nullable).
 *
 * Covers: AC-014 (no api imports), AC-015 (barrel re-exports), AC-016 (no
 * cross-feature imports).
 */

import type { Mood } from '@calendarfr/shared';

export type { Mood } from '@calendarfr/shared';

/**
 * An entry in the curated MOOD_OPTIONS list.
 * Alias for Mood — same structure, narrower semantic intent.
 * Covers AC-003 (palette is typed), AC-005 (value comparison).
 */
export type MoodOption = Mood;

/**
 * The value accepted and emitted by MoodPicker.
 * null = no mood chosen for the day (legitimate state, not "bad").
 * Covers AC-005 (null renders all chips unselected).
 */
export type MoodPickerValue = Mood | null;
