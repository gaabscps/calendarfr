/**
 * SHIFT+ENTER navigation tests for Agenda — FEAT-018
 *
 * Covers: AC-009, AC-010, AC-011.
 *
 * Strategy: self-contained jest.mock for @/features/rich-text-line that
 * captures onShiftEnter + editorRef per slot via globalThis. This mirrors
 * the approach in Agenda.integration.test.tsx but is isolated here to keep
 * both files under the 250-line limit (CLAUDE.md rule 6).
 */

import { screen } from '@testing-library/react';
import React, { useState } from 'react';

import { AGENDA_HOURS, EMPTY_AGENDA } from '../../types.js';
import type { AgendaSlots } from '../../types.js';
import { Agenda } from '../Agenda.js';

import { renderWithProviders } from '@/test-utils';

// ---------------------------------------------------------------------------
// Mock RichTextLine — captures onShiftEnter + editorRef per slot
// ---------------------------------------------------------------------------

/**
 * Per-slot captured props: hour → { onShiftEnter, editorRef }.
 * Populated by mock on each render; shared via globalThis to cross the
 * jest.mock module boundary.
 */
const capturedSlotProps: Record<
  number,
  { onShiftEnter?: () => void; editorRef?: { current: unknown } }
> = {};
(globalThis as Record<string, unknown>).__shiftEnterCapturedSlotProps = capturedSlotProps;

jest.mock('@/features/rich-text-line', () => {
  const React = jest.requireActual<typeof import('react')>('react');

  const MockEditor = ({
    value,
    onChange,
    ariaLabel,
    onShiftEnter,
    editorRef,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
    placeholder?: string;
    onEnter?: () => void;
    onShiftEnter?: () => void;
    editorRef?: { current: unknown };
    autoFocus?: boolean;
    disabled?: boolean;
    className?: string;
  }) => {
    const hourMatch = ariaLabel != null ? ariaLabel.match(/Agenda das (\d+) horas/) : null;
    const hour = hourMatch ? parseInt(hourMatch[1] ?? '-1', 10) : -1;

    // Capture onShiftEnter + editorRef, populate editorRef.current with a mock
    // commands object so handlers can be exercised without a real Tiptap instance.
    const captured = (globalThis as Record<string, unknown>)
      .__shiftEnterCapturedSlotProps as Record<
      number,
      { onShiftEnter?: (() => void) | undefined; editorRef?: { current: unknown } | undefined }
    >;
    if (captured && hour >= 0) {
      captured[hour] = { onShiftEnter, editorRef };
      if (editorRef != null) {
        editorRef.current = {
          commands: { focus: jest.fn() },
        };
      }
    }

    return React.createElement('input', {
      type: 'text',
      role: 'textbox',
      'aria-label': ariaLabel,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
      'data-testid': `shift-editor-h${String(hour)}`,
    });
  };

  return {
    RichTextLine: MockEditor,
    RichTextBlock: MockEditor,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Harness({ initial }: { initial: AgendaSlots }) {
  const [value, setValue] = useState<AgendaSlots>(initial);
  return <Agenda value={value} onChange={setValue} />;
}

/** Reset captured slot props before each test. */
beforeEach(() => {
  Object.keys(capturedSlotProps).forEach((k) => {
    delete capturedSlotProps[parseInt(k, 10)];
  });
});

// ---------------------------------------------------------------------------
// AC-009: All 18 AgendaSlots receive onShiftEnter (function) + editorRef (defined)
// ---------------------------------------------------------------------------

describe('Agenda — SHIFT+ENTER props wiring (AC-009)', () => {
  it('every AgendaSlot receives onShiftEnter as a function', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);

    for (const hour of AGENDA_HOURS) {
      const captured = capturedSlotProps[hour];
      expect(captured).toBeDefined();
      expect(typeof captured?.onShiftEnter).toBe('function');
    }
  });

  it('every AgendaSlot receives a defined editorRef', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);

    for (const hour of AGENDA_HOURS) {
      const captured = capturedSlotProps[hour];
      expect(captured?.editorRef).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// AC-010: SHIFT+ENTER on last slot (23h) wraps to first slot (06h)
// ---------------------------------------------------------------------------

describe('Agenda — SHIFT+ENTER circular wrap (AC-010)', () => {
  it('SHIFT+ENTER on slot 23h focuses slot 06h (circular)', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);

    const slot23 = capturedSlotProps[23];
    expect(slot23?.onShiftEnter).toBeDefined();
    slot23?.onShiftEnter?.();

    // Destination is 06h (AGENDA_HOURS[(17+1) % 18] = AGENDA_HOURS[0] = 6)
    const slot6EditorRef = capturedSlotProps[6]?.editorRef as
      | { current: { commands: { focus: jest.Mock } } }
      | undefined;
    expect(slot6EditorRef?.current?.commands.focus).toHaveBeenCalledWith('end');
  });

  it('SHIFT+ENTER on slot 23h does NOT focus slot 22h or any other slot', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);

    capturedSlotProps[23]?.onShiftEnter?.();

    // Every slot except 06h must NOT have been focused
    for (const hour of AGENDA_HOURS) {
      if (hour === 6) continue;
      const ref = capturedSlotProps[hour]?.editorRef as
        | { current: { commands: { focus: jest.Mock } } }
        | undefined;
      expect(ref?.current?.commands.focus).not.toHaveBeenCalled();
    }
  });
});

// ---------------------------------------------------------------------------
// AC-011: SHIFT+ENTER calls focus('end') on next slot's editorRef
// ---------------------------------------------------------------------------

describe('Agenda — SHIFT+ENTER focus target (AC-011)', () => {
  it('SHIFT+ENTER on slot 06h focuses slot 07h with focus("end")', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);

    capturedSlotProps[6]?.onShiftEnter?.();

    const slot7Ref = capturedSlotProps[7]?.editorRef as
      | { current: { commands: { focus: jest.Mock } } }
      | undefined;
    expect(slot7Ref?.current?.commands.focus).toHaveBeenCalledWith('end');
  });

  it('SHIFT+ENTER on slot 14h focuses slot 15h with focus("end")', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);

    capturedSlotProps[14]?.onShiftEnter?.();

    const slot15Ref = capturedSlotProps[15]?.editorRef as
      | { current: { commands: { focus: jest.Mock } } }
      | undefined;
    expect(slot15Ref?.current?.commands.focus).toHaveBeenCalledWith('end');
  });

  it('focus is called with "end" not "start" or empty', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);

    // Check a sample of non-last slots
    const sampleHours = [6, 10, 18, 22];
    for (const hour of sampleHours) {
      const nextHour = AGENDA_HOURS[AGENDA_HOURS.indexOf(hour as never) + 1]!;
      capturedSlotProps[hour]?.onShiftEnter?.();

      const nextRef = capturedSlotProps[nextHour]?.editorRef as
        | { current: { commands: { focus: jest.Mock } } }
        | undefined;
      expect(nextRef?.current?.commands.focus).toHaveBeenCalledWith('end');
    }
  });

  it('all editors are rendered and visible (screen sanity)', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(18);
  });
});
