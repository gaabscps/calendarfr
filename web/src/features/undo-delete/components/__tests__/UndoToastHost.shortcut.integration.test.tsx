/**
 * UndoToastHost.shortcut.integration.test.tsx — FEAT-022 T-015.
 *
 * Cobre AC-012 e AC-013 end-to-end:
 *  - AC-012: Cmd/Ctrl+Z global (foco fora de Tiptap) dispara o undo da última
 *    entrada da fila — item restaurado e toast removido.
 *  - AC-013: Cmd/Ctrl+Z com foco dentro de elemento `[data-tiptap-editor]`
 *    é passthrough — undo NÃO acionado e toast permanece.
 *
 * Estratégia: monta `Priorities` real + `UndoToastHost` sob `UndoQueueProvider`,
 * mockando `@/features/rich-text-line` para expor um <input> dentro de um
 * wrapper `[data-tiptap-editor]` (paridade com a estrutura real do RichTextLine).
 * Assim conseguimos:
 *   1. Disparar BACKSPACE-empty para enfileirar undo de verdade via Priorities.
 *   2. Validar passthrough quando o activeElement está dentro do editor mockado.
 */

// jest.mock precisa ficar antes dos imports — Jest faz hoist.
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
    // Wrapper com `data-tiptap-editor` reproduz a estrutura real do
    // RichTextLine — necessário para validar o passthrough do Cmd+Z.
    <div data-tiptap-editor="">
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
    </div>
  );
  return { RichTextBlock: Editor, RichTextLine: Editor };
});

import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import { Priorities } from '@/features/priorities';
import type { Priority } from '@/features/priorities';
import { UndoQueueProvider, UndoToastHost } from '@/features/undo-delete';
import { renderWithProviders } from '@/test-utils';

function makeItem(n: number, text = `task ${n}`): Priority {
  return { id: `shortcut-${n}`, text, done: false };
}

function Harness({ initial, spy }: { initial: Priority[]; spy: (_v: Priority[]) => void }) {
  const [value, setValue] = useState<Priority[]>(initial);
  return (
    <Priorities
      value={value}
      onChange={(next) => {
        setValue(next);
        spy(next);
      }}
    />
  );
}

function renderTree(spy: (_v: Priority[]) => void, initial: Priority[]) {
  // Wrap explícito de UndoQueueProvider+UndoToastHost: `renderWithProviders`
  // já injeta um UndoQueueProvider externo, mas o Host precisa estar DENTRO
  // do mesmo provider que o Priorities. O Provider interno acaba sendo o
  // único acessado pelos consumers — comportamento idêntico ao T-010.
  return renderWithProviders(
    <UndoQueueProvider>
      <Harness initial={initial} spy={spy} />
      <button type="button" data-testid="outside-button">
        outside
      </button>
      <UndoToastHost />
    </UndoQueueProvider>,
  );
}

// ---------------------------------------------------------------------------
// AC-012 — Cmd/Ctrl+Z global restaura quando foco fora de Tiptap
// ---------------------------------------------------------------------------

