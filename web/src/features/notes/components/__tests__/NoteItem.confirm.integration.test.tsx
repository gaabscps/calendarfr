/**
 * FEAT-022 T-013 — NoteItem × ConfirmDeleteButton integration.
 *
 * Cobre:
 *  - AC-006: primeiro clique no botão de remover entra em estado "Confirmar?";
 *            o segundo clique confirma e chama onChange (remoção).
 *  - AC-007: expiração do timer de 3s reverte para idle sem remover.
 *  - AC-008: pointerdown fora cancela o estado confirming sem remover.
 *  - AC-009: o handler de remoção (onChange) só é disparado após confirmação.
 *
 * RichTextBlock é mockado para <input> per file (regra inviolável #3).
 */

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Note, NotePrefix } from '../../types.js';
import { Notes } from '../Notes.js';

import { renderWithProviders, userEvent } from '@/test-utils';

jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
    autoFocus,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
  }) => (
    <input
      type="text"
      role="textbox"
      aria-label={ariaLabel}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  return { RichTextLine: Editor, RichTextBlock: Editor };
});

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: overrides.id ?? `n-${Math.random().toString(36).slice(2, 8)}`,
    prefix: (overrides.prefix as NotePrefix) ?? '•',
    text: overrides.text ?? '',
  };
}

function Container({ initial, spy }: { initial: Note[]; spy?: (_n: Note[]) => void }) {
  const [value, setValue] = useState<Note[]>(initial);
  return (
    <Notes
      value={value}
      onChange={(next) => {
        setValue(next);
        spy?.(next);
      }}
    />
  );
}

describe('NoteItem × ConfirmDeleteButton (FEAT-022 AC-006..AC-009)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('AC-006: primeiro clique entra em confirming; segundo clique remove a nota', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const n1 = makeNote({ id: 'n1', text: 'first' });
    const n2 = makeNote({ id: 'n2', text: 'second' });
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1, n2]} spy={spy} />);

    const removeButtons = screen.getAllByRole('button', { name: 'Remover nota' });
    const target = removeButtons[0] as HTMLButtonElement;

    // 1º clique → confirming.
    await user.click(target);
    const confirming = await screen.findByRole('button', {
      name: 'Confirmar remoção da nota',
    });
    expect(confirming).toHaveTextContent('Confirmar?');
    expect(confirming).toHaveAttribute('aria-pressed', 'true');
    expect(spy).not.toHaveBeenCalled();

    // 2º clique → confirma.
    await user.click(confirming);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const emitted = spy.mock.calls[0]?.[0] as Note[];
    expect(emitted).toHaveLength(1);
    expect(emitted[0]?.id).toBe('n2');
  });

  it('AC-007: timer de 3s expira e reverte para idle sem remover', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const n1 = makeNote({ id: 'n1', text: 'alpha' });
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1]} spy={spy} />);

    const removeButton = screen.getByRole('button', { name: 'Remover nota' });
    await user.click(removeButton);

    // Estado confirming armado.
    expect(
      await screen.findByRole('button', { name: 'Confirmar remoção da nota' }),
    ).toBeInTheDocument();

    // Avança 3s — timer expira, volta para idle.
    act(() => {
      jest.advanceTimersByTime(3000);
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remover nota' })).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'Confirmar remoção da nota' }),
    ).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('AC-008: pointerdown fora cancela o confirming sem remover', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const n1 = makeNote({ id: 'n1', text: 'alpha' });
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1]} spy={spy} />);

    const removeButton = screen.getByRole('button', { name: 'Remover nota' });
    await user.click(removeButton);
    expect(
      await screen.findByRole('button', { name: 'Confirmar remoção da nota' }),
    ).toBeInTheDocument();

    // Click no editor (fora do botão) cancela o confirming.
    const editor = screen.getByRole('textbox');
    await user.click(editor);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Remover nota' })).toBeInTheDocument();
    });
    expect(
      screen.queryByRole('button', { name: 'Confirmar remoção da nota' }),
    ).not.toBeInTheDocument();
    expect(spy).not.toHaveBeenCalled();
  });

  it('AC-009: onChange só é chamado após a confirmação (segundo clique)', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const n1 = makeNote({ id: 'n1' });
    const spy = jest.fn();
    renderWithProviders(<Container initial={[n1]} spy={spy} />);

    // 1º clique não dispara onChange.
    await user.click(screen.getByRole('button', { name: 'Remover nota' }));
    expect(spy).not.toHaveBeenCalled();

    // 2º clique dispara onChange uma única vez.
    const confirming = await screen.findByRole('button', {
      name: 'Confirmar remoção da nota',
    });
    await user.click(confirming);
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    expect((spy.mock.calls[0]?.[0] as Note[]).length).toBe(0);
  });
});
