/**
 * AgendaSlot refactor tests — FEAT-016 T-011
 *
 * Covers:
 *   AC-006: font-size declarations use var(--font-size-*)
 *   AC-007: spacing (gap, padding) declarations use var(--spacing-*)
 *   AC-025: no raw <button> elements without aria-label
 *   AC-027: zero unmanaged raw <button> elements in agenda components
 *
 * CSS assertions read source files at test-time via jest.requireActual('fs').
 * Path is derived from process.cwd() (available in Jest Node env).
 */

/// <reference types="node" />

import { screen } from '@testing-library/react';
import React, { useState } from 'react';

import { EMPTY_AGENDA } from '../../types.js';
import type { AgendaSlots } from '../../types.js';
import { Agenda } from '../Agenda.js';

import { renderWithProviders } from '@/test-utils';

// ---------------------------------------------------------------------------
// Node built-ins — pulled via jest.requireActual
// ---------------------------------------------------------------------------
const { readFileSync } = jest.requireActual<typeof import('fs')>('fs');
const pathMod = jest.requireActual<typeof import('path')>('path');

// Build absolute path to the CSS file from project root (process.cwd())
const AGENDA_CSS = pathMod.join(
  process.cwd(),
  'web/src/features/agenda/components/AgendaSlot.module.css',
);

function readCss(absPath: string): string {
  return readFileSync(absPath, 'utf-8') as string;
}

// ---------------------------------------------------------------------------
// Mock RichTextLine (same pattern as Agenda.integration.test.tsx)
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
function Harness({ initial }: { initial: AgendaSlots }) {
  const [value, setValue] = useState<AgendaSlots>(initial);
  return <Agenda value={value} onChange={setValue} />;
}

// ---------------------------------------------------------------------------
// AC-006: font-size uses token var
// ---------------------------------------------------------------------------

describe('AgendaSlot.module.css — AC-006 font-size tokens', () => {
  it('does not contain hardcoded font-size: 0.875rem', () => {
    const css = readCss(AGENDA_CSS);
    expect(css).not.toMatch(/font-size:\s*0\.875rem/);
  });

  it('uses var(--font-size-sm) for the label font-size', () => {
    const css = readCss(AGENDA_CSS);
    expect(css).toMatch(/font-size:\s*var\(--font-size-sm\)/);
  });
});

// ---------------------------------------------------------------------------
// AC-007: spacing uses token var
// ---------------------------------------------------------------------------

describe('AgendaSlot.module.css — AC-007 spacing tokens', () => {
  it('does not contain hardcoded gap: 8px', () => {
    const css = readCss(AGENDA_CSS);
    expect(css).not.toMatch(/gap:\s*8px/);
  });

  it('uses var(--spacing-sm) for the slot row gap', () => {
    const css = readCss(AGENDA_CSS);
    expect(css).toMatch(/gap:\s*var\(--spacing-sm\)/);
  });
});

// ---------------------------------------------------------------------------
// AC-027 / AC-025: no raw <button> without aria-label in agenda
// ---------------------------------------------------------------------------

describe('Agenda — no raw unlabelled buttons (AC-027)', () => {
  it('renders zero role=button elements (agenda has no action buttons)', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    // Agenda is a read-write timeline only — no add/remove/scroll buttons
    const buttons = screen.queryAllByRole('button');
    expect(buttons).toHaveLength(0);
  });
});
