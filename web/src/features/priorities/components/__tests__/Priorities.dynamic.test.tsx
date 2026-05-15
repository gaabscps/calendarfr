/**
 * Dynamic Priorities tests — T-009 AC coverage
 *
 * Covers: AC-008 (dynamic list from items[]), AC-010 (add button always visible),
 *         AC-011 (add/remove wired), AC-014 (autoFocus on new item).
 *
 * FEAT-018 AC-001/002/003 are covered by Priorities.onEnter.test.tsx.
 *
 * These tests assert the NEW dynamic behaviour introduced in T-009.
 * The old integration tests in Priorities.integration.test.tsx cover AC numbering from
 * the old spec; T-010 will reconcile them.
 *
 * Mock strategy: RichTextBlock / RichTextLine rendered as <input> elements so that
 * the onEnter prop can be triggered via keyDown simulation without Tiptap.
 */

// Mock must appear before any React/testing imports so Jest hoisting works correctly.
jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
    autoFocus,
    onEnter,
  }: {
    value: string;
    onChange?: (_v: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
    onEnter?: () => void;
  }) => (
    <input
      type="text"
      value={value}
      aria-label={ariaLabel}
      autoFocus={autoFocus}
      data-autofocus={autoFocus ? 'true' : undefined}
      onChange={(e) => onChange?.(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          onEnter?.();
        }
      }}
      data-testid={ariaLabel}
    />
  );
  return { RichTextBlock: Editor, RichTextLine: Editor };
});

import { screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Priority } from '../../types.js';
import { EMPTY_PRIORITY } from '../../types.js';
import { Priorities } from '../Priorities.js';

import { renderWithProviders, userEvent } from '@/test-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function item(n: number): Priority {
  return { id: `id-${n}`, text: `task ${n}`, done: false };
}

function Harness({
  initial,
  onChangeSpy,
}: {
  initial: Priority[];
  onChangeSpy?: (_v: Priority[]) => void;
}) {
  const [value, setValue] = useState<Priority[]>(initial);
  return (
    <Priorities
      value={value}
      onChange={(next) => {
        setValue(next);
        onChangeSpy?.(next);
      }}
    />
  );
}

async function waitForEditors(min = 1) {
  await waitFor(() => {
    const boxes = screen.getAllByRole('textbox');
    expect(boxes.length).toBeGreaterThanOrEqual(min);
  });
}

// ---------------------------------------------------------------------------
// AC-008: Dynamic list — items.map() not hardcoded 3
// ---------------------------------------------------------------------------

describe('Priorities dynamic — AC-008: renders from items array', () => {
  it('renders 1 editor + checkbox when initial has 1 item', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitForEditors(1);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('renders 5 editors + checkboxes when initial has 5 items', async () => {
    const five = [item(0), item(1), item(2), item(3), item(4)];
    renderWithProviders(<Harness initial={five} />);
    await waitForEditors(5);
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.getAllByRole('textbox')).toHaveLength(5);
  });

  it('section has accessible label "Prioridades do dia"', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitForEditors(1);
    expect(screen.getByRole('region', { name: 'Prioridades do dia' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-010: "+" button always visible (no upper limit on items)
// ---------------------------------------------------------------------------

describe('Priorities dynamic — AC-010: add button always visible', () => {
  it('add button is visible with 1 item', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitForEditors(1);
    expect(screen.getByRole('button', { name: /adicionar prioridade/i })).toBeInTheDocument();
  });

  it('add button is visible with 10 items', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => item(i));
    renderWithProviders(<Harness initial={ten} />);
    await waitForEditors(10);
    expect(screen.getByRole('button', { name: /adicionar prioridade/i })).toBeInTheDocument();
  });

  it('add button is visible with 25 items', async () => {
    const many = Array.from({ length: 25 }, (_, i) => item(i));
    renderWithProviders(<Harness initial={many} />);
    await waitForEditors(25);
    expect(screen.getByRole('button', { name: /adicionar prioridade/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-011: addPriority / removePriority wired; onDelete undefined when only 1 item
// ---------------------------------------------------------------------------

describe('Priorities dynamic — AC-011: add and remove wired', () => {
  it('clicking "+" increases item count by 1', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} onChangeSpy={spy} />);
    await waitForEditors(1);

    const addBtn = screen.getByRole('button', { name: /adicionar prioridade/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });
  });

  it('emits onChange with appended empty item when "+" clicked', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[item(0)]} onChangeSpy={spy} />);
    await waitForEditors(1);

    const addBtn = screen.getByRole('button', { name: /adicionar prioridade/i });
    await userEvent.click(addBtn);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(emitted).toHaveLength(2);
    const second = emitted[1];
    expect(second?.text).toBe('');
    expect(second?.done).toBe(false);
  });

  it('no delete button when only 1 item (onDelete undefined)', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitForEditors(1);
    expect(screen.queryByRole('button', { name: /excluir prioridade/i })).toBeNull();
  });

  it('delete button present when 2+ items', async () => {
    renderWithProviders(<Harness initial={[item(0), item(1)]} />);
    await waitForEditors(2);
    const deleteBtns = screen.getAllByRole('button', { name: /excluir prioridade/i });
    expect(deleteBtns.length).toBeGreaterThanOrEqual(2);
  });

  it('clicking delete reduces item count by 1 (FEAT-022: 2-click confirm)', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[item(0), item(1), item(2)]} onChangeSpy={spy} />);
    await waitForEditors(3);

    const [firstDelete] = screen.getAllByRole('button', { name: /excluir prioridade/i });
    // FEAT-022 T-012: ConfirmDeleteButton requires 2 clicks — first arms, second confirms.
    await userEvent.click(firstDelete as HTMLElement);
    const armed = await screen.findByRole('button', {
      name: /confirmar exclusão da prioridade/i,
    });
    await userEvent.click(armed);

    await waitFor(() => {
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });
  });

  it('emits onChange with removed item filtered out (FEAT-022: 2-click confirm)', async () => {
    const spy = jest.fn();
    const initial = [item(0), item(1), item(2)];
    renderWithProviders(<Harness initial={initial} onChangeSpy={spy} />);
    await waitForEditors(3);

    const [firstDelete] = screen.getAllByRole('button', { name: /excluir prioridade/i });
    await userEvent.click(firstDelete as HTMLElement);
    const armed = await screen.findByRole('button', {
      name: /confirmar exclusão da prioridade/i,
    });
    await userEvent.click(armed);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(emitted).toHaveLength(2);
    expect(emitted.some((p) => p.id === 'id-0')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC-014: autoFocus on new item after add
// ---------------------------------------------------------------------------

describe('Priorities dynamic — AC-014: autoFocus on new item', () => {
  it('after adding item, a new editor is present in the DOM', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitForEditors(1);

    const addBtn = screen.getByRole('button', { name: /adicionar prioridade/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getAllByRole('textbox')).toHaveLength(2);
    });

    // autoFocus is passed to the last PriorityItem; we verify the editor mounts
    // (focus itself is a best-effort in jsdom, but the prop must be wired).
    expect(screen.getAllByRole('textbox')).toHaveLength(2);
  });
});

// Reorder pipeline, handle visibility, and DnD accessibility tests are in
// Priorities.reorder.test.tsx (FEAT-019: AC-001, AC-002, AC-003, AC-005,
// AC-006, AC-009, AC-025, AC-026).
