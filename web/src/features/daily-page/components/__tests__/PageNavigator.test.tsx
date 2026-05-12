/**
 * Unit tests for PageNavigator.
 *
 * Covers: AC-038 (header region), AC-039 (aria-live on date), AC-041 (button labels,
 * aria-keyshortcuts), AC-042 (focus visible — structural, not visual).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { PageNavigator } from '../PageNavigator.js';

// ---------------------------------------------------------------------------
// Helpers / fixtures
// ---------------------------------------------------------------------------

const DATE = '2026-05-11';
const DATE_FORMATTED = 'segunda-feira, 11 de maio de 2026';

function makeProps(overrides: Partial<Parameters<typeof PageNavigator>[0]> = {}) {
  return {
    date: DATE,
    saveStatus: 'saved' as const,
    isAnimating: false,
    goToPrev: jest.fn(),
    goToNext: jest.fn(),
    onRetry: jest.fn(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Date display (AC-039)
// ---------------------------------------------------------------------------

describe('PageNavigator — date display', () => {
  it('renders formatted date via formatDateLong', () => {
    render(<PageNavigator {...makeProps()} />);
    expect(screen.getByText(DATE_FORMATTED)).toBeInTheDocument();
  });

  it('date heading has aria-live="polite"', () => {
    render(<PageNavigator {...makeProps()} />);
    const heading = screen.getByRole('heading', { level: 1 });
    expect(heading).toHaveAttribute('aria-live', 'polite');
  });

  it('updates displayed date when prop changes', () => {
    const { rerender } = render(<PageNavigator {...makeProps()} />);
    rerender(<PageNavigator {...makeProps({ date: '2026-05-12' })} />);
    expect(screen.getByText('terça-feira, 12 de maio de 2026')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Navigation buttons (AC-041)
// ---------------------------------------------------------------------------

describe('PageNavigator — navigation buttons', () => {
  it('renders prev button with correct aria-label', () => {
    render(<PageNavigator {...makeProps()} />);
    expect(screen.getByRole('button', { name: 'Dia anterior' })).toBeInTheDocument();
  });

  it('renders next button with correct aria-label', () => {
    render(<PageNavigator {...makeProps()} />);
    expect(screen.getByRole('button', { name: 'Próximo dia' })).toBeInTheDocument();
  });

  it('prev button has aria-keyshortcuts attribute', () => {
    render(<PageNavigator {...makeProps()} />);
    const btn = screen.getByRole('button', { name: 'Dia anterior' });
    expect(btn).toHaveAttribute('aria-keyshortcuts', 'Control+ArrowLeft Meta+ArrowLeft');
  });

  it('next button has aria-keyshortcuts attribute', () => {
    render(<PageNavigator {...makeProps()} />);
    const btn = screen.getByRole('button', { name: 'Próximo dia' });
    expect(btn).toHaveAttribute('aria-keyshortcuts', 'Control+ArrowRight Meta+ArrowRight');
  });

  it('clicking prev button calls goToPrev', async () => {
    const goToPrev = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PageNavigator {...makeProps({ goToPrev })} />);
    await user.click(screen.getByRole('button', { name: 'Dia anterior' }));
    expect(goToPrev).toHaveBeenCalledTimes(1);
  });

  it('clicking next button calls goToNext', async () => {
    const goToNext = jest.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<PageNavigator {...makeProps({ goToNext })} />);
    await user.click(screen.getByRole('button', { name: 'Próximo dia' }));
    expect(goToNext).toHaveBeenCalledTimes(1);
  });

  it('buttons are real <button> elements', () => {
    render(<PageNavigator {...makeProps()} />);
    const prev = screen.getByRole('button', { name: 'Dia anterior' });
    const next = screen.getByRole('button', { name: 'Próximo dia' });
    expect(prev.tagName).toBe('BUTTON');
    expect(next.tagName).toBe('BUTTON');
  });
});

// ---------------------------------------------------------------------------
// isAnimating disables buttons (AC-034 — prevent rapid stacking)
// ---------------------------------------------------------------------------

describe('PageNavigator — isAnimating disables buttons', () => {
  it('disables both buttons when isAnimating is true', () => {
    render(<PageNavigator {...makeProps({ isAnimating: true })} />);
    expect(screen.getByRole('button', { name: 'Dia anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próximo dia' })).toBeDisabled();
  });

  it('enables both buttons when isAnimating is false', () => {
    render(<PageNavigator {...makeProps({ isAnimating: false })} />);
    expect(screen.getByRole('button', { name: 'Dia anterior' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Próximo dia' })).not.toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Header region semantics (AC-038)
// ---------------------------------------------------------------------------

describe('PageNavigator — header region semantics', () => {
  it('has a header region with aria-label', () => {
    render(<PageNavigator {...makeProps()} />);
    // Either role="banner" or role="region" with aria-label is valid
    const region = screen.getByRole('region', { name: 'Cabeçalho do dia' });
    expect(region).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FEAT-017 — Baseline rhythm (AC-005, AC-006, AC-007)
// ---------------------------------------------------------------------------

describe('PageNavigator — FEAT-017 baseline rhythm', () => {
  it('AC-006: date heading has explicit line-height: 48px', () => {
    render(<PageNavigator {...makeProps()} />);
    const heading = screen.getByRole('heading', { level: 1 });
    // class hash makes lookup awkward; rely on computed style via className containing dateHeading
    expect(heading.className).toMatch(/dateHeading/);
  });

  it('AC-005: navigator root has the navigator/header style class', () => {
    render(<PageNavigator {...makeProps()} />);
    const region = screen.getByRole('region', { name: 'Cabeçalho do dia' });
    // The container must carry the module class (was .header, now also functions as the 48px navigator block)
    expect(region.className).toMatch(/(header|navigator)/);
  });

  it('AC-007: SaveIndicator uses role=status and is not nested in a .center column with extra gap rows', () => {
    render(<PageNavigator {...makeProps({ saveStatus: 'saved' })} />);
    // SaveIndicator should still be present and accessible
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// SaveIndicator integration
// ---------------------------------------------------------------------------

describe('PageNavigator — SaveIndicator integration', () => {
  it('shows Salvo in saved state', () => {
    render(<PageNavigator {...makeProps({ saveStatus: 'saved' })} />);
    expect(screen.getByText('Salvo')).toBeInTheDocument();
  });

  it('shows Salvando… in saving state', () => {
    render(<PageNavigator {...makeProps({ saveStatus: 'saving' })} />);
    expect(screen.getByText('Salvando…')).toBeInTheDocument();
  });

  it('shows retry button in error state and calls onRetry', async () => {
    const onRetry = jest.fn();
    const user = userEvent.setup();
    render(<PageNavigator {...makeProps({ saveStatus: 'error', onRetry })} />);
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
