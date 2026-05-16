/**
 * Public surface of the mood feature.
 *
 * This is the ONLY import point for external consumers (regra inviolável #1).
 *
 * Covers: AC-015 (barrel exports Mood, MOOD_OPTIONS, MoodPicker, MoodChip,
 *         useMood, and prop types), AC-016 (no cross-feature imports — barrel
 *         depends only on own internals).
 */

// Types
export type { Mood, MoodOption, MoodPickerValue } from './types.js';

// Library
export { MOOD_OPTIONS, findMoodOption } from './lib/moodOptions.js';

// Hook
export { useMood } from './hooks/useMood.js';
export type { UseMoodReturn } from './hooks/useMood.js';

// Components (BATCH-B)
export { MoodPicker } from './components/MoodPicker.js';
export type { MoodPickerProps } from './components/MoodPicker.js';

export { MoodChip } from './components/MoodChip.js';
export type { MoodChipProps } from './components/MoodChip.js';

export { MoodPopover } from './components/MoodPopover.js';
export type { MoodPopoverProps } from './components/MoodPopover.js';
