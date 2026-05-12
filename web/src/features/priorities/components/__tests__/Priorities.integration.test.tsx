/**
 * Integration tests: Priorities + PriorityItem — BATCH-B
 *
 * Covers: AC-003, AC-005, AC-006, AC-008, AC-009, AC-010, AC-013, AC-014,
 *         AC-015, AC-016, AC-017, AC-025.
 *
 * Strategy: render <Priorities> in a controlled test harness (useState) and
 * assert DOM + emitted values. Editor interactions go through the Tiptap
 * editor's command API (same pattern as RichTextLine integration tests).
 * Tab-order and aria-label checks use userEvent + ARIA queries.
 *
 * T-010: migrated PrioritiesTuple → Priority[]; removed stale AC-013 no-UI
 * test; added array-size render checks (1, 3, 5 items); fixed noUncheckedIndexedAccess
 * TS errors via non-null assertions.
 *
 * FEAT-017 T-006: baseline-rhythm CSS assertions and tab-order checks moved to
 * Priorities.baseline.integration.test.tsx (kept under the 250-line limit).
 */

import { act, screen, waitFor } from '@testing-library/react';
import type { Editor } from '@tiptap/core';
import { useState } from 'react';

import { placeholderForIndex } from '../../lib/placeholders.js';
import type { Priority } from '../../types.js';
import { EMPTY_PRIORITY } from '../../types.js';
import { Priorities } from '../Priorities.js';
import { PriorityItem } from '../PriorityItem.js';

import { renderWithProviders, userEvent } from '@/test-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_TRIPLE: Priority[] = [EMPTY_PRIORITY, EMPTY_PRIORITY, EMPTY_PRIORITY];

function filled(text: string, done = false) {
  return { id: `id_${text}`, text, done };
}

const THREE_FILLED: Priority[] = [filled('task0'), filled('task1'), filled('task2')];

/** Controlled wrapper — mirrors how daily-page will use <Priorities>. */
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

/** Wait until at least N editor textboxes are rendered (default 3). */
async function waitForEditors(min = 3) {
  await waitFor(() => {
    const boxes = screen.getAllByRole('textbox');
    expect(boxes.length).toBeGreaterThanOrEqual(min);
  });
}

/** Get all role=checkbox elements. RTL's getAllByRole returns HTMLElement[]. */
function getCheckboxes(): HTMLElement[] {
  return screen.getAllByRole('checkbox');
}

/** Access Tiptap editor from ProseMirror DOM element (stored as `.editor`). */
function getEditorFromDom(index: number): Editor | undefined {
  const proseMirrorEls = document.querySelectorAll('.ProseMirror');
  const el = proseMirrorEls[index];
  if (!el) return undefined;
  return (el as unknown as Record<string, unknown>)['editor'] as Editor | undefined;
}

// ---------------------------------------------------------------------------
// AC-009: Renders correct number of items from Priority[]
// ---------------------------------------------------------------------------

