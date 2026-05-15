/**
 * AgendaSlot energy integration tests — FEAT-energy Batch D T-011
 *
 * Covers: EnergyButton rendering in AgendaSlot, onEnergyChange propagation.
 *
 * Strategy: mock RichTextLine to avoid Tiptap in jsdom.
 * EnergyButton + EnergyPalette are real implementations.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AgendaSlot } from '../AgendaSlot.js';

import { renderWithProviders } from '@/test-utils';

// ---------------------------------------------------------------------------
// Mock RichTextLine — simple input stub
// ---------------------------------------------------------------------------
jest.mock('@/features/rich-text-line', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const makeMock =
    (_name: string) =>
    ({
      value,
      onChange,
      ariaLabel,
    }: {
      value: string;
      onChange: (_html: string) => void;
      ariaLabel?: string;
      placeholder?: string;
    }) =>
      React.createElement('input', {
        type: 'text',
        role: 'textbox',
        'aria-label': ariaLabel,
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      });
  return { RichTextLine: makeMock('RichTextLine'), RichTextBlock: makeMock('RichTextBlock') };
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AgendaSlot — energy integration', () => {
  it('renderiza EnergyButton com hour correto', () => {
    renderWithProviders(
      <AgendaSlot
        slot={{ hour: 14, text: '', energy: null }}
        onChange={jest.fn()}
        onEnergyChange={jest.fn()}
        isCurrentHour={false}
      />,
    );
    expect(screen.getByRole('button', { name: /definir energy.*14/i })).toBeInTheDocument();
  });

  it('chama onEnergyChange ao escolher emoji', async () => {
    const onEnergyChange = jest.fn();
    renderWithProviders(
      <AgendaSlot
        slot={{ hour: 14, text: '', energy: null }}
        onChange={jest.fn()}
        onEnergyChange={onEnergyChange}
        isCurrentHour={false}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: /definir energy.*14/i }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /em chamas/i }));
    expect(onEnergyChange).toHaveBeenCalledWith({ emoji: '🔥' });
  });

  it('mostra emoji setado quando energy presente', () => {
    renderWithProviders(
      <AgendaSlot
        slot={{ hour: 14, text: '', energy: { emoji: '🚀' } }}
        onChange={jest.fn()}
        onEnergyChange={jest.fn()}
        isCurrentHour={false}
      />,
    );
    expect(screen.getByRole('button', { name: /energy da hora 14/i })).toHaveTextContent('🚀');
  });
});
