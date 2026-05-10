/**
 * MoodChip — single mood option rendered as a WAI-ARIA radio button.
 *
 * Wrapped in React.memo — props are primitives + stable callbacks (NFR-001, NFR-002).
 * Forwards ref so MoodPicker can programmatically focus chips (roving tabindex).
 *
 * Covers: AC-004 (aria-checked + backgroundColor), AC-009 (role=radio, aria-label PT-BR),
 *         AC-010 (Space/Enter → onSelect; Arrow keys → onArrowNav),
 *         AC-011 (roving tabIndex), AC-012 (focus ring via CSS).
 */

import React, { forwardRef, useCallback } from 'react';

import type { MoodOption } from '../types.js';

import styles from './MoodChip.module.css';

export interface MoodChipProps {
  /** The curated mood option this chip represents. */
  option: MoodOption;
  /** Whether this chip is currently selected. */
  isSelected: boolean;
  /** Roving tabindex — 0 for the focusable chip, -1 for all others (AC-011). */
  tabIndex: 0 | -1;
  /** 0-based index in MOOD_OPTIONS (used for aria-label). */
  index: number;
  /** Total chip count (always 6 — used for aria-label PT-BR). */
  total: number;
  /** Called when the chip is selected (click or Space/Enter). */
  onSelect: (option: MoodOption) => void;
  /** Called when an arrow key is pressed; parent handles focus movement. */
  onArrowNav: (direction: 'prev' | 'next') => void;
}

const MoodChipBase = forwardRef<HTMLButtonElement, MoodChipProps>(function MoodChipInner(
  { option, isSelected, tabIndex, index, total, onSelect, onArrowNav },
  ref,
) {
  const ariaLabel = `${option.label}, humor ${String(index + 1)} de ${String(total)}`;

  const handleClick = useCallback(() => {
    onSelect(option);
  }, [option, onSelect]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      switch (event.key) {
        case ' ':
        case 'Enter':
          event.preventDefault();
          onSelect(option);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          event.preventDefault();
          onArrowNav('prev');
          break;
        case 'ArrowRight':
        case 'ArrowDown':
          event.preventDefault();
          onArrowNav('next');
          break;
        default:
          break;
      }
    },
    [option, onSelect, onArrowNav],
  );

  const chipClassName = [styles.chip, isSelected ? styles.selected : ''].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={isSelected}
      aria-label={ariaLabel}
      tabIndex={tabIndex}
      className={chipClassName}
      style={isSelected ? { backgroundColor: option.color } : undefined}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      <span className={styles.emoji}>{option.emoji}</span>
      <span className={styles.label}>{option.label}</span>
    </button>
  );
});

export const MoodChip = React.memo(MoodChipBase);
MoodChip.displayName = 'MoodChip';
