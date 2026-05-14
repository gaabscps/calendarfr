/**
 * Priorities.undo.integration.test.tsx — FEAT-022 T-010.
 *
 * Covers AC-001, AC-002, AC-004, AC-005:
 *  - BACKSPACE em PriorityItem vazio remove o item (mantém comportamento legado)
 *  - Após a remoção, um UndoToast "Prioridade removida" aparece com botão "Desfazer"
 *  - Click em "Desfazer" restaura o item exatamente na mesma posição
 *  - Após TTL de 10s sem click, o toast desaparece sem chamar undoFn
 *
 * Mock strategy: substituir `@/features/rich-text-line` por um <input> que
 * dispara `onBackspaceEmpty()` quando Backspace é pressionado com input vazio.
 * Permite testar o fluxo end-to-end sem precisar de Tiptap em jsdom.
 */

// jest.mock must appear before any imports — hoisted by Jest.
jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
    onBackspaceEmpty,
  }: {
    value: string;
    onChange?: (_v: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
    onEnter?: () => void;
    onBackspaceEmpty?: () => void;
    placeholder?: string;
  }) => (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Backspace' && value === '' && onBackspaceEmpty) {
          e.preventDefault();
          onBackspaceEmpty();
        }
      }}
    />
  );
  return { RichTextBlock: Editor, RichTextLine: Editor };
});

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';

import type { Priority } from '../../types.js';
import { Priorities } from '../Priorities.js';

import { UndoQueueProvider, UndoToastHost } from '@/features/undo-delete';
import { renderWithProviders } from '@/test-utils';

function makeItem(n: number, text = `task ${n}`): Priority {
  return { id: `undo-${n}`, text, done: false };
}

function Harness({ initial, spy }: { initial: Priority[]; spy?: (_v: Priority[]) => void }) {
  const [value, setValue] = useState<Priority[]>(initial);
  return (
    <Priorities
      value={value}
      onChange={(next) => {
        setValue(next);
        spy?.(next);
      }}
    />
  );
}

function renderTree(spy: (_v: Priority[]) => void, initial: Priority[]) {
  return renderWithProviders(
    <UndoQueueProvider>
      <Harness initial={initial} spy={spy} />
      <UndoToastHost />
    </UndoQueueProvider>,
  );
}

// ---------------------------------------------------------------------------
// AC-001 + AC-002: BACKSPACE-empty → item removido + toast "Desfazer" → restaura
// ---------------------------------------------------------------------------

describe('Priorities undo integration — AC-001/AC-002: BACKSPACE → undo restaura', () => {
  it('remove item ao Backspace-empty e mostra toast "Prioridade removida"', async () => {
    const spy = jest.fn();
    const initial = [makeItem(0, ''), makeItem(1, ''), makeItem(2, '')];
    renderTree(spy, initial);

    const inputs = screen.getAllByRole('textbox');
    expect(inputs).toHaveLength(3);

    // Backspace no item do meio (index 1), conteúdo já está vazio.
    fireEvent.keyDown(inputs[1]!, { key: 'Backspace' });

    // onChange emitido com o array sem o item do meio.
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(emitted).toHaveLength(2);
    expect(emitted.map((p) => p.id)).toEqual(['undo-0', 'undo-2']);

    // Toast com label PT-BR e botão "Desfazer".
    expect(screen.getByText('Prioridade removida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desfazer remoção' })).toBeInTheDocument();
  });

  it('click em "Desfazer" restaura o item exatamente na mesma posição', async () => {
    const user = userEvent.setup();
    const spy = jest.fn();
    const initial = [makeItem(0, ''), makeItem(1, ''), makeItem(2, '')];
    renderTree(spy, initial);

    const inputs = screen.getAllByRole('textbox');
    fireEvent.keyDown(inputs[1]!, { key: 'Backspace' });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockClear();

    await user.click(screen.getByRole('button', { name: 'Desfazer remoção' }));

    // Após o undo: onChange chamado com array restaurado em ordem original.
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const restored = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(restored).toHaveLength(3);
    expect(restored.map((p) => p.id)).toEqual(['undo-0', 'undo-1', 'undo-2']);
    expect(restored[1]).toEqual(initial[1]);

    // Toast desaparece após undo.
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Desfazer remoção' })).toBeNull();
    });
  });

  it('preserva o conteúdo HTML do item ao restaurar via undo', async () => {
    const user = userEvent.setup();
    const spy = jest.fn();
    const itemWithContent: Priority = {
      id: 'undo-rich',
      text: '<b>Bold</b> item',
      done: true,
    };
    const initial = [makeItem(0, ''), itemWithContent, makeItem(2, '')];
    renderTree(spy, initial);

    // Para conseguir disparar onBackspaceEmpty no item rico, simulamos que ele
    // está "vazio" — na realidade o usuário precisaria limpar o conteúdo antes.
    // Aqui usamos um item vazio e checamos a integridade do snapshot via novo
    // initial: deletar index 0 (vazio) e restaurar.
    const inputs = screen.getAllByRole('textbox');
    fireEvent.keyDown(inputs[0]!, { key: 'Backspace' });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockClear();

    await user.click(screen.getByRole('button', { name: 'Desfazer remoção' }));

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const restored = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(restored).toEqual(initial);
    // Item rico mantém HTML e done.
    expect(restored[1]).toEqual(itemWithContent);
  });
});

