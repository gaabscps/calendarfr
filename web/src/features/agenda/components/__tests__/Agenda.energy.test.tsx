/**
 * Agenda energy propagation tests — FEAT-energy Batch D T-012
 *
 * Covers end-to-end: EnergyButton click in Agenda → onChange emitted with
 * updated slot energy. Verifies useAgenda.onChangeEnergy is wired correctly
 * through Agenda → AgendaSlot → EnergyButton.
 */

import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React, { useState } from 'react';

import { EMPTY_AGENDA } from '../../types.js';
import type { AgendaSlot, AgendaSlots } from '../../types.js';
import { Agenda } from '../Agenda.js';

import { renderWithProviders } from '@/test-utils';

// ---------------------------------------------------------------------------
// Mock RichTextLine — simple input stub (avoids Tiptap in jsdom)
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
// Helpers
// ---------------------------------------------------------------------------

function Harness({ onChangeSpy }: { onChangeSpy: (_v: AgendaSlots) => void }) {
  const [value, setValue] = useState<AgendaSlots>(EMPTY_AGENDA);
  return (
    <Agenda
      value={value}
      onChange={(next: AgendaSlots) => {
        setValue(next);
        onChangeSpy(next);
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Agenda — energy propagation', () => {
  it('propaga energy change para onChange com slot atualizado', async () => {
    const onChange = jest.fn();
    renderWithProviders(<Harness onChangeSpy={onChange} />);

    const energyBtn = screen.getByRole('button', { name: /definir energy.*14/i });
    await userEvent.click(energyBtn);
    await userEvent.click(screen.getByRole('menuitemradio', { name: /em chamas/i }));

    expect(onChange).toHaveBeenCalledTimes(1);
    const next = onChange.mock.calls[0]![0] as AgendaSlots;
    const slot14 = next.find((s: { hour: number }) => s.hour === 14);
    expect(slot14?.energy).toEqual({ emoji: '🔥' });
  });

  it('demais slots permanecem sem energy após alterar um slot', async () => {
    const onChange = jest.fn();
    renderWithProviders(<Harness onChangeSpy={onChange} />);

    await userEvent.click(screen.getByRole('button', { name: /definir energy.*14/i }));
    await userEvent.click(screen.getByRole('menuitemradio', { name: /em chamas/i }));

    const next = onChange.mock.calls[0]![0] as AgendaSlots;
    // All other slots should have energy: null
    next
      .filter((s: AgendaSlot) => s.hour !== 14)
      .forEach((s: AgendaSlot) => {
        expect(s.energy ?? null).toBeNull();
      });
  });
});
