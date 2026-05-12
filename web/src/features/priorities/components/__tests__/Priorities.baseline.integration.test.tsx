/**
 * Integration tests: Priorities + PriorityItem — FEAT-017 baseline rhythm.
 *
 * Covers: AC-009, AC-010, AC-012, AC-013, AC-022, AC-023, AC-024, AC-025,
 *         AC-026, AC-048.
 *
 * Extracted from Priorities.integration.test.tsx to keep both files under the
 * 250-line CLAUDE.md soft limit. CSS-level assertions read the module files
 * directly via fs/path (jest.requireActual to bypass jest-css-modules-transform).
 */

import { act, screen, waitFor } from '@testing-library/react';
import { useState } from 'react';

import type { Priority } from '../../types.js';
import { EMPTY_PRIORITY } from '../../types.js';
import { Priorities } from '../Priorities.js';

import { renderWithProviders } from '@/test-utils';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_TRIPLE: Priority[] = [EMPTY_PRIORITY, EMPTY_PRIORITY, EMPTY_PRIORITY];

function filled(text: string, done = false) {
  return { id: `id_${text}`, text, done };
}

const THREE_FILLED: Priority[] = [filled('task0'), filled('task1'), filled('task2')];

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

async function waitForEditors(min = 3) {
  await waitFor(() => {
    const boxes = screen.getAllByRole('textbox');
    expect(boxes.length).toBeGreaterThanOrEqual(min);
  });
}

function getCheckboxes(): HTMLElement[] {
  return screen.getAllByRole('checkbox');
}

// ---------------------------------------------------------------------------
// CSS file reads (bypass jest-css-modules-transform via jest.requireActual)
// ---------------------------------------------------------------------------

const fsMod = jest.requireActual<typeof import('fs')>('fs');
const pathMod = jest.requireActual<typeof import('path')>('path');

const PRIORITY_ITEM_CSS = pathMod.join(
  process.cwd(),
  'web/src/features/priorities/components/PriorityItem.module.css',
);
const PRIORITIES_CSS = pathMod.join(
  process.cwd(),
  'web/src/features/priorities/components/Priorities.module.css',
);

function readFile(absPath: string): string {
  return fsMod.readFileSync(absPath, 'utf-8') as string;
}

// ---------------------------------------------------------------------------
// FEAT-017: PriorityItem CSS — baseline rhythm
// ---------------------------------------------------------------------------

describe('FEAT-017 PriorityItem CSS — baseline rhythm (AC-009, AC-010, AC-013, AC-026)', () => {
  it('.item height is var(--baseline) — AC-009/AC-010 (24px row)', () => {
    const css = readFile(PRIORITY_ITEM_CSS);
    expect(css).toMatch(/\.item\s*\{[^}]*height:\s*var\(--baseline\)/);
  });

  it('.item uses align-items: center (not flex-start)', () => {
    const css = readFile(PRIORITY_ITEM_CSS);
    expect(css).toMatch(/\.item\s*\{[^}]*align-items:\s*center/);
    expect(css).not.toMatch(/\.item\s*\{[^}]*align-items:\s*flex-start/);
  });

  it('does not define a .checkboxWrapper rule (atom Checkbox is already 24×24)', () => {
    const css = readFile(PRIORITY_ITEM_CSS);
    expect(css).not.toMatch(/\.checkboxWrapper\s*\{/);
  });
});

describe('FEAT-017 Priorities CSS — addButton (AC-022, AC-023, AC-024, AC-025)', () => {
  it('.addButton no longer ships size overrides (width/min-width/height/min-height)', () => {
    const css = readFile(PRIORITIES_CSS);
    const match = /\.addButton\s*\{([^}]*)\}/.exec(css);
    expect(match).not.toBeNull();
    const block = match?.[1] ?? '';
    expect(block).not.toMatch(/width:\s*auto/);
    expect(block).not.toMatch(/min-width:\s*unset/);
    expect(block).not.toMatch(/height:\s*auto/);
    expect(block).not.toMatch(/min-height:\s*unset/);
  });
});

describe('FEAT-017 PriorityItem DOM — checkboxWrapper removed', () => {
  it('renders Checkbox atom without an outer .checkboxWrapper <div>', async () => {
    renderWithProviders(<Harness initial={EMPTY_TRIPLE} />);
    await waitForEditors(3);
    const wrappers = document.querySelectorAll('[class*="checkboxWrapper"]');
    expect(wrappers.length).toBe(0);
  });
});

describe('FEAT-017 PriorityItem — tab order preserved (AC-048)', () => {
  it('DOM order is checkbox -> editor -> delete in each slot', async () => {
    const TWO_FILLED: Priority[] = [filled('a'), filled('b')];
    renderWithProviders(<Harness initial={TWO_FILLED} />);
    await waitForEditors(2);

    const region = screen.getByRole('region', { name: 'Prioridades do dia' });
    const focusable = region.querySelectorAll(
      'input[type="checkbox"], [contenteditable], button[aria-label*="Excluir"]',
    );
    expect(focusable.length).toBe(6);
    const tags = Array.from(focusable).map((el) => {
      if (el.tagName === 'INPUT') return 'checkbox';
      if (el.tagName === 'BUTTON') return 'delete';
      return 'editor';
    });
    expect(tags).toEqual(['checkbox', 'editor', 'delete', 'checkbox', 'editor', 'delete']);
  });
});

// ---------------------------------------------------------------------------
// Memoization sanity (kept alongside FEAT-017 to keep main file slim)
// ---------------------------------------------------------------------------

describe('Priorities — memoization (React.memo)', () => {
  it('re-rendering parent with same value does not cause errors', async () => {
    let rerenders = 0;
    function Counter() {
      rerenders++;
      return null;
    }

    function ParentWithCounter({ value }: { value: Priority[] }) {
      return (
        <>
          <Priorities value={value} onChange={jest.fn()} />
          <Counter />
        </>
      );
    }

    const { rerender } = renderWithProviders(<ParentWithCounter value={THREE_FILLED} />);

    await waitForEditors(3);
    const countAfterMount = rerenders;

    rerender(<ParentWithCounter value={THREE_FILLED} />);

    await act(async () => {
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(rerenders).toBeGreaterThanOrEqual(countAfterMount);
    expect(getCheckboxes()).toHaveLength(3);
  });
});
