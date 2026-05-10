/**
 * Integration tests: MoodPicker + MoodChip — BATCH-B
 *
 * Covers: AC-004, AC-006, AC-008, AC-009, AC-010, AC-011, AC-012, AC-013,
 *         AC-020, NFR-001, NFR-002.
 *
 * Strategy: render <MoodPicker> in a controlled test harness (useState) and
 * assert DOM + emitted values. Keyboard interactions via userEvent.
 */

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import { MOOD_OPTIONS } from '../../lib/moodOptions.js';
import type { MoodPickerValue } from '../../types.js';
import { MoodPicker } from '../MoodPicker.js';

import { renderWithProviders, userEvent } from '@/test-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Controlled harness wrapping MoodPicker — mirrors how daily-page will use it. */
function Harness({
  initial,
  onChangeSpy,
}: {
  initial: MoodPickerValue;
  onChangeSpy?: (_v: MoodPickerValue) => void;
}) {
  const [value, setValue] = useState<MoodPickerValue>(initial);
  return (
    <MoodPicker
      value={value}
      onChange={(next) => {
        setValue(next);
        onChangeSpy?.(next);
      }}
    />
  );
}

/** Get all role=radio chip buttons. */
function getChips(): HTMLElement[] {
  return screen.getAllByRole('radio');
}

// ---------------------------------------------------------------------------
// Structure: fieldset + legend + radiogroup (AC-006, AC-008)
// ---------------------------------------------------------------------------

describe('MoodPicker — structure (AC-006, AC-008)', () => {
  it('renders a fieldset with role="radiogroup"', () => {
    renderWithProviders(<Harness initial={null} />);
    const group = screen.getByRole('radiogroup');
    expect(group.tagName.toLowerCase()).toBe('fieldset');
  });

  it('legend is present and associated via aria-labelledby (AC-006, AC-008)', () => {
    renderWithProviders(<Harness initial={null} />);
    const group = screen.getByRole('radiogroup');
    const labelledById = group.getAttribute('aria-labelledby');
    expect(labelledById).toBeTruthy();
    const legend = document.getElementById(labelledById as string);
    expect(legend).toBeInTheDocument();
    expect(legend?.textContent).toBe('Como você está hoje?');
  });

  it('renders exactly 6 chip buttons (AC-003)', () => {
    renderWithProviders(<Harness initial={null} />);
    expect(getChips()).toHaveLength(6);
  });
});

// ---------------------------------------------------------------------------
// AC-009: aria-label PT-BR per chip
// ---------------------------------------------------------------------------

describe('MoodPicker — chip aria-labels (AC-009)', () => {
  it('each chip has aria-label with PT-BR format "label, humor N de 6"', () => {
    renderWithProviders(<Harness initial={null} />);
    const chips = getChips();
    MOOD_OPTIONS.forEach((option, index) => {
      expect(chips[index]).toHaveAttribute(
        'aria-label',
        `${option.label}, humor ${String(index + 1)} de 6`,
      );
    });
  });

  it('each chip has correct emoji and label text', () => {
    renderWithProviders(<Harness initial={null} />);
    const chips = getChips();
    MOOD_OPTIONS.forEach((option, index) => {
      expect(chips[index]).toHaveTextContent(option.emoji);
      expect(chips[index]).toHaveTextContent(option.label);
    });
  });
});

// ---------------------------------------------------------------------------
// AC-005, AC-011: value=null → all aria-checked false, first tab-stoppable
// ---------------------------------------------------------------------------