describe('UndoToastHost shortcut integration — AC-012: Cmd/Ctrl+Z global', () => {
  it('Cmd+Z com foco FORA de [data-tiptap-editor] restaura o último item removido', async () => {
    const spy = jest.fn();
    const initial = [makeItem(0, ''), makeItem(1, ''), makeItem(2, '')];
    renderTree(spy, initial);

    // BACKSPACE-empty no item do meio para enfileirar undo de verdade.
    const inputs = screen.getAllByRole('textbox');
    fireEvent.keyDown(inputs[1]!, { key: 'Backspace' });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const afterRemove = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(afterRemove).toHaveLength(2);
    expect(afterRemove.map((p) => p.id)).toEqual(['shortcut-0', 'shortcut-2']);

    // Toast presente.
    expect(screen.getByText('Prioridade removida')).toBeInTheDocument();

    spy.mockClear();

    // Move foco para FORA de qualquer wrapper [data-tiptap-editor].
    const outside = screen.getByTestId('outside-button') as HTMLButtonElement;
    outside.focus();
    expect(document.activeElement).toBe(outside);
    expect(outside.closest('[data-tiptap-editor]')).toBeNull();

    // Dispara Cmd+Z global.
    act(() => {
      fireEvent.keyDown(window, { key: 'z', metaKey: true });
    });

    // Item restaurado: novo onChange com array original.
    await waitFor(() => expect(spy).toHaveBeenCalled());
    const restored = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(restored).toHaveLength(3);
    expect(restored.map((p) => p.id)).toEqual(['shortcut-0', 'shortcut-1', 'shortcut-2']);

    // Toast removido.
    await waitFor(() => {
      expect(screen.queryByText('Prioridade removida')).toBeNull();
    });
  });

  it('Ctrl+Z (non-Mac) com foco fora de Tiptap também restaura', async () => {
    const spy = jest.fn();
    const initial = [makeItem(0, ''), makeItem(1, ''), makeItem(2, '')];
    renderTree(spy, initial);

    const inputs = screen.getAllByRole('textbox');
    fireEvent.keyDown(inputs[2]!, { key: 'Backspace' });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockClear();

    // Foco em botão fora do editor.
    const outside = screen.getByTestId('outside-button') as HTMLButtonElement;
    outside.focus();

    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const restored = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(restored.map((p) => p.id)).toEqual(['shortcut-0', 'shortcut-1', 'shortcut-2']);
  });
});

// ---------------------------------------------------------------------------
// AC-013 — Passthrough quando foco está dentro de [data-tiptap-editor]
// ---------------------------------------------------------------------------

describe('UndoToastHost shortcut integration — AC-013: Tiptap passthrough', () => {
  it('Cmd+Z com foco DENTRO de [data-tiptap-editor] NÃO aciona undo e mantém toast', async () => {
    const spy = jest.fn();
    const initial = [makeItem(0, ''), makeItem(1, ''), makeItem(2, '')];
    renderTree(spy, initial);

    // Remove um item via BACKSPACE-empty (gera toast).
    let inputs = screen.getAllByRole('textbox');
    fireEvent.keyDown(inputs[1]!, { key: 'Backspace' });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(screen.getByText('Prioridade removida')).toBeInTheDocument();
    spy.mockClear();

    // Foca o primeiro input REMANESCENTE — está dentro de [data-tiptap-editor].
    inputs = screen.getAllByRole('textbox');
    const editorInput = inputs[0] as HTMLInputElement;
    editorInput.focus();
    expect(document.activeElement).toBe(editorInput);
    expect(editorInput.closest('[data-tiptap-editor]')).not.toBeNull();

    // Cmd+Z global — deve ser ignorado (passthrough para o editor).
    act(() => {
      fireEvent.keyDown(window, { key: 'z', metaKey: true });
    });

    // Nenhum onChange disparado pelo undo.
    expect(spy).not.toHaveBeenCalled();

    // Toast permanece.
    expect(screen.getByText('Prioridade removida')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Desfazer remoção' })).toBeInTheDocument();
  });

  it('Ctrl+Z com foco DENTRO de [data-tiptap-editor] também é passthrough', async () => {
    const spy = jest.fn();
    const initial = [makeItem(0, ''), makeItem(1, ''), makeItem(2, '')];
    renderTree(spy, initial);

    let inputs = screen.getAllByRole('textbox');
    fireEvent.keyDown(inputs[0]!, { key: 'Backspace' });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    spy.mockClear();

    inputs = screen.getAllByRole('textbox');
    const editorInput = inputs[0] as HTMLInputElement;
    editorInput.focus();

    act(() => {
      fireEvent.keyDown(window, { key: 'z', ctrlKey: true });
    });

    expect(spy).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Desfazer remoção' })).toBeInTheDocument();
  });
});