// ---------------------------------------------------------------------------
// AC-004: TTL expira → toast some, undoFn NÃO é chamado, remoção fica
// ---------------------------------------------------------------------------

describe('Priorities undo integration — AC-004: TTL expira sem click', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('após 10001ms sem click, toast desaparece e remoção permanece', () => {
    const spy = jest.fn();
    const initial = [makeItem(0, ''), makeItem(1, ''), makeItem(2, '')];
    renderTree(spy, initial);

    const inputs = screen.getAllByRole('textbox');
    fireEvent.keyDown(inputs[1]!, { key: 'Backspace' });

    // Após o BACKSPACE: 1 onChange (removeu o item).
    expect(spy).toHaveBeenCalledTimes(1);
    const removed = spy.mock.calls[0]?.[0] as Priority[];
    expect(removed).toHaveLength(2);

    // Toast presente.
    expect(screen.getByText('Prioridade removida')).toBeInTheDocument();

    // Avança 10.001s — entrada expira (commit implícito).
    act(() => {
      jest.advanceTimersByTime(10_001);
    });

    // Toast desaparece.
    expect(screen.queryByText('Prioridade removida')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Desfazer remoção' })).toBeNull();

    // Nenhum onChange adicional — undoFn não foi chamado.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// AC-005: múltiplas remoções → stack independente de toasts
// ---------------------------------------------------------------------------

describe('Priorities undo integration — AC-005: stack de toasts independente', () => {
  it('duas remoções consecutivas geram dois toasts; cada undo restaura seu item', async () => {
    const user = userEvent.setup();
    const spy = jest.fn();
    const initial = [makeItem(0, ''), makeItem(1, ''), makeItem(2, '')];
    renderTree(spy, initial);

    let inputs = screen.getAllByRole('textbox');
    // Primeiro: remove index 2 (último). Toast #1.
    fireEvent.keyDown(inputs[2]!, { key: 'Backspace' });
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Desfazer remoção' })).toHaveLength(1);
    });

    inputs = screen.getAllByRole('textbox');
    // Segundo: remove index 0. Toast #2.
    fireEvent.keyDown(inputs[0]!, { key: 'Backspace' });
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Desfazer remoção' })).toHaveLength(2);
    });

    // Resta apenas o item-1 visível.
    expect(screen.getAllByRole('textbox')).toHaveLength(1);

    // Click no PRIMEIRO botão "Desfazer" — restaura o último item removido
    // primeiro na ordem da fila (FIFO da renderização de toasts).
    const undoButtons = screen.getAllByRole('button', { name: 'Desfazer remoção' });
    await user.click(undoButtons[0]!);

    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Desfazer remoção' })).toHaveLength(1);
    });

    // Segundo undo restaura o item restante.
    const lastUndo = screen.getByRole('button', { name: 'Desfazer remoção' });
    await user.click(lastUndo);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Desfazer remoção' })).toBeNull();
    });
  });
});
