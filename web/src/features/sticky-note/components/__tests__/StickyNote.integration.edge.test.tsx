/**
 * Integration tests: StickyNote — edge cases.
 *
 * Covers: AC-001, AC-005, AC-008, AC-009, AC-014, AC-024,
 *         AC-032, AC-033, AC-034, AC-035, AC-036.
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

function stubGet(color: string, items: { id: string; prefix: string; text: string }[]) {
  server.use(http.get(`/api/sticky/${color}`, () => HttpResponse.json({ items, updatedAt: null })));
}

function stubPut(color: string) {
  server.use(
    http.put(`/api/sticky/${color}`, async ({ request }) => {
      const body = await request.json();
      return HttpResponse.json({ items: (body as { items: unknown[] }).items, updatedAt: null });
    }),
  );
}

beforeEach(() => {
  localStorage.clear();
  stubGet('y', [{ id: 'item-y', prefix: '•', text: 'nota amarela' }]);
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

// AC-005: panel open/closed class
describe('StickyNote — panel open class (AC-005)', () => {
  it('Y panel has .open class on mount', () => {
    renderWithProviders(<StickyNote />);
    expect(screen.getByLabelText('Painel de anotações globais').className).toMatch(/open/);
  });

  it('Y panel gets .closed class after clicking Y tab', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Fechar post-it Y' }));
    expect(screen.getByLabelText('Painel de anotações globais').className).toMatch(/closed/);
  });
});

// AC-032: panel aria-label + loading opacity
describe('StickyNote — panel aria-label and loading opacity (AC-032)', () => {
  it('panel has aria-label "Painel de anotações globais"', () => {
    renderWithProviders(<StickyNote />);
    expect(screen.getByLabelText('Painel de anotações globais')).toBeInTheDocument();
  });

  it('tab has opacity 0.6 while GET /api/sticky/y is pending', async () => {
    let resolveGet!: () => void;
    const getDelay = new Promise<void>((res) => {
      resolveGet = res;
    });

    server.use(
      http.get('/api/sticky/:color', async () => {
        await getDelay;
        return HttpResponse.json({ items: [], updatedAt: null });
      }),
    );

    renderWithProviders(<StickyNote />);

    // While GET is pending, the yellow tab should have opacity 0.6
    const yTab = screen.getByRole('button', { name: /post-it Y/i });
    expect(yTab).toHaveStyle({ opacity: '0.6' });

    // Resolve the GET
    act(() => {
      resolveGet();
    });

    // After fetch completes, tab opacity should change (open → 1, closed → 0.55)
    await waitFor(() => {
      expect(yTab).not.toHaveStyle({ opacity: '0.6' });
    });
  });
});

// AC-033: non-Yellow panel has close button
describe('StickyNote — R panel has close button (AC-033)', () => {
  it('R panel has close button aria-label="Fechar post-it"', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Adicionar cor de post-it' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar post-it R' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fechar post-it' })).toBeInTheDocument(),
    );
  });
});

// AC-036: Yellow panel has NO close button
describe('StickyNote — Y panel no close button (AC-036)', () => {
  it('Yellow panel has no "Fechar post-it" (×) button', () => {
    renderWithProviders(<StickyNote />);
    expect(screen.queryByRole('button', { name: 'Fechar post-it' })).not.toBeInTheDocument();
  });
});

// AC-034: tab aria-label reflects open state
describe('StickyNote — tab aria-label reflects open state (AC-034)', () => {
  it('"Fechar post-it Y" when open → "Abrir post-it Y" when closed', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    expect(screen.getByRole('button', { name: 'Fechar post-it Y' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Fechar post-it Y' }));
    expect(screen.getByRole('button', { name: 'Abrir post-it Y' })).toBeInTheDocument();
  });
});

// AC-035: tab aria-pressed
describe('StickyNote — tab aria-pressed (AC-035)', () => {
  it('Y tab aria-pressed="true" when open', () => {
    renderWithProviders(<StickyNote />);
    expect(screen.getByRole('button', { name: 'Fechar post-it Y' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('Y tab aria-pressed="false" after closing', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Fechar post-it Y' }));
    expect(screen.getByRole('button', { name: 'Abrir post-it Y' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });
});

// AC-009: tab opacity
describe('StickyNote — tab opacity (AC-009)', () => {
  it('Y tab opacity is 1 when open (after loading)', async () => {
    renderWithProviders(<StickyNote />);
    // isLoading starts true (fetch in-flight); wait for it to settle
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fechar post-it Y' }).style.opacity).toBe('1'),
    );
  });

  it('Y tab opacity is 0.55 when closed (after loading)', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    // Wait for loading to finish before toggling
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Fechar post-it Y' }).style.opacity).toBe('1'),
    );
    await user.click(screen.getByRole('button', { name: 'Fechar post-it Y' }));
    expect(screen.getByRole('button', { name: 'Abrir post-it Y' }).style.opacity).toBe('0.55');
  });
});

// AC-008: Yellow tab background color
describe('StickyNote — tab background color (AC-008)', () => {
  it('Y tab style has yellow color (#f5e06e / rgb equivalent)', () => {
    renderWithProviders(<StickyNote />);
    const tab = screen.getByRole('button', { name: 'Fechar post-it Y' });
    const bg = tab.style.background;
    // jsdom may normalize hex → rgb; check for either
    const isYellow = bg.includes('245, 224, 110') || bg === '#f5e06e';
    expect(isYellow).toBe(true);
  });
});

// AC-001: panel in DOM with .panel class
describe('StickyNote — panel in DOM (AC-001)', () => {
  it('panel element has "panel" class', () => {
    renderWithProviders(<StickyNote />);
    expect(screen.getByLabelText('Painel de anotações globais').className).toMatch(/panel/);
  });
});

// AC-024: panel has inline left/top style (position fixed)
describe('StickyNote — panel position fixed (AC-024)', () => {
  it('panel has inline left/top style set', () => {
    renderWithProviders(<StickyNote />);
    const panel = screen.getByLabelText('Painel de anotações globais') as HTMLElement;
    expect(panel.style.left !== '' || panel.style.top !== '').toBe(true);
  });
});

// AC-014: picker shows only unavailable colors
describe('StickyNote — picker shows only unavailable colors (AC-014)', () => {
  it('after R is active, picker shows G and B but not Y or R', async () => {
    const user = userEvent.setup({ delay: null });
    renderWithProviders(<StickyNote />);
    await user.click(screen.getByRole('button', { name: 'Adicionar cor de post-it' }));
    await user.click(screen.getByRole('button', { name: 'Adicionar post-it R' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Adicionar cor de post-it' })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole('button', { name: 'Adicionar cor de post-it' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Adicionar post-it G' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Adicionar post-it B' })).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: 'Adicionar post-it Y' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adicionar post-it R' })).not.toBeInTheDocument();
  });
});
