/**
 * Isolation tests for MoodChip — direct unit harness.
 *
 * Covers: AC-004 (selected backgroundColor), AC-009 (role=radio + aria-label),
 *         AC-010 (Space/Enter/Arrow keys).
 *
 * Strategy: render MoodChip without MoodPicker. Asserts the chip's contract
 * with its parent (props in → behavior + DOM out).
 */

import { act, screen } from '@testing-library/react';

import { MOOD_OPTIONS } from '../../lib/moodOptions.js';
import { MoodChip } from '../MoodChip.js';

import { renderWithProviders, userEvent } from '@/test-utils';

describe('MoodChip — isolation', () => {
  it('renders with role=radio and aria-checked reflecting isSelected', () => {
    const option = MOOD_OPTIONS[0];
    renderWithProviders(
      <MoodChip
        option={option}
        isSelected={false}
        tabIndex={0}
        onSelect={jest.fn()}
        onArrowNav={jest.fn()}
        index={0}
        total={6}
      />,
    );

    const chip = screen.getByRole('radio');
    expect(chip).toHaveAttribute('aria-checked', 'false');
    expect(chip).toHaveAttribute('aria-label', `${option.label}, humor 1 de 6`);
  });

  it('calls onSelect when clicked', async () => {
    const option = MOOD_OPTIONS[1];
    const onSelect = jest.fn();
    renderWithProviders(
      <MoodChip
        option={option}
        isSelected={false}
        tabIndex={0}
        onSelect={onSelect}
        onArrowNav={jest.fn()}
        index={1}
        total={6}
      />,
    );

    await userEvent.click(screen.getByRole('radio'));
    expect(onSelect).toHaveBeenCalledWith(option);
  });

  it.each([
    ['{ArrowRight}', 'next' as const],
    ['{ArrowDown}', 'next' as const],
    ['{ArrowLeft}', 'prev' as const],
    ['{ArrowUp}', 'prev' as const],
  ])('calls onArrowNav("%s") on %s key', async (key, expected) => {
    const onArrowNav = jest.fn();
    renderWithProviders(
      <MoodChip
        option={MOOD_OPTIONS[0]}
        isSelected={false}
        tabIndex={0}
        onSelect={jest.fn()}
        onArrowNav={onArrowNav}
        index={0}
        total={6}
      />,
    );

    const chip = screen.getByRole('radio');
    act(() => {
      chip.focus();
    });
    await userEvent.keyboard(key);
    expect(onArrowNav).toHaveBeenCalledWith(expected);
  });

  it('selected chip has backgroundColor via inline style', () => {
    const option = MOOD_OPTIONS[0];
    renderWithProviders(
      <MoodChip
        option={option}
        isSelected={true}
        tabIndex={0}
        onSelect={jest.fn()}
        onArrowNav={jest.fn()}
        index={0}
        total={6}
      />,
    );
    const chip = screen.getByRole('radio');
    expect(chip).toHaveStyle({ backgroundColor: option.color });
    expect(chip).toHaveAttribute('aria-checked', 'true');
  });

  it('Space and Enter both fire onSelect when chip is focused', async () => {
    const onSelect = jest.fn();
    const option = MOOD_OPTIONS[2];
    renderWithProviders(
      <MoodChip
        option={option}
        isSelected={false}
        tabIndex={0}
        onSelect={onSelect}
        onArrowNav={jest.fn()}
        index={2}
        total={6}
      />,
    );

    const chip = screen.getByRole('radio');
    act(() => {
      chip.focus();
    });
    await userEvent.keyboard(' ');
    await userEvent.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledTimes(2);
    expect(onSelect).toHaveBeenNthCalledWith(1, option);
    expect(onSelect).toHaveBeenNthCalledWith(2, option);
  });
});