describe('MoodPicker — null value (AC-005, AC-011)', () => {
  it('value=null: no chip has aria-checked="true"', () => {
    renderWithProviders(<Harness initial={null} />);
    getChips().forEach((chip) => {
      expect(chip).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('value=null: first chip has tabIndex=0, others have tabIndex=-1 (AC-011)', () => {
    renderWithProviders(<Harness initial={null} />);
    const chips = getChips();
    expect(chips[0]).toHaveAttribute('tabindex', '0');
    chips.slice(1).forEach((chip) => {
      expect(chip).toHaveAttribute('tabindex', '-1');
    });
  });
});

// ---------------------------------------------------------------------------
// AC-004, AC-011: value=MOOD_OPTIONS[3] → that chip selected + tab-stoppable
// ---------------------------------------------------------------------------

describe('MoodPicker — selected value (AC-004, AC-011)', () => {
  it('selected chip has aria-checked="true", others false', () => {
    renderWithProviders(<Harness initial={MOOD_OPTIONS[3]} />);
    const chips = getChips();
    chips.forEach((chip, index) => {
      if (index === 3) {
        expect(chip).toHaveAttribute('aria-checked', 'true');
      } else {
        expect(chip).toHaveAttribute('aria-checked', 'false');
      }
    });
  });

  it('selected chip has tabIndex=0, others -1 (AC-011)', () => {
    renderWithProviders(<Harness initial={MOOD_OPTIONS[3]} />);
    const chips = getChips();
    chips.forEach((chip, index) => {
      if (index === 3) {
        expect(chip).toHaveAttribute('tabindex', '0');
      } else {
        expect(chip).toHaveAttribute('tabindex', '-1');
      }
    });
  });

  it('selected chip has inline backgroundColor style (AC-004)', () => {
    renderWithProviders(<Harness initial={MOOD_OPTIONS[3]} />);
    const chips = getChips();
    expect(chips[3]).toHaveStyle({ backgroundColor: MOOD_OPTIONS[3].color });
    // Non-selected chips should NOT have backgroundColor set
    expect(chips[0]).not.toHaveStyle({ backgroundColor: MOOD_OPTIONS[3].color });
  });
});

// ---------------------------------------------------------------------------
// AC-001: Click unselected chip → onChange(option)
// ---------------------------------------------------------------------------

describe('MoodPicker — click to select (AC-001)', () => {
  it('clicking an unselected chip emits onChange(option)', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={null} onChangeSpy={spy} />);
    const chips = getChips();

    await userEvent.click(chips[1] as HTMLElement);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith(MOOD_OPTIONS[1]);
  });
});

// ---------------------------------------------------------------------------
// AC-002: Click selected chip → onChange(null) — toggle
// ---------------------------------------------------------------------------

describe('MoodPicker — toggle deselect (AC-002)', () => {
  it('clicking the selected chip emits onChange(null)', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={MOOD_OPTIONS[2]} onChangeSpy={spy} />);
    const chips = getChips();

    await userEvent.click(chips[2] as HTMLElement);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect(spy).toHaveBeenCalledWith(null);
  });
});

// ---------------------------------------------------------------------------
// AC-010: Arrow key navigation with wrap-around
// ---------------------------------------------------------------------------

describe('MoodPicker — keyboard navigation (AC-010)', () => {
  it('Tab focuses the tab-stoppable chip (tabIndex=0)', async () => {
    renderWithProviders(<Harness initial={null} />);
    await userEvent.tab();
    const chips = getChips();
    expect(document.activeElement).toBe(chips[0]);
  });

  it('ArrowRight moves focus from first to second chip', async () => {
    renderWithProviders(<Harness initial={null} />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}');
    const chips = getChips();
    await waitFor(() => {
      expect(document.activeElement).toBe(chips[1]);
    });
  });

  it('ArrowRight wraps from last chip to first', async () => {
    renderWithProviders(<Harness initial={null} />);
    await userEvent.tab();
    // Move to last chip (5 ArrowRight presses from first)
    for (let i = 0; i < 5; i++) {
      await userEvent.keyboard('{ArrowRight}');
    }
    const chips = getChips();
    await waitFor(() => {
      expect(document.activeElement).toBe(chips[5]);
    });
    await userEvent.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(document.activeElement).toBe(chips[0]);
    });
  });

  it('ArrowLeft wraps from first chip to last', async () => {
    renderWithProviders(<Harness initial={null} />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');
    const chips = getChips();
    await waitFor(() => {
      expect(document.activeElement).toBe(chips[5]);
    });
  });

  it('ArrowDown is equivalent to ArrowRight', async () => {
    renderWithProviders(<Harness initial={null} />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowDown}');
    const chips = getChips();
    await waitFor(() => {
      expect(document.activeElement).toBe(chips[1]);
    });
  });

  it('ArrowUp is equivalent to ArrowLeft', async () => {
    renderWithProviders(<Harness initial={null} />);
    await userEvent.tab();
    await userEvent.keyboard('{ArrowUp}');
    const chips = getChips();
    await waitFor(() => {
      expect(document.activeElement).toBe(chips[5]);
    });
  });
});

// ---------------------------------------------------------------------------
// AC-010: Space and Enter toggle selection on focused chip
// ---------------------------------------------------------------------------

describe('MoodPicker — Space/Enter keyboard select (AC-010)', () => {
  it('Space on focused chip selects it (emits onChange(option))', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={null} onChangeSpy={spy} />);
    await userEvent.tab();
    await userEvent.keyboard(' ');
    await waitFor(() => expect(spy).toHaveBeenCalledWith(MOOD_OPTIONS[0]));
  });

  it('Enter on focused chip selects it', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={null} onChangeSpy={spy} />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(spy).toHaveBeenCalledWith(MOOD_OPTIONS[0]));
  });

  it('Space on already-selected chip deselects (emits onChange(null))', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={MOOD_OPTIONS[0]} onChangeSpy={spy} />);
    // First chip is tab-stoppable (it's selected)
    await userEvent.tab();
    await userEvent.keyboard(' ');
    await waitFor(() => expect(spy).toHaveBeenCalledWith(null));
  });

  it('Enter on already-selected chip deselects', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={MOOD_OPTIONS[0]} onChangeSpy={spy} />);
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await waitFor(() => expect(spy).toHaveBeenCalledWith(null));
  });
});

