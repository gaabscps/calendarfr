/**
 * Unit tests for useMood hook.
 *
 * Covers: AC-001 (onSelect emits option), AC-002 (toggle deselects → null),
 *         AC-005 (selectedIndex -1 when null), AC-007 (non-curated → selectedIndex -1),
 *         AC-019 (toggle on/off, fallback for invalid mood, selectedIndex tracking).
 *
 * Strategy: renderHook from @testing-library/react. No DOM required.
 */

import type { Mood } from '@calendarfr/shared';
import { act, renderHook } from '@testing-library/react';

import { MOOD_OPTIONS } from '../../lib/moodOptions.js';
import type { MoodPickerValue } from '../../types.js';
import { useMood } from '../useMood.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FELIZ = MOOD_OPTIONS[0]!; // { emoji: '😊', label: 'feliz',     color: '#f6c945' }
const TRANQUILO = MOOD_OPTIONS[1]!; // { emoji: '🙂', label: 'tranquilo', color: '#a3c4a8' }
const IRRITADO = MOOD_OPTIONS[5]!; // { emoji: '😡', label: 'irritado',  color: '#c97064' }

const NON_CURATED: Mood = { emoji: '🤔', label: 'pensativo', color: '#000000' };

// ── selectedIndex ─────────────────────────────────────────────────────────────

describe('selectedIndex', () => {
  it('is -1 when value is null (AC-005)', () => {
    const { result } = renderHook(() => useMood(null, jest.fn()));
    expect(result.current.selectedIndex).toBe(-1);
  });

  it('is -1 when value is non-curated mood (AC-007)', () => {
    const { result } = renderHook(() => useMood(NON_CURATED, jest.fn()));
    expect(result.current.selectedIndex).toBe(-1);
  });

  it('returns correct index for each curated option', () => {
    MOOD_OPTIONS.forEach((opt, i) => {
      const { result } = renderHook(() => useMood(opt, jest.fn()));
      expect(result.current.selectedIndex).toBe(i);
    });
  });

  it('returns 0 for feliz option', () => {
    const { result } = renderHook(() => useMood(FELIZ, jest.fn()));
    expect(result.current.selectedIndex).toBe(0);
  });

  it('returns 5 for irritado option (last)', () => {
    const { result } = renderHook(() => useMood(IRRITADO, jest.fn()));
    expect(result.current.selectedIndex).toBe(5);
  });
});

// ── isSelected ────────────────────────────────────────────────────────────────

describe('isSelected', () => {
  it('returns true for the currently selected option', () => {
    const { result } = renderHook(() => useMood(TRANQUILO, jest.fn()));
    expect(result.current.isSelected(TRANQUILO)).toBe(true);
  });

  it('returns false for non-selected options', () => {
    const { result } = renderHook(() => useMood(TRANQUILO, jest.fn()));
    expect(result.current.isSelected(FELIZ)).toBe(false);
    expect(result.current.isSelected(IRRITADO)).toBe(false);
  });

  it('returns false for all options when value is null', () => {
    const { result } = renderHook(() => useMood(null, jest.fn()));
    for (const opt of MOOD_OPTIONS) {
      expect(result.current.isSelected(opt)).toBe(false);
    }
  });

  it('returns false for all options when value is non-curated', () => {
    const { result } = renderHook(() => useMood(NON_CURATED, jest.fn()));
    for (const opt of MOOD_OPTIONS) {
      expect(result.current.isSelected(opt)).toBe(false);
    }
  });
});

// ── onSelect ──────────────────────────────────────────────────────────────────

