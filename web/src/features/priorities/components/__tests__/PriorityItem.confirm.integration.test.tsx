/**
 * PriorityItem.confirm.integration.test.tsx
 *
 * FEAT-022 T-012 — verifica que o botão de exclusão no PriorityItem usa
 * `ConfirmDeleteButton` (2-click inline) e cobre AC-006, AC-007, AC-008, AC-009.
 *
 * - AC-006: primeiro clique arma; segundo clique confirma.
 * - AC-007: idle mostra X (children); confirming mostra "Confirmar?".
 * - AC-008: timeout 3s reverte sem confirmar.
 * - AC-009: pointerdown fora do botão reverte sem confirmar.
 *
 * Tiptap/RichTextBlock é mockado como <input> — irrelevante pro teste do botão.
 */

// Mock pré-import, hoisted pelo Jest.
jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange?: (_v: string) => void;
    ariaLabel?: string;
  }) => (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value)}
    />
  );
  return { RichTextBlock: Editor, RichTextLine: Editor };
});

import { act, fireEvent, screen } from '@testing-library/react';
import React from 'react';

import type { Priority } from '../../types.js';
import { PriorityItem } from '../PriorityItem';

import { renderWithDnd, userEvent } from '@/test-utils/renderWithDnd';

const base: Priority = { id: 'p-1', text: '<p>foo</p>', done: false };

function renderItem(props: Partial<React.ComponentProps<typeof PriorityItem>> = {}) {
  const defaultProps: React.ComponentProps<typeof PriorityItem> = {
    value: base,
    index: 0,
    onChangeText: jest.fn(),
    onToggleDone: jest.fn(),
    ...props,
  };
  return renderWithDnd(<PriorityItem {...defaultProps} />, [base.id]);
}

describe('PriorityItem — ConfirmDeleteButton (FEAT-022 T-012)', () => {
  it('AC-007: idle state shows X icon with "Excluir prioridade N" aria-label', () => {
    renderItem({ onDelete: jest.fn(), index: 0 });
    const btn = screen.getByRole('button', { name: 'Excluir prioridade 1' });
    expect(btn).toBeInTheDocument();
    expect(btn.textContent).toBe('×');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('AC-006: first click arms (transitions to confirming); does NOT call onDelete', async () => {
    const onDelete = jest.fn();
    renderItem({ onDelete, index: 1 });

    const idleBtn = screen.getByRole('button', { name: 'Excluir prioridade 2' });
    await userEvent.click(idleBtn);

    const armed = screen.getByRole('button', {
      name: 'Confirmar exclusão da prioridade 2',
    });
    expect(armed).toBeInTheDocument();
    expect(armed.textContent).toBe('Confirmar?');
    expect(armed).toHaveAttribute('aria-pressed', 'true');
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('AC-006: second click on confirming button calls onDelete exactly once', async () => {
    const onDelete = jest.fn();
    renderItem({ onDelete, index: 0 });

    await userEvent.click(screen.getByRole('button', { name: 'Excluir prioridade 1' }));
    await userEvent.click(
      screen.getByRole('button', { name: 'Confirmar exclusão da prioridade 1' }),
    );

    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('AC-008: confirming reverts to idle after 3s timeout without calling onDelete', async () => {
    jest.useFakeTimers();
    try {
      const onDelete = jest.fn();
      // userEvent must be configured for fake timers.
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      renderItem({ onDelete, index: 0 });

      await user.click(screen.getByRole('button', { name: 'Excluir prioridade 1' }));
      expect(
        screen.getByRole('button', { name: 'Confirmar exclusão da prioridade 1' }),
      ).toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(3001);
      });

      expect(screen.getByRole('button', { name: 'Excluir prioridade 1' })).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Confirmar exclusão da prioridade 1' }),
      ).toBeNull();
      expect(onDelete).not.toHaveBeenCalled();
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-009: pointerdown outside the button reverts to idle without calling onDelete', async () => {
    const onDelete = jest.fn();
    renderItem({ onDelete, index: 0 });

    await userEvent.click(screen.getByRole('button', { name: 'Excluir prioridade 1' }));
    expect(
      screen.getByRole('button', { name: 'Confirmar exclusão da prioridade 1' }),
    ).toBeInTheDocument();

    // Dispatch a real pointerdown event on document.body — outside the button.
    act(() => {
      fireEvent.pointerDown(document.body);
    });

    expect(screen.getByRole('button', { name: 'Excluir prioridade 1' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar exclusão da prioridade 1' })).toBeNull();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it('does NOT render the button when onDelete is undefined', () => {
    renderItem({ index: 0 });
    expect(screen.queryByRole('button', { name: /excluir prioridade/i })).toBeNull();
  });
});