// ---------------------------------------------------------------------------
// AC-007: Invalid value → warn once, no chip selected, no onChange emitted
// ---------------------------------------------------------------------------

describe('MoodPicker — invalid value fallback (AC-007)', () => {
  it('invalid value renders all chips unselected (aria-checked false)', () => {
    const invalidMood = { emoji: '🤔', label: 'pensativo', color: '#123456' };
    renderWithProviders(<Harness initial={invalidMood} />);
    getChips().forEach((chip) => {
      expect(chip).toHaveAttribute('aria-checked', 'false');
    });
  });

  it('invalid value triggers console.warn; same value on re-render does not warn again', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const invalidA = { emoji: '🤔', label: 'pensativo', color: '#111111' };

    // Use a state-controlled container so re-render happens within the same
    // MoodPicker instance (no unmount/remount), testing dedupe behaviour.
    let setMoodExternal!: (_v: MoodPickerValue) => void;
    function ControlledContainer() {
      const [mood, setMood] = useState<MoodPickerValue>(invalidA);
      setMoodExternal = setMood;
      return <MoodPicker value={mood} onChange={jest.fn()} />;
    }

    renderWithProviders(<ControlledContainer />);

    // At least one warn emitted for invalidA on mount.
    expect(warnSpy).toHaveBeenCalled();
    const warnedMessages = warnSpy.mock.calls.map((c) => String(c[0]));
    expect(warnedMessages.some((m) => m.includes('[mood]'))).toBe(true);

    const countAfterMount = warnSpy.mock.calls.length;

    // Trigger a re-render with the same invalid value via state.
    act(() => {
      setMoodExternal(invalidA);
    });
    // Same value → deduped → no additional warn.
    expect(warnSpy.mock.calls.length).toBe(countAfterMount);

    warnSpy.mockRestore();
  });

  it('different invalid value warns again (distinct key)', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const invalidA = { emoji: '🤔', label: 'pensativo', color: '#111111' };
    const invalidB = { emoji: '🧐', label: 'curioso', color: '#222222' };

    let setMoodExternal!: (_v: MoodPickerValue) => void;
    function ControlledContainer() {
      const [mood, setMood] = useState<MoodPickerValue>(invalidA);
      setMoodExternal = setMood;
      return <MoodPicker value={mood} onChange={jest.fn()} />;
    }

    renderWithProviders(<ControlledContainer />);
    const countAfterA = warnSpy.mock.calls.length;

    // Switch to a DIFFERENT invalid value → should warn again.
    act(() => {
      setMoodExternal(invalidB);
    });
    expect(warnSpy.mock.calls.length).toBeGreaterThan(countAfterA);

    warnSpy.mockRestore();
  });

  it('onChange is NOT emitted on mount with invalid value (AC-007)', () => {
    const spy = jest.fn();
    const invalidMood = { emoji: '🤔', label: 'pensativo', color: '#123456' };
    // Suppress warn for this test
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    renderWithProviders(<MoodPicker value={invalidMood} onChange={spy} />);
    expect(spy).not.toHaveBeenCalled();
    jest.restoreAllMocks();
  });
});

// ---------------------------------------------------------------------------
// Inline style: selected chip has backgroundColor, others don't
// ---------------------------------------------------------------------------

describe('MoodPicker — inline style (AC-004)', () => {
  it('only selected chip has backgroundColor style applied', () => {
    const selected = MOOD_OPTIONS[4];
    renderWithProviders(<Harness initial={selected} />);
    const chips = getChips();
    // The selected chip at index 4 should have the color applied
    expect(chips[4]).toHaveStyle({ backgroundColor: selected.color });
    // Other chips should not have this specific background color
    [0, 1, 2, 3, 5].forEach((i) => {
      expect(chips[i]).not.toHaveStyle({ backgroundColor: selected.color });
    });
  });
});

// ---------------------------------------------------------------------------
// React.memo: switching value only re-renders relevant chips
// ---------------------------------------------------------------------------

describe('MoodPicker — React.memo (NFR-001, NFR-002)', () => {
  it('re-rendering with same value does not throw or corrupt DOM', async () => {
    const { rerender } = renderWithProviders(<MoodPicker value={null} onChange={jest.fn()} />);
    rerender(<MoodPicker value={null} onChange={jest.fn()} />);
    // Chips still intact
    expect(getChips()).toHaveLength(6);
  });

  it('switching selected value updates aria-checked correctly', async () => {
    const spy = jest.fn();
    const { rerender } = renderWithProviders(<MoodPicker value={MOOD_OPTIONS[0]} onChange={spy} />);

    let chips = getChips();
    expect(chips[0]).toHaveAttribute('aria-checked', 'true');
    expect(chips[1]).toHaveAttribute('aria-checked', 'false');

    // Switch selection to index 1
    rerender(<MoodPicker value={MOOD_OPTIONS[1]} onChange={spy} />);

    chips = getChips();
    await waitFor(() => {
      expect(chips[0]).toHaveAttribute('aria-checked', 'false');
      expect(chips[1]).toHaveAttribute('aria-checked', 'true');
    });
  });
});

