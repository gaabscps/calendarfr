/**
 * Integration tests: Agenda + AgendaSlot — BATCH-B
 *
 * Covers: AC-002, AC-009, AC-013, AC-014, AC-015, AC-016, AC-017, AC-018,
 *         AC-027, NFR-002.
 *
 * Strategy: mock RichTextLine to a simple <input> for fast rendering and
 * render-count tracking. This avoids full Tiptap initialisation in jsdom,
 * keeping the suite fast (NFR-001 compatible) while exercising all component
 * logic (slots, labels, aria attrs, current-hour, tab order, memo).
 */

import { act, screen, within } from '@testing-library/react';
import React, { useState } from 'react';

import { EMPTY_AGENDA } from '../../types.js';
import type { AgendaSlots } from '../../types.js';
import { Agenda } from '../Agenda.js';

import { renderWithProviders } from '@/test-utils';

// ---------------------------------------------------------------------------
// Mock RichTextLine — simple <input> + render counter per instance
// ---------------------------------------------------------------------------

/** Per-slot render counter: hour → count (shared via globalThis for jest.mock boundary) */
const renderCounts: Record<number, number> = {};
(globalThis as Record<string, unknown>).__agendaRenderCounts = renderCounts;

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
      onEnter?: () => void;
      autoFocus?: boolean;
      disabled?: boolean;
      className?: string;
    }) => {
      // Extract hour from ariaLabel "Agenda das N horas" to key render counter
      const hourMatch = ariaLabel != null ? ariaLabel.match(/Agenda das (\d+) horas/) : null;
      const hour = hourMatch ? parseInt(hourMatch[1] ?? '-1', 10) : -1;
      // renderCounts lives in module scope; access via globalThis to cross the mock boundary
      const counts = (globalThis as Record<string, unknown>).__agendaRenderCounts as Record<
        number,
        number
      >;
      if (counts) counts[hour] = (counts[hour] ?? 0) + 1;

      return React.createElement('input', {
        type: 'text',
        role: 'textbox',
        'aria-label': ariaLabel,
        value,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
        'data-testid': `editor-h${String(hour)}`,
      });
    };

  return {
    RichTextLine: makeMock('RichTextLine'),
    RichTextBlock: makeMock('RichTextBlock'),
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Controlled test harness — mirrors how daily-page will use <Agenda>. */
function Harness({
  initial,
  onChangeSpy,
  now,
}: {
  initial: AgendaSlots;
  onChangeSpy?: (_v: AgendaSlots) => void;
  now?: Date;
}) {
  const [value, setValue] = useState<AgendaSlots>(initial);
  const agendaProps = {
    value,
    onChange: (next: AgendaSlots) => {
      setValue(next);
      onChangeSpy?.(next);
    },
    ...(now !== undefined ? { now } : {}),
  };
  return <Agenda {...agendaProps} />;
}

/** Reset render counters before each test. */
beforeEach(() => {
  Object.keys(renderCounts).forEach((k) => {
    renderCounts[parseInt(k, 10)] = 0;
  });
});

// ---------------------------------------------------------------------------
// AC-005 / AC-002 / AC-009: 18 slots rendered in hour 6→23 order
// ---------------------------------------------------------------------------

describe('Agenda — structure (AC-002, AC-009)', () => {
  it('renders exactly 18 textbox editors', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    expect(screen.getAllByRole('textbox')).toHaveLength(18);
  });

  it('renders slots in order hour 6 → 23', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    const editors = screen.getAllByRole('textbox');
    const hours = editors.map((el) => {
      const label = el.getAttribute('aria-label') ?? '';
      const m = label.match(/Agenda das (\d+) horas/);
      return m ? parseInt(m[1] ?? '-1', 10) : -1;
    });
    expect(hours).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
  });

  it('has no add/remove UI (AC-009)', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    expect(screen.queryByRole('button', { name: /adicionar|remover/i })).toBeNull();
  });

  it('section has accessible region label "Agenda do dia"', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    expect(screen.getByRole('region', { name: 'Agenda do dia' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// AC-015: Each editor has ariaLabel "Agenda das N horas"
// ---------------------------------------------------------------------------

describe('Agenda — aria-labels (AC-015)', () => {
  it('each slot editor has correct PT-BR aria-label', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    const expectedHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    for (const hour of expectedHours) {
      expect(screen.getByLabelText(`Agenda das ${hour} horas`)).toBeInTheDocument();
    }
  });
});

// ---------------------------------------------------------------------------
// AC-016 / AC-014: Tab order — label aria-hidden + editor natural DOM order
// ---------------------------------------------------------------------------

describe('Agenda — tab order (AC-014, AC-016)', () => {
  it('natural DOM order: editors appear in hour 6→23 sequence', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    const region = screen.getByRole('region', { name: 'Agenda do dia' });
    const editors = within(region).getAllByRole('textbox');
    expect(editors).toHaveLength(18);

    // Verify order matches 6→23 via aria-label
    const hours = editors.map((el) => {
      const m = (el.getAttribute('aria-label') ?? '').match(/Agenda das (\d+) horas/);
      return m ? parseInt(m[1] ?? '-1', 10) : -1;
    });
    expect(hours).toEqual([6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
  });

  it('hour labels have aria-hidden="true"', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    // Labels are <span aria-hidden="true"> with text like "06".."23"
    const hiddenSpans = document.querySelectorAll('[aria-hidden="true"]');
    // One per slot = 18 labels
    expect(hiddenSpans.length).toBe(18);
    // Each span shows the zero-padded hour
    const labelTexts = Array.from(hiddenSpans).map((el) => el.textContent);
    expect(labelTexts).toEqual([
      '06',
      '07',
      '08',
      '09',
      '10',
      '11',
      '12',
      '13',
      '14',
      '15',
      '16',
      '17',
      '18',
      '19',
      '20',
      '21',
      '22',
      '23',
    ]);
  });
});

// ---------------------------------------------------------------------------
// AC-017: Focus visible — editors are not disabled and are visible
// ---------------------------------------------------------------------------

describe('Agenda — focus visible (AC-017)', () => {
  it('all editors are not disabled and are visible', () => {
    renderWithProviders(<Harness initial={EMPTY_AGENDA} />);
    const editors = screen.getAllByRole('textbox');
    editors.forEach((el) => {
      expect(el).not.toBeDisabled();
      expect(el).toBeVisible();
    });
  });
});

// ---------------------------------------------------------------------------
// AC-018: Slot with current hour has data-current-hour="true"
// ---------------------------------------------------------------------------

describe('Agenda — current hour highlight (AC-013, AC-018)', () => {
  it('slot hour=14 has data-current-hour="true" when now=14:30', () => {
    const now = new Date('2026-05-10T14:30:00');
    renderWithProviders(<Harness initial={EMPTY_AGENDA} now={now} />);

    // Slot wrapper for hour=14 should have data-current-hour="true"
    const currentSlots = document.querySelectorAll('[data-current-hour="true"]');
    expect(currentSlots).toHaveLength(1);

    // Verify it's the hour-14 slot by checking its editor's aria-label
    const editor = within(currentSlots[0] as HTMLElement).getByLabelText('Agenda das 14 horas');
    expect(editor).toBeInTheDocument();
  });

  it('other 17 slots do not have data-current-hour when now=14:30', () => {
    const now = new Date('2026-05-10T14:30:00');
    renderWithProviders(<Harness initial={EMPTY_AGENDA} now={now} />);

    const currentSlots = document.querySelectorAll('[data-current-hour="true"]');
    expect(currentSlots).toHaveLength(1);
  });

  it('no slot has data-current-hour when now=03:00 (outside range) — AC-013', () => {
    const now = new Date('2026-05-10T03:00:00');
    renderWithProviders(<Harness initial={EMPTY_AGENDA} now={now} />);

    const currentSlots = document.querySelectorAll('[data-current-hour="true"]');
    expect(currentSlots).toHaveLength(0);
  });

  it('slot hour=14 has aria-current="time" when it is current hour', () => {
    const now = new Date('2026-05-10T14:30:00');
    renderWithProviders(<Harness initial={EMPTY_AGENDA} now={now} />);

    const currentSlot = document.querySelector('[data-current-hour="true"]');
    expect(currentSlot).not.toBeNull();
    expect(currentSlot).toHaveAttribute('aria-current', 'time');
  });

  it('non-current slots do not have aria-current', () => {
    const now = new Date('2026-05-10T14:30:00');
    renderWithProviders(<Harness initial={EMPTY_AGENDA} now={now} />);

    // All slots without data-current-hour should NOT have aria-current
    const region = screen.getByRole('region', { name: 'Agenda do dia' });
    const allSlotWrappers = region.querySelectorAll('[data-testid^="slot-"]');
    allSlotWrappers.forEach((el) => {
      if (el.getAttribute('data-current-hour') !== 'true') {
        expect(el).not.toHaveAttribute('aria-current');
      }
    });
  });
});

// ---------------------------------------------------------------------------
// AC-002 / NFR-002: Editing one slot does NOT re-render the other 17
// ---------------------------------------------------------------------------

describe('Agenda — React.memo perf (AC-002, NFR-002)', () => {
  it('editing slot 9 does not re-render the other 17 AgendaSlot instances', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={EMPTY_AGENDA} onChangeSpy={spy} />);

    // Reset counters after initial render
    Object.keys(renderCounts).forEach((k) => {
      renderCounts[parseInt(k, 10)] = 0;
    });

    // Simulate editing slot hour=9
    const editor9 = screen.getByTestId('editor-h9');
    await act(async () => {
      editor9.focus();
      // Fire change event on the mock input
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeInputValueSetter?.call(editor9, 'reunião de equipe');
      editor9.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Wait for spy to have been called
    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls.at(-1)?.[0] as AgendaSlots;
    expect(emitted.find((s) => s.hour === 9)?.text).toBe('reunião de equipe');

    // The other 17 slots should NOT have re-rendered
    const NON_CURRENT_HOURS = [6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];
    for (const hour of NON_CURRENT_HOURS) {
      expect(renderCounts[hour]).toBe(0);
    }
  });

  it('editing slot 9 emits onChange with only slot 9 updated (referential equality)', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={EMPTY_AGENDA} onChangeSpy={spy} />);

    const editor9 = screen.getByTestId('editor-h9');
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      nativeInputValueSetter?.call(editor9, 'task at 9');
      editor9.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls.at(-1)?.[0] as AgendaSlots;

    // slot 9 updated
    expect(emitted.find((s) => s.hour === 9)?.text).toBe('task at 9');

    // all other slots referentially identical to EMPTY_AGENDA slots
    for (const slot of EMPTY_AGENDA) {
      if (slot.hour === 9) continue;
      const emittedSlot = emitted.find((s) => s.hour === slot.hour);
      expect(emittedSlot).toBe(slot); // referential equality
    }
  });
});

// ---------------------------------------------------------------------------
// AC-008 (component context): Corrupted input renders 18 slots
// ---------------------------------------------------------------------------

describe('Agenda — defensive normalize (AC-008)', () => {
  it('17-element array input still renders 18 slots and emits one informative warn', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const corrupt = EMPTY_AGENDA.slice(0, 17) as unknown as AgendaSlots;
    renderWithProviders(<Agenda value={corrupt} onChange={jest.fn()} />);

    expect(screen.getAllByRole('textbox')).toHaveLength(18);
    // AC-008: normalizeAgenda must log informative warn when normalisation occurs.
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0]?.[0])).toMatch(/normalizeAgenda/i);
    warnSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// AC-002 / AC-027: HTML formatting passes through onChange unchanged
// ---------------------------------------------------------------------------

describe('Agenda — HTML round-trip (AC-002)', () => {
  it('preserves <b>/<i>/<u>/<s> markup verbatim through onChange', async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={EMPTY_AGENDA} onChangeSpy={spy} />);

    const editor = screen.getByTestId('editor-h12');
    const html = '<b>almoço</b> com <i>cliente</i>';
    await act(async () => {
      const setter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )?.set;
      setter?.call(editor, html);
      editor.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(spy).toHaveBeenCalled();
    const emitted = spy.mock.calls.at(-1)?.[0] as AgendaSlots;
    expect(emitted.find((s) => s.hour === 12)?.text).toBe(html);
  });
});

// ---------------------------------------------------------------------------
// AC-001 / AC-027: sequential edits preserve prior text (race safety)
// ---------------------------------------------------------------------------

describe('Agenda — sequential edits (race safety, AC-001)', () => {
  it("second edit keeps first edit's text in the emitted array", async () => {
    const spy = jest.fn();
    renderWithProviders(<Harness initial={EMPTY_AGENDA} onChangeSpy={spy} />);

    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;

    // First edit: slot 9
    const editor9 = screen.getByTestId('editor-h9');
    await act(async () => {
      setter?.call(editor9, 'reunião');
      editor9.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Second edit: slot 14 — must see the post-first-edit value, not the
    // pre-first-edit one. Tests the valueRef path in useAgenda.
    const editor14 = screen.getByTestId('editor-h14');
    await act(async () => {
      setter?.call(editor14, 'almoço');
      editor14.dispatchEvent(new Event('change', { bubbles: true }));
    });

    expect(spy).toHaveBeenCalledTimes(2);
    const second = spy.mock.calls[1]?.[0] as AgendaSlots;
    expect(second.find((s) => s.hour === 9)?.text).toBe('reunião');
    expect(second.find((s) => s.hour === 14)?.text).toBe('almoço');
  });
});