describe('onSelect', () => {
  it('emits the option when not selected (AC-001)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useMood(null, onChange));

    act(() => {
      result.current.onSelect(FELIZ);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(FELIZ);
  });

  it('emits null when re-selecting the already-selected option (toggle, AC-002)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useMood(FELIZ, onChange));

    act(() => {
      result.current.onSelect(FELIZ);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('emits null when selecting the same option twice via toggle semantics', () => {
    const onChange = jest.fn();
    // Simulate: select TRANQUILO when it's already selected
    const { result } = renderHook(() => useMood(TRANQUILO, onChange));

    act(() => {
      result.current.onSelect(TRANQUILO);
    });

    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('emits new option when switching from one to another (not toggle)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useMood(FELIZ, onChange));

    act(() => {
      result.current.onSelect(TRANQUILO);
    });

    expect(onChange).toHaveBeenCalledWith(TRANQUILO);
  });

  it('emits full Mood object (emoji+label+color all present)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useMood(null, onChange));

    act(() => {
      result.current.onSelect(TRANQUILO);
    });

    const emitted = onChange.mock.calls[0]?.[0] as MoodPickerValue;
    expect(emitted).not.toBeNull();
    expect(emitted).toHaveProperty('emoji', '🙂');
    expect(emitted).toHaveProperty('label', 'tranquilo');
    expect(emitted).toHaveProperty('color', '#a3c4a8');
  });

  it('does NOT call onChange on mount', () => {
    const onChange = jest.fn();
    renderHook(() => useMood(null, onChange));
    expect(onChange).not.toHaveBeenCalled();
  });
});

// ── getOptionByValue ──────────────────────────────────────────────────────────

describe('getOptionByValue', () => {
  it('returns MoodOption for a valid curated value', () => {
    const { result } = renderHook(() => useMood(null, jest.fn()));
    const found = result.current.getOptionByValue(FELIZ);
    expect(found).toBe(FELIZ);
  });

  it('returns null for null input', () => {
    const { result } = renderHook(() => useMood(null, jest.fn()));
    expect(result.current.getOptionByValue(null)).toBeNull();
  });

  it('returns null for non-curated mood', () => {
    const { result } = renderHook(() => useMood(null, jest.fn()));
    expect(result.current.getOptionByValue(NON_CURATED)).toBeNull();
  });
});

// ── handler stability ──────────────────────────────────────────────────────────

describe('handler stability', () => {
  it('onSelect is the same reference when value and onChange are unchanged', () => {
    const onChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ v, cb }: { v: MoodPickerValue; cb: (_next: MoodPickerValue) => void }) => useMood(v, cb),
      { initialProps: { v: null as MoodPickerValue, cb: onChange } },
    );

    const firstRef = result.current.onSelect;
    rerender({ v: null, cb: onChange });

    expect(result.current.onSelect).toBe(firstRef);
  });

  it('selectedIndex updates when value changes (no stale state)', () => {
    const onChange = jest.fn();
    const { result, rerender } = renderHook(
      ({ v, cb }: { v: MoodPickerValue; cb: (_next: MoodPickerValue) => void }) => useMood(v, cb),
      { initialProps: { v: null as MoodPickerValue, cb: onChange } },
    );

    expect(result.current.selectedIndex).toBe(-1);
    rerender({ v: FELIZ, cb: onChange });
    expect(result.current.selectedIndex).toBe(0);
  });

  // ── Logic-review F-002: toggle by value-equality, not reference identity ───
  it('onSelect with value-equal but referentially-different option still toggles to null (AC-002)', () => {
    const onChange = jest.fn();
    const { result } = renderHook(() => useMood(FELIZ, onChange));

    // Build an object equal-by-value to FELIZ but a different reference.
    const felizClone = { emoji: FELIZ.emoji, label: FELIZ.label, color: FELIZ.color };
    expect(felizClone).not.toBe(FELIZ);

    act(() => {
      result.current.onSelect(felizClone);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(null);
  });

  // ── Logic-review F-003: onSelect from non-curated value emits the option ───
  it('onSelect emits the option (not null) when current value is non-curated (AC-001 + AC-007)', () => {
    const onChange = jest.fn();
    const nonCurated: Mood = { emoji: '🤔', label: 'pensativo', color: '#123456' };
    const { result } = renderHook(() => useMood(nonCurated, onChange));

    // matchedOption is null → nothing is "alreadySelected" → onSelect(FELIZ) emits FELIZ.
    act(() => {
      result.current.onSelect(FELIZ);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(FELIZ);
  });

  // ── Logic-review F-005: end-to-end consistency triple ─────────────────────
  it('selectedIndex / isSelected / onSelect-toggle are consistent for the same option', () => {
    const onChange = jest.fn();
    const target = MOOD_OPTIONS[3]; // ansioso
    const { result } = renderHook(() => useMood(target, onChange));

    // 1. selectedIndex points to index 3.
    expect(result.current.selectedIndex).toBe(3);
    // 2. isSelected returns true for the same option.
    expect(result.current.isSelected(target)).toBe(true);
    // 3. onSelect of the same option emits null (toggle).
    act(() => {
      result.current.onSelect(target);
    });
    expect(onChange).toHaveBeenCalledWith(null);
    // 4. isSelected returns false for any other option.
    expect(result.current.isSelected(MOOD_OPTIONS[0])).toBe(false);
  });
});