// ---------------------------------------------------------------------------
// AC-011 invariant — keyboard latch is cleared on blur and on click
// (logic-review BATCH-B F1 + F5)
// ---------------------------------------------------------------------------

describe('MoodPicker — keyboard-nav latch (AC-011)', () => {
  it('after arrow-nav + blur, parent value update re-syncs tab-stop to selected chip', async () => {
    const { rerender } = renderWithProviders(
      <MoodPicker value={MOOD_OPTIONS[3]} onChange={jest.fn()} />,
    );

    let chips = getChips();
    expect(chips[3]).toHaveAttribute('tabindex', '0');

    await userEvent.tab();
    await userEvent.keyboard('{ArrowLeft}');

    chips = getChips();
    expect(chips[2]).toHaveAttribute('tabindex', '0');

    // Tab out (blur the radiogroup).
    await userEvent.tab();

    rerender(<MoodPicker value={MOOD_OPTIONS[1]} onChange={jest.fn()} />);

    chips = getChips();
    await waitFor(() => {
      expect(chips[1]).toHaveAttribute('tabindex', '0');
      expect(chips[2]).toHaveAttribute('tabindex', '-1');
    });
  });

  it('click-after-arrow-nav: tab-stop syncs to clicked chip (F5)', async () => {
    function Container() {
      const [v, setV] = useState<MoodPickerValue>(MOOD_OPTIONS[0]);
      return <MoodPicker value={v} onChange={setV} />;
    }

    renderWithProviders(<Container />);

    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');

    let chips = getChips();
    expect(chips[2]).toHaveAttribute('tabindex', '0');

    await userEvent.click(chips[4] as HTMLElement);

    chips = getChips();
    await waitFor(() => {
      expect(chips[4]).toHaveAttribute('tabindex', '0');
      expect(chips[2]).toHaveAttribute('tabindex', '-1');
    });
  });
});

// ---------------------------------------------------------------------------
// AC-010 — keyboard toggle on arrow-reached selected chip (logic-review F3)
// ---------------------------------------------------------------------------

describe('MoodPicker — keyboard toggle on arrow-reached selected chip (AC-010)', () => {
  it('Space on a previously-selected chip reached via arrow-nav emits null', async () => {
    const spy = jest.fn();
    function Container() {
      const [v, setV] = useState<MoodPickerValue>(MOOD_OPTIONS[3]);
      return (
        <MoodPicker
          value={v}
          onChange={(next) => {
            setV(next);
            spy(next);
          }}
        />
      );
    }

    renderWithProviders(<Container />);

    await userEvent.tab();
    await userEvent.keyboard('{ArrowRight}{ArrowRight}');
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}');
    await userEvent.keyboard(' ');

    expect(spy).toHaveBeenLastCalledWith(null);
  });
});

// ---------------------------------------------------------------------------
// AC-007 — A→B→A warn dedupe cycle (logic-review F4)
// ---------------------------------------------------------------------------

describe('MoodPicker — invalid-value warn dedupe cycle (AC-007)', () => {
  it('A→B→A: re-visiting A after B does NOT re-warn for A', () => {
    // Use state-controlled container to keep the same MoodPicker instance
    // across all 3 transitions (mirrors the existing dedup test pattern).
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const invalidA = { emoji: '🤔', label: 'pensativo', color: '#aaa' };
      const invalidB = { emoji: '🌟', label: 'inspirado', color: '#bbb' };

      let setMoodExternal!: (_v: MoodPickerValue) => void;
      function ControlledContainer() {
        const [mood, setMood] = useState<MoodPickerValue>(invalidA);
        setMoodExternal = setMood;
        return <MoodPicker value={mood} onChange={jest.fn()} />;
      }

      renderWithProviders(<ControlledContainer />);
      const countAfterA = warnSpy.mock.calls.length;
      expect(countAfterA).toBeGreaterThanOrEqual(1);

      act(() => {
        setMoodExternal(invalidB);
      });
      const countAfterB = warnSpy.mock.calls.length;
      expect(countAfterB).toBeGreaterThan(countAfterA);

      act(() => {
        setMoodExternal(invalidA);
      });
      // A is already in the warned-keys Set → no new warn.
      expect(warnSpy.mock.calls.length).toBe(countAfterB);
    } finally {
      warnSpy.mockRestore();
    }
  });
});
