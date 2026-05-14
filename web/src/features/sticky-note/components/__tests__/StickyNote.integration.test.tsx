/**
 * Integration tests: StickyNote — multi-color tabs, panels, MSW.
 *
 * Covers: AC-004, AC-006, AC-007, AC-010, AC-011, AC-012, AC-013,
 *         AC-015, AC-016, AC-017, AC-018, AC-023, AC-024.
 */

import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';

import { StickyNote } from '../StickyNote.js';

import { renderWithProviders } from '@/test-utils';
import { server } from '@/test-utils/msw/server';

jest.mock('@/features/rich-text-line', () => {
  const Editor = ({
    value,
    onChange,
    ariaLabel,
    autoFocus,
  }: {
    value: string;
    onChange: (_html: string) => void;
    ariaLabel?: string;
    autoFocus?: boolean;
    placeholder?: string;
    disabled?: boolean;
    className?: string;
  }) => (
    <input
      type="text"
      role="textbox"
      aria-label={ariaLabel}
      value={value}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
    />
  );
  return { RichTextLine: Editor, RichTextBlock: Editor };
});

const ITEM_Y = { id: 'item-y', prefix: '•', text: 'nota amarela' };

function stubGet(color: string, items: { id: string; prefix: string; text: string }[]) {
  server.use(http.get(`/api/sticky/${color}`, () => HttpResponse.json({ items, updatedAt: null })));
}

function stubPut(color: string, spy?: jest.Mock) {
  server.use(
    http.put(`/api/sticky/${color}`, async ({ request }) => {
      const body = await request.json();
      spy?.(body);
      return HttpResponse.json({ items: (body as { items: unknown[] }).items, updatedAt: null });
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  stubGet('y', [ITEM_Y]);
  stubGet('r', [{ id: 'item-r', prefix: '•', text: 'nota vermelha' }]);
  stubGet('g', []);
  stubGet('b', []);
  stubPut('y');
  stubPut('r');
  stubPut('g');
  stubPut('b');
});

afterEach(() => {
  jest.useRealTimers();
  jest.clearAllMocks();
  localStorage.clear();
});

// AC-007
describe('StickyNote — yellow tab always present (AC-007)', () => {
  it('renders "Fechar post-it Y" on mount (Y starts open)', () => {
    renderWithProviders(<StickyNote />);
    expect(screen.getByRole('button', { name: 'Fechar post-it Y' })).toBeInTheDocument();
  });
});

// AC-010
describe('StickyNote — tab toggles open/closed (AC-010)', () => {
  it('click Y tab → label changes to "Abrir post-it Y"', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Fechar post-it Y' }));
    expect(screen.getByRole('button', { name: 'Abrir post-it Y' })).toBeInTheDocument();
  });

  it('click Y tab twice → returns to open state', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Fechar post-it Y' }));
    await user.click(screen.getByRole('button', { name: 'Abrir post-it Y' }));
    expect(screen.getByRole('button', { name: 'Fechar post-it Y' })).toBeInTheDocument();
  });
});

// AC-006
describe('StickyNote — tab aria-label format (AC-006)', () => {
  it('tab aria-label is "Fechar post-it Y" when Y is open', () => {
    renderWithProviders(<StickyNote />);
    expect(screen.getByRole('button', { name: 'Fechar post-it Y' })).toBeInTheDocument();
  });
});

// AC-004 / AC-023
describe('StickyNote — panel shows fetched items (AC-004, AC-023)', () => {
  it('Y panel shows item from GET /api/sticky/y', async () => {
    renderWithProviders(<StickyNote />);
    await waitFor(() => expect(screen.getByDisplayValue('nota amarela')).toBeInTheDocument());
  });
});

// AC-013
describe('StickyNote — add color button visible (AC-013)', () => {
  it('shows "Adicionar cor de post-it" when only Y active', () => {
    renderWithProviders(<StickyNote />);
    expect(screen.getByRole('button', { name: 'Adicionar cor de post-it' })).toBeInTheDocument();
  });
});

// AC-015
describe('StickyNote — add color via picker (AC-015)', () => {
  it('clicking "+" then R opens R panel', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Adicionar cor de post-it' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar post-it R' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fechar post-it R' })).toBeInTheDocument(),
    );
  });
});

// AC-016
describe('StickyNote — click outside picker (AC-016)', () => {
  it('mousedown outside picker closes it', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Adicionar cor de post-it' }));
    expect(screen.getByRole('button', { name: 'Adicionar post-it R' })).toBeInTheDocument();
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Adicionar post-it R' })).not.toBeInTheDocument(),
    );
  });
});

// AC-012: click-away global
describe('StickyNote — click-away closes all panels (AC-012)', () => {
  it('mousedown outside all panels and tabs closes all open panels', async () => {
    // Y starts open by default
    renderWithProviders(<StickyNote />);

    // Verify Y tab is open (aria-pressed="true")
    const yTab = screen.getByRole('button', { name: /post-it Y/i });
    expect(yTab).toHaveAttribute('aria-pressed', 'true');

    // Click outside all panels/tabs
    act(() => {
      document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    // Y panel should now be closed (aria-pressed="false")
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /post-it Y/i })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    });
  });
});

// AC-011
describe('StickyNote — multiple panels open (AC-011)', () => {
  it('Y and R panels both open after adding R', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Adicionar cor de post-it' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar post-it R' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Fechar post-it Y' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fechar post-it R' })).toBeInTheDocument();
    });
  });
});

// AC-018
describe('StickyNote — localStorage persistence (AC-018)', () => {
  it('calendarfr_sticky_colors is ["y","r"] after adding R', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Adicionar cor de post-it' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar post-it R' }));
    await waitFor(() => {
      const stored = localStorage.getItem('calendarfr_sticky_colors');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(['y', 'r']);
    });
  });
});

// AC-017
describe('StickyNote — no "+" when 4 colors active (AC-017)', () => {
  it('after adding R, G, B: "+" button gone', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    for (const color of ['R', 'G', 'B'] as const) {
      await user.click(screen.getByRole('button', { name: 'Adicionar cor de post-it' }));
      await user.click(screen.getByRole('button', { name: `Adicionar post-it ${color}` }));
    }
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Adicionar cor de post-it' }),
      ).not.toBeInTheDocument(),
    );
  });
});