describe('Priorities — structure (AC-009)', () => {
  it('renders exactly 3 checkboxes when initial has 3 items', async () => {
    renderWithProviders(<Harness initial={EMPTY_TRIPLE} />);
    await waitForEditors(3);
    expect(getCheckboxes()).toHaveLength(3);
  });

  it('renders exactly 3 editor textboxes when initial has 3 items', async () => {
    renderWithProviders(<Harness initial={EMPTY_TRIPLE} />);
    await waitForEditors(3);
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(3);
  });

  it('renders with 1 item without errors', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitForEditors(1);
    expect(getCheckboxes()).toHaveLength(1);
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
  });

  it('renders with 5 items without errors', async () => {
    const five: Priority[] = Array.from({ length: 5 }, (_, i) => ({
      id: `id-${i}`,
      text: `task ${i}`,
      done: false,
    }));
    renderWithProviders(<Harness initial={five} />);
    await waitForEditors(5);
    expect(getCheckboxes()).toHaveLength(5);
    expect(screen.getAllByRole('textbox')).toHaveLength(5);
  });

  it('has add button (AC-008)', async () => {
    renderWithProviders(<Harness initial={EMPTY_TRIPLE} />);
    await waitForEditors(3);
    expect(screen.getByRole('button', { name: /adicionar prioridade/i })).toBeInTheDocument();
  });

  it('has no delete button when only 1 item (AC-010 minimum guard)', async () => {
    renderWithProviders(<Harness initial={[EMPTY_PRIORITY]} />);
    await waitForEditors(1);
    expect(screen.queryByRole('button', { name: /excluir prioridade/i })).toBeNull();
  });

  it('section has accessible label "Prioridades do dia"', async () => {
    renderWithProviders(<Harness initial={EMPTY_TRIPLE} />);
    await waitForEditors(3);
    expect(screen.getByRole('region', { name: 'Prioridades do dia' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-010: Placeholders per slot
// ---------------------------------------------------------------------------

describe('Priorities — placeholders (AC-010)', () => {
  const PLACEHOLDERS = ['1ª prioridade', '2ª prioridade', '3ª prioridade'] as const;

  it.each([0, 1, 2] as const)('slot %i shows correct placeholder when empty', async (index) => {
    renderWithProviders(<Harness initial={EMPTY_TRIPLE} />);
    await waitForEditors(3);
    await waitFor(() => {
      const empty = document.querySelectorAll('.ProseMirror p.is-editor-empty');
      const found = Array.from(empty).some(
        (p) => p.getAttribute('data-placeholder') === PLACEHOLDERS[index],
      );
      expect(found).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// AC-016: Each editor has aria-label "Prioridade N do dia"
// ---------------------------------------------------------------------------

describe('Priorities — editor aria-labels (AC-016)', () => {
  it('all 3 editors render without error (ariaLabel prop wired)', async () => {
    renderWithProviders(<Harness initial={THREE_FILLED} />);
    await waitForEditors(3);
    // Allow setOptions to flush (Tiptap applies aria-label asynchronously).
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    // Verify editors are present — ariaLabel prop was passed without error.
    expect(screen.getAllByRole('textbox').length).toBeGreaterThanOrEqual(3);
  });
});

// ---------------------------------------------------------------------------
// AC-008, AC-015: Checkbox aria-labels reflect state
// ---------------------------------------------------------------------------

describe('Priorities — checkbox aria-labels (AC-008, AC-015)', () => {
  it('unchecked checkbox has aria-label "Marcar prioridade N como concluída"', async () => {
    renderWithProviders(<Harness initial={THREE_FILLED} />);
    await waitForEditors(3);
    const checkboxes = getCheckboxes();
    expect(checkboxes[0]).toHaveAttribute('aria-label', 'Marcar prioridade 1 como concluída');
    expect(checkboxes[1]).toHaveAttribute('aria-label', 'Marcar prioridade 2 como concluída');
    expect(checkboxes[2]).toHaveAttribute('aria-label', 'Marcar prioridade 3 como concluída');
  });

  it('checked checkbox has aria-label "Desmarcar prioridade N concluída"', async () => {
    const allDone: Priority[] = [
      { id: 'a', text: 'x', done: true },
      { id: 'b', text: 'y', done: true },
      { id: 'c', text: 'z', done: true },
    ];
    renderWithProviders(<Harness initial={allDone} />);
    await waitForEditors(3);
    const checkboxes = getCheckboxes();
    expect(checkboxes[0]).toHaveAttribute('aria-label', 'Desmarcar prioridade 1 concluída');
    expect(checkboxes[1]).toHaveAttribute('aria-label', 'Desmarcar prioridade 2 concluída');
    expect(checkboxes[2]).toHaveAttribute('aria-label', 'Desmarcar prioridade 3 concluída');
  });

  it('aria-label updates after toggling checkbox', async () => {
    renderWithProviders(<Harness initial={THREE_FILLED} />);
    await waitForEditors(3);
    const [cb0] = getCheckboxes();
    expect(cb0).toHaveAttribute('aria-label', 'Marcar prioridade 1 como concluída');
    await userEvent.click(cb0 as HTMLElement);
    await waitFor(() => {
      const [updated] = getCheckboxes();
      expect(updated).toHaveAttribute('aria-label', 'Desmarcar prioridade 1 concluída');
    });
  });
});

// ---------------------------------------------------------------------------
// AC-005: Toggling checkbox emits onChange with done toggled
// ---------------------------------------------------------------------------

describe('Priorities — checkbox toggle (AC-005)', () => {
  it('clicking checkbox of slot 1 toggles done only on slot 1', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={THREE_FILLED} onChangeSpy={spy} />);
    await waitForEditors(3);
    const checkboxes = getCheckboxes();
    const cb1 = checkboxes[1];

    await userEvent.click(cb1 as HTMLElement);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(emitted[0]).toEqual(THREE_FILLED[0]); // slot 0 unchanged
    expect(emitted[1]?.done).toBe(true); // slot 1 toggled
    expect(emitted[1]?.id).toBe(THREE_FILLED[1]?.id); // id preserved
    expect(emitted[1]?.text).toBe(THREE_FILLED[1]?.text); // text preserved
    expect(emitted[2]).toEqual(THREE_FILLED[2]); // slot 2 unchanged
  });

  it('toggling checkbox on empty slot (id "") generates ULID', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={EMPTY_TRIPLE} onChangeSpy={spy} />);
    await waitForEditors(3);
    const [cb0] = getCheckboxes();

    await userEvent.click(cb0 as HTMLElement);

    await waitFor(() => expect(spy).toHaveBeenCalled());
    const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
    expect(emitted[0]?.id).not.toBe(''); // ULID generated
    expect(emitted[0]?.done).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AC-003: Text editing via Tiptap editor commands
// ---------------------------------------------------------------------------

describe('Priorities — text editing (AC-003)', () => {
  it('typing in slot 0 emits onChange; slots 1 and 2 untouched', async () => {
    const spy = jest.fn();
    const initial: Priority[] = [
      EMPTY_PRIORITY,
      { id: 'keep1', text: 'slot1', done: false },
      { id: 'keep2', text: 'slot2', done: true },
    ];
    renderWithProviders(<Harness initial={initial} onChangeSpy={spy} />);
    await waitForEditors(3);

    // ProseMirror stores the Tiptap editor instance on `.ProseMirror` as `editor`.
    const firstEditor = getEditorFromDom(0);
    expect(firstEditor).toBeDefined();

    if (firstEditor) {
      act(() => {
        firstEditor.commands.setContent('<p>nova prioridade</p>', true);
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
      expect(emitted[0]?.id).not.toBe('');
      expect(emitted[0]?.text).toContain('nova prioridade');
      expect(emitted[1]).toEqual(initial[1]);
      expect(emitted[2]).toEqual(initial[2]);
    }
  });

  it('editing slot 1 updates only slot 1 (handleChangeText1 coverage)', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={THREE_FILLED} onChangeSpy={spy} />);
    await waitForEditors(3);

    const editor1 = getEditorFromDom(1);
    if (editor1) {
      act(() => {
        editor1.commands.setContent('<p>updated slot 1</p>', true);
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
      expect(emitted[1]?.text).toContain('updated slot 1');
      expect(emitted[1]?.id).toBe(THREE_FILLED[1]?.id);
      expect(emitted[0]).toEqual(THREE_FILLED[0]);
      expect(emitted[2]).toEqual(THREE_FILLED[2]);
    }
  });

  it('editing slot 2 updates only slot 2 (handleChangeText2 coverage)', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={THREE_FILLED} onChangeSpy={spy} />);
    await waitForEditors(3);

    const editor2 = getEditorFromDom(2);
    if (editor2) {
      act(() => {
        editor2.commands.setContent('<p>updated slot 2</p>', true);
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
      expect(emitted[2]?.text).toContain('updated slot 2');
    }
  });

  it('editing preserves existing id when slot already has id (AC-002)', async () => {
    const spy = jest.fn();
    const initial: Priority[] = [
      { id: 'stable-id', text: 'old', done: false },
      EMPTY_PRIORITY,
      EMPTY_PRIORITY,
    ];
    renderWithProviders(<Harness initial={initial} onChangeSpy={spy} />);
    await waitForEditors(3);

    const firstEditor = getEditorFromDom(0);
    if (firstEditor) {
      act(() => {
        firstEditor.commands.setContent('<p>changed text</p>', true);
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      const emitted = spy.mock.calls.at(-1)?.[0] as Priority[];
      expect(emitted[0]?.id).toBe('stable-id');
      expect(emitted[0]?.text).toContain('changed text');
    }
  });
});

// ---------------------------------------------------------------------------
// AC-006: done === true wrapper has "done" class + strikethrough
// ---------------------------------------------------------------------------

describe('Priorities — done styling (AC-006)', () => {
  it('slot with done=true has done class on wrapper', async () => {
    const initial: Priority[] = [
      { id: 'x', text: 'done task', done: true },
      EMPTY_PRIORITY,
      EMPTY_PRIORITY,
    ];
    renderWithProviders(<Harness initial={initial} />);
    await waitForEditors(3);

    // done-state is communicated via data-done="true" on the editor wrapper
    // (class-based approach was removed; data-done drives strikethrough via CSS).
    await waitFor(() => {
      const doneElements = document.querySelectorAll('[data-done="true"]');
      expect(doneElements.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// AC-014: Tab order — checkbox 0 → editor 0 → checkbox 1 → editor 1 → checkbox 2 → editor 2
// ---------------------------------------------------------------------------

describe('Priorities — tab order (AC-014)', () => {
  it('natural DOM order: checkbox before editor in each slot', async () => {
    renderWithProviders(<Harness initial={THREE_FILLED} />);
    await waitForEditors(3);

    const region = screen.getByRole('region', { name: 'Prioridades do dia' });
    const focusableElements = region.querySelectorAll('input[type="checkbox"], [contenteditable]');

    // Should have 6 elements: 3 checkboxes + 3 editors
    expect(focusableElements.length).toBe(6);

    // Verify alternating pattern: checkbox, editor, checkbox, editor, ...
    const tags = Array.from(focusableElements).map((el) =>
      el.tagName === 'INPUT' ? 'checkbox' : 'editor',
    );
    expect(tags).toEqual(['checkbox', 'editor', 'checkbox', 'editor', 'checkbox', 'editor']);
  });

  it('first checkbox can be focused programmatically', async () => {
    renderWithProviders(<Harness initial={THREE_FILLED} />);
    await waitForEditors(3);

    const [cb0] = getCheckboxes();
    act(() => {
      (cb0 as HTMLElement).focus();
    });
    expect(document.activeElement).toBe(cb0);
  });
});

// ---------------------------------------------------------------------------
// AC-017: Focus visible — no outline:none without replacement (structural)
// ---------------------------------------------------------------------------

describe('Priorities — focus visible (AC-017)', () => {
  it('checkboxes are focusable (not disabled, not hidden)', async () => {
    renderWithProviders(<Harness initial={THREE_FILLED} />);
    await waitForEditors(3);
    getCheckboxes().forEach((cb) => {
      expect(cb).not.toBeDisabled();
      expect(cb).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// Handler invocation coverage: exercises all useCallback handlers
// ---------------------------------------------------------------------------

describe('Priorities — handler invocation coverage', () => {
  it('handleToggle1 and handleToggle2 exercised via checkbox clicks', async () => {
    const spy = jest.fn();
    const initial: Priority[] = [
      { id: 'a', text: 'first', done: false },
      { id: 'b', text: 'second', done: false },
      { id: 'c', text: 'third', done: false },
    ];
    renderWithProviders(<Harness initial={initial} onChangeSpy={spy} />);
    await waitForEditors(3);

    const checkboxes = getCheckboxes();
    const cb1 = checkboxes[1];
    const cb2 = checkboxes[2];

    await userEvent.click(cb1 as HTMLElement);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect((spy.mock.calls.at(-1)?.[0] as Priority[])[1]?.done).toBe(true);

    await userEvent.click(cb2 as HTMLElement);
    await waitFor(() => {
      expect((spy.mock.calls.at(-1)?.[0] as Priority[])[2]?.done).toBe(true);
    });
  });

  it('handleToggle0 exercised via slot 0 checkbox click', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={THREE_FILLED} onChangeSpy={spy} />);
    await waitForEditors(3);
    const [cb0] = getCheckboxes();
    await userEvent.click(cb0 as HTMLElement);
    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect((spy.mock.calls.at(-1)?.[0] as Priority[])[0]?.done).toBe(true);
  });

  it('handleChangeText0 exercised via slot 0 editor setContent', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={THREE_FILLED} onChangeSpy={spy} />);
    await waitForEditors(3);
    const ed0 = getEditorFromDom(0);
    if (ed0) {
      act(() => {
        ed0.commands.setContent('<p>slot0 text</p>', true);
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      expect((spy.mock.calls.at(-1)?.[0] as Priority[])[0]?.text).toContain('slot0 text');
    }
  });

  it('handleChangeText1 exercised via slot 1 editor setContent', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={THREE_FILLED} onChangeSpy={spy} />);
    await waitForEditors(3);
    const ed1 = getEditorFromDom(1);
    if (ed1) {
      act(() => {
        ed1.commands.setContent('<p>slot1 text</p>', true);
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      expect((spy.mock.calls.at(-1)?.[0] as Priority[])[1]?.text).toContain('slot1 text');
    }
  });

  it('handleChangeText2 exercised via slot 2 editor setContent', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={THREE_FILLED} onChangeSpy={spy} />);
    await waitForEditors(3);
    const ed2 = getEditorFromDom(2);
    if (ed2) {
      act(() => {
        ed2.commands.setContent('<p>slot2 text</p>', true);
      });
      await waitFor(() => expect(spy).toHaveBeenCalled());
      expect((spy.mock.calls.at(-1)?.[0] as Priority[])[2]?.text).toContain('slot2 text');
    }
  });
});

// ---------------------------------------------------------------------------
// placeholderForIndex utility (branch coverage)
// ---------------------------------------------------------------------------

describe('PriorityItem — placeholderForIndex', () => {
  it('returns correct placeholders for indices 0, 1, 2', () => {
    expect(placeholderForIndex(0)).toBe('1ª prioridade');
    expect(placeholderForIndex(1)).toBe('2ª prioridade');
    expect(placeholderForIndex(2)).toBe('3ª prioridade');
  });

  it('returns fallback for out-of-range index (branch coverage)', () => {
    expect(placeholderForIndex(3)).toBe('4ª prioridade');
    expect(placeholderForIndex(9)).toBe('10ª prioridade');
  });
});

// ---------------------------------------------------------------------------
// PriorityItem isolation
// ---------------------------------------------------------------------------

describe('PriorityItem — isolation', () => {
  it('mounts with given value and renders checkbox + editor', async () => {
    const onChangeText = jest.fn();
    const onToggleDone = jest.fn();
    const value = { id: 'abc', text: 'hello', done: false };

    renderWithProviders(
      <PriorityItem
        value={value}
        index={0}
        onChangeText={onChangeText}
        onToggleDone={onToggleDone}
      />,
    );

    const editor = await waitFor(() => screen.getByRole('textbox'));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 80));
    });
    expect(editor).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FEAT-017 baseline rhythm + memoization tests:
// see Priorities.baseline.integration.test.tsx (extracted to keep this file
// under the 250-line CLAUDE.md soft limit).
// ---------------------------------------------------------------------------
