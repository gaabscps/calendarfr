/**
 * useMood — thin hook managing selection logic for the curated mood picker.
 *
 * Covers: AC-001 (onSelect emits option), AC-002 (toggle deselects → null),
 *         AC-005 (selectedIndex -1 when null), AC-007 (non-curated → -1),
 *         AC-014 (no fetch/api), AC-019 (unit-testable toggle + lookup).
 *
 * Contract:
 * - Receives (value: MoodPickerValue, onChange: (next: MoodPickerValue) => void).
 * - Returns { selectedIndex, isSelected, onSelect, getOptionByValue }.
 * - No internal state, no async effects, no fetch.
 *
 * Handler stability:
 * onSelect is stable via useCallback([value, onChange]). This is sufficient for
 * a 6-option list (same tradeoff as FEAT-008 usePriorities). The valueRef +
 * onChangeRef pattern from useAgenda is available but not required here.
 */

import { useCallback } from 'react';

import { MOOD_OPTIONS, findMoodOption } from '../lib/moodOptions.js';
import type { MoodOption, MoodPickerValue } from '../types.js';

export interface UseMoodReturn {
  /**
   * Index in MOOD_OPTIONS of the currently selected option.
   * -1 when value is null or does not match any curated option (AC-005, AC-007).
   */
  selectedIndex: number;

  /**
   * Returns true if the given MoodOption is the currently selected one.
   * Covers AC-001, AC-002.
   */
  isSelected: (option: MoodOption) => boolean;

  /**
   * Selects or deselects a MoodOption.
   * - If option is already selected: emits onChange(null) — toggle (AC-002).
   * - Otherwise: emits onChange(option) — select (AC-001).
   * Stable reference via useCallback.
   */
  onSelect: (option: MoodOption) => void;

  /**
   * Wraps findMoodOption for convenience.
   * Returns the matching MoodOption from MOOD_OPTIONS, or null (AC-007).
   */
  getOptionByValue: (v: MoodPickerValue) => MoodOption | null;
}

export function useMood(
  value: MoodPickerValue,
  onChange: (next: MoodPickerValue) => void,
): UseMoodReturn {
  // Resolve the matching curated option (null if value is null or non-curated).
  // matchedOption, when non-null, IS one of the MOOD_OPTIONS members (frozen
  // tuple, reference-stable), so .indexOf is sufficient — no need to re-derive
  // the equality across all 3 fields.
  const matchedOption = findMoodOption(value);
  const selectedIndex = matchedOption !== null ? MOOD_OPTIONS.indexOf(matchedOption) : -1;

  const isSelected = useCallback(
    (option: MoodOption): boolean => {
      if (matchedOption === null) return false;
      return (
        option.emoji === matchedOption.emoji &&
        option.label === matchedOption.label &&
        option.color === matchedOption.color
      );
    },
    [matchedOption],
  );

  const onSelect = useCallback(
    (option: MoodOption): void => {
      // Toggle: if clicking the already-selected option, deselect (AC-002).
      const alreadySelected =
        matchedOption !== null &&
        option.emoji === matchedOption.emoji &&
        option.label === matchedOption.label &&
        option.color === matchedOption.color;

      onChange(alreadySelected ? null : option);
    },
    [matchedOption, onChange],
  );

  const getOptionByValue = useCallback(
    (v: MoodPickerValue): MoodOption | null => findMoodOption(v),
    [],
  );

  return { selectedIndex, isSelected, onSelect, getOptionByValue };
}
