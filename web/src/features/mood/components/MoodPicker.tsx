/**
 * MoodPicker — WAI-ARIA RadioGroup container for the curated 6-mood picker.
 *
 * Purely controlled: receives value + onChange, no fetch, no internal async.
 * Implements roving tabindex (WAI-ARIA APG Radio Group pattern).
 *
 * Covers: AC-004, AC-005, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011,
 *         AC-012, AC-013, AC-014, AC-015, AC-016, AC-020, NFR-001, NFR-002.
 */

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';

import { useMood } from '../hooks/useMood.js';
import { findMoodOption, MOOD_OPTIONS } from '../lib/moodOptions.js';
import type { MoodOption, MoodPickerValue } from '../types.js';

import { MoodChip } from './MoodChip.js';
import styles from './MoodPicker.module.css';

export interface MoodPickerProps {
  /** Current selected mood — null means "no mood chosen". */
  value: MoodPickerValue;
  /** Emitted when the user selects or deselects a mood chip. */
  onChange: (next: MoodPickerValue) => void;
}

const TOTAL_CHIPS = MOOD_OPTIONS.length; // 6

/** PT-BR prompt shown as legend — decided in Phase 3. */
const PROMPT = 'Como você está hoje?';

export function MoodPicker({ value, onChange }: MoodPickerProps) {
  const { selectedIndex, isSelected, onSelect } = useMood(value, onChange);
  const legendId = useId();

  // ── Roving tabindex state ──────────────────────────────────────────────────
  // Initial focused chip mirrors selection (or first chip if none selected).
  const [focusedIndex, setFocusedIndex] = useState<number>(selectedIndex >= 0 ? selectedIndex : 0);

  // Flag: only focus programmatically after the user has pressed an arrow key.
  // Avoids stealing focus on initial mount.
  const isKeyboardNavRef = useRef(false);

  // Refs to each chip button for programmatic focus.
  const chipRefs = useRef<(HTMLButtonElement | null)[]>(
    Array(TOTAL_CHIPS).fill(null) as (HTMLButtonElement | null)[],
  );

  // ── Invalid-value warning (AC-007) ────────────────────────────────────────
  // Track warned value keys in a Set to dedupe warns — even across re-renders
  // caused by concurrent React dev-mode effect re-invocation.
  const warnedKeysRef = useRef<Set<string>>(new Set<string>());

  useEffect(() => {
    if (value === null) return;
    const matched = findMoodOption(value);
    if (matched === null) {
      // Only warn once per distinct invalid value (key = JSON stringified).
      const key = JSON.stringify(value);
      if (!warnedKeysRef.current.has(key)) {
        warnedKeysRef.current.add(key);
        console.warn(
          '[mood] MoodPicker: value does not match any curated option, rendering as unselected',
          value,
        );
      }
    }
  }, [value]);

  // ── Sync focusedIndex when selectedIndex changes (no keyboard navigation) ─
  // If user hasn't pressed arrows yet, keep focused chip tracking selection.
  useEffect(() => {
    if (!isKeyboardNavRef.current && selectedIndex >= 0) {
      setFocusedIndex(selectedIndex);
    }
  }, [selectedIndex]);

  // ── Programmatic focus when focusedIndex changes via keyboard ─────────────
  useEffect(() => {
    if (isKeyboardNavRef.current) {
      chipRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex]);

  // ── Arrow navigation handler ───────────────────────────────────────────────
  const handleArrowNav = useCallback((direction: 'prev' | 'next') => {
    isKeyboardNavRef.current = true;
    setFocusedIndex((prev) => {
      if (direction === 'prev') {
        return (prev - 1 + TOTAL_CHIPS) % TOTAL_CHIPS;
      }
      return (prev + 1) % TOTAL_CHIPS;
    });
  }, []);

  // ── Reset keyboard-nav latch on focus leaving the radiogroup ──────────────
  // AC-011 invariant: when the user clicks back into the group or the parent
  // re-supplies value (e.g., daily-page loads), the tab-stop must re-sync to
  // the selected chip. Once focus leaves the fieldset, clear the latch so the
  // next render's sync-effect can pull focusedIndex back to selectedIndex.
  // Standard W3C APG RadioGroup pattern.
  const handleBlur = useCallback((e: React.FocusEvent<HTMLFieldSetElement>) => {
    // Ignore blurs that move focus to another chip within the same fieldset.
    if (e.currentTarget.contains(e.relatedTarget)) return;
    isKeyboardNavRef.current = false;
  }, []);

  // ── Click-after-arrow-nav: clear latch so the click sync re-runs ──────────
  // Without this, after the user arrow-navs and then clicks a chip, the
  // sync-effect at lines above skips and tab-stop diverges from selection.
  const handleSelectAndSync = useCallback(
    (option: MoodOption) => {
      isKeyboardNavRef.current = false;
      onSelect(option);
    },
    [onSelect],
  );

  return (
    <fieldset
      className={styles.picker}
      role="radiogroup"
      aria-labelledby={legendId}
      onBlur={handleBlur}
    >
      <legend className={styles.legend} id={legendId}>
        {PROMPT}
      </legend>

      <div className={styles.row}>
        {MOOD_OPTIONS.map((option, index) => (
          <MoodChip
            key={option.label}
            option={option}
            isSelected={isSelected(option)}
            tabIndex={focusedIndex === index ? 0 : -1}
            index={index}
            total={TOTAL_CHIPS}
            onSelect={handleSelectAndSync}
            onArrowNav={handleArrowNav}
            ref={(el) => {
              chipRefs.current[index] = el;
            }}
          />
        ))}
      </div>
    </fieldset>
  );
}
