/**
 * Notes.undo.integration.test.tsx — FEAT-022 T-011.
 *
 * Cobre o flow completo de undo via BACKSPACE-empty em Notes:
 *   - AC-001 toast aparece após remoção otimista
 *   - AC-002 clique em "Desfazer" restaura o item na posição original
 *   - AC-004 expiração do TTL (10s) commita a remoção sem chamar onChange de novo
 *   - AC-005 stack independente — múltiplas remoções acumulam toasts próprios
 *
 * Mock local de @/features/rich-text-line wira `onBackspaceEmpty` ao Backspace
 * quando o input está vazio (paridade com Notion/Apple Notes). Mantém o arquivo
 * dentro do limite de 250 linhas (CLAUDE.md).
 */

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Note, NotePrefix } from '../../types.js';
import { Notes } from '../Notes.js';

import { UndoToastHost } from '@/features/undo-delete';
import { renderWithProviders, userEvent } from '@/test-utils';

jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
    autoFocus,
    onBackspaceEmpty,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    onEnter?: () => void;
    onBackspaceEmpty?: () => void;
  }) => (
    <input
      type="text"
      role="textbox"
      aria-label={ariaLabel}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' && value === '') {
          e.preventDefault();
          onBackspaceEmpty?.();
        }
      }}
    />
  );

  return { RichTextLine: Editor, RichTextBlock: Editor };
});

function makeNote(id: string, text = '', prefix: NotePrefix = '•'): Note {
  return { id, text, prefix };
}

function Harness({ initial, spy }: { initial: Note[]; spy: (_n: Note[]) => void }) {
  const [value, setValue] = useState<Note[]>(initial);
  return (
    <>
      <Notes
        value={value}
        onChange={(next) => {
          setValue(next);
          spy(next);
        }}
      />
      <UndoToastHost />
    </>
  );
}

async function pressBackspaceOn(editor: HTMLElement) {
  // userEvent.type já dispara keydown — usamos {Backspace} no input vazio.
  editor.focus();
  await userEvent.keyboard('{Backspace}');
}

describe('Notes — BACKSPACE-empty → undo flow (FEAT-022 T-011)', () => {
  it('AC-001: BACKSPACE em nota vazia remove otimisticamente e exibe toast "Nota removida"', async () => {
    const spy = jest.fn();
    renderWithProviders(
      <Harness initial={[makeNote('n1', ''), makeNote('n2', ''), makeNote('n3', '')]} spy={spy} />,
    );

    const editors = screen.getAllByRole('textbox');
    await pressBackspaceOn(editors[1] as HTMLElement); // middle note (n2)

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls[spy.mock.calls.length - 1]?.[0] as Note[];
    expect(emitted.map((n) => n.id)).toEqual(['n1', 'n3']);

    expect(await screen.findByText('Nota removida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desfazer remoção' })).toBeInTheDocument();
  });

  it('AC-002: clicar em "Desfazer" restaura o item na posição original e remove o toast', async () => {
    const spy = jest.fn();
    renderWithProviders(
      <Harness initial={[makeNote('n1', ''), makeNote('n2', ''), makeNote('n3', '')]} spy={spy} />,
    );

    const editors = screen.getAllByRole('textbox');
    await pressBackspaceOn(editors[1] as HTMLElement);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));
    const callsBeforeUndo = spy.mock.calls.length;

    const undoButton = await screen.findByRole('button', { name: 'Desfazer remoção' });
    await userEvent.click(undoButton);

    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(callsBeforeUndo));
    const restored = spy.mock.calls[spy.mock.calls.length - 1]?.[0] as Note[];
    expect(restored.map((n) => n.id)).toEqual(['n1', 'n2', 'n3']);

    await waitFor(() => {
      expect(screen.queryByText('Nota removida')).not.toBeInTheDocument();
    });
  });

  it('AC-004: TTL expira após 10s → toast some, commit definitivo (sem onChange extra)', async () => {
    jest.useFakeTimers();
    try {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const spy = jest.fn();
      renderWithProviders(<Harness initial={[makeNote('n1', ''), makeNote('n2', '')]} spy={spy} />);

      const editors = screen.getAllByRole('textbox');
      (editors[0] as HTMLElement).focus();
      await user.keyboard('{Backspace}');

      expect(spy).toHaveBeenCalledTimes(1);
      expect(screen.getByText('Nota removida')).toBeInTheDocument();
      const callsAfterRemoval = spy.mock.calls.length;

      // Avança para além do TTL (10s). UndoToastHost faz tick a cada 250ms; +1s extra
      // garante que o setTimeout (ttlMs) e o setInterval (countdown) já dispararam.
      await act(async () => {
        jest.advanceTimersByTime(10_001);
      });

      await waitFor(() => {
        expect(screen.queryByText('Nota removida')).not.toBeInTheDocument();
      });
      // Expiração = commit implícito; nenhum onChange adicional após a remoção otimista.
      expect(spy.mock.calls.length).toBe(callsAfterRemoval);
    } finally {
      jest.useRealTimers();
    }
  });

  it('AC-005: duas remoções em sequência empilham toasts independentes', async () => {
    const spy = jest.fn();
    renderWithProviders(
      <Harness initial={[makeNote('n1', ''), makeNote('n2', ''), makeNote('n3', '')]} spy={spy} />,
    );

    const initialEditors = screen.getAllByRole('textbox');
    await pressBackspaceOn(initialEditors[0] as HTMLElement);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    const remainingEditors = screen.getAllByRole('textbox');
    await pressBackspaceOn(remainingEditors[0] as HTMLElement);

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
    await waitFor(() => {
      expect(screen.getAllByText('Nota removida')).toHaveLength(2);
    });
  });
});
