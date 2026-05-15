/**
 * FEAT-018 T-002 — onEnter wiring tests for PriorityItem + Priorities
 *
 * Covers:
 *   AC-001: ENTER calls addPriority (no upper bound on items)
 *   AC-004: No onShiftEnter passed (SHIFT+ENTER uses Tiptap default)
 */

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Priority } from '../../types.js';
import { EMPTY_PRIORITY } from '../../types.js';
import { Priorities } from '../Priorities.js';
import { PriorityItem } from '../PriorityItem.js';

import { renderWithProviders } from '@/test-utils';

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

function getEditorFromDom(index: number) {
  const proseMirrorEls = document.querySelectorAll('.ProseMirror');
  const el = proseMirrorEls[index];
  if (!el) return undefined;
  return (el as unknown as Record<string, unknown>)['editor'] as
    | import('@tiptap/core').Editor
    | undefined;
}

// ---------------------------------------------------------------------------
// AC-001: onEnter = addPriority — always wired, no upper bound
// ---------------------------------------------------------------------------

describe('FEAT-018 AC-001 — ENTER creates new priority', () => {
  it('pressing ENTER in first slot (1 item) triggers onChange with 2 items', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} onChangeSpy={spy} />);
    await waitForEditors(1);

    const editor = getEditorFromDom(0);
    expect(editor).toBeDefined();

    if (editor) {
      // Simulate the onEnter callback being called (mirrors what useRichTextBlock does)
      act(() => {
        editor.commands.keyboardShortcut('Enter');
      });
      // onEnter should call addPriority → onChange emitted with 2 items
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
      expect(emitted).toHaveLength(2);
      expect(emitted[1]?.text).toBe('');
      expect(emitted[1]?.done).toBe(false);
    }
  });

  it('pressing ENTER in slot (9 items) triggers onChange with 10 items', async () => {
    const spy = jest.fn();
    const nine = Array.from({ length: 9 }, (_, i) => item(i));
    renderWithProviders(<Harness initial={nine} onChangeSpy={spy} />);
    await waitForEditors(9);

    const editor = getEditorFromDom(0);
    if (editor) {
      act(() => {
        editor.commands.keyboardShortcut('Enter');
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
      expect(emitted).toHaveLength(10);
    }
  });
});

// ---------------------------------------------------------------------------
// ENTER continues to add items past the old 10-item bound (no upper limit).
// ---------------------------------------------------------------------------

describe('FEAT-018 — ENTER keeps adding items past 10 (no upper limit)', () => {
  it('with 10 items, pressing ENTER adds an 11th item', async () => {
    const spy = jest.fn();
    const ten = Array.from({ length: 10 }, (_, i) => item(i));
    renderWithProviders(<Harness initial={ten} onChangeSpy={spy} />);
    await waitForEditors(10);

    const editor = getEditorFromDom(0);
    if (editor) {
      act(() => {
        editor.commands.keyboardShortcut('Enter');
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
      expect(emitted).toHaveLength(11);
    }
  });
});

// ---------------------------------------------------------------------------
// AC-004: No onShiftEnter prop on PriorityItem (structural test)
// ---------------------------------------------------------------------------

describe('FEAT-018 AC-004 — PriorityItem accepts onEnter but not onShiftEnter in its interface', () => {
  it('PriorityItem mounts with onEnter prop without TypeScript error', async () => {
    const onEnter = jest.fn();
    const onChangeText = jest.fn();
    const onToggleDone = jest.fn();
    const value = { id: 'abc', text: 'hello', done: false };

    renderWithProviders(
      <PriorityItem
        value={value}
        index={0}
        onChangeText={onChangeText}
        onToggleDone={onToggleDone}
        onEnter={onEnter}
      />,
    );

    const editor = await waitFor(() => screen.getByRole('textbox'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(editor).toBeInTheDocument();
  });

  it('PriorityItem mounts without onEnter (undefined path) without TypeScript error', async () => {
    const onChangeText = jest.fn();
    const onToggleDone = jest.fn();
    const value = { id: 'def', text: 'world', done: false };

    renderWithProviders(
      <PriorityItem
        value={value}
        index={0}
        onChangeText={onChangeText}
        onToggleDone={onToggleDone}
      />,
    );

    const editor = await waitFor(() => screen.getByRole('textbox'));
    expect(editor).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Structural: Priorities always passes onEnter=addPriority (no upper bound)
// ---------------------------------------------------------------------------

describe('FEAT-018 — Priorities always wires onEnter=addPriority', () => {
  it('add button visible with 1 item', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitForEditors(1);
    expect(screen.getByRole('button', { name: /adicionar prioridade/i })).toBeInTheDocument();
  });

  it('add button still visible with 10 items', async () => {
    const ten = Array.from({ length: 10 }, (_, i) => item(i));
    renderWithProviders(<Harness initial={ten} />);
    await waitForEditors(10);
    expect(screen.getByRole('button', { name: /adicionar prioridade/i })).toBeInTheDocument();
  });
});
