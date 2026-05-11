/**
 * Unit tests for SaveIndicator.
 *
 * Covers: AC-009 (saving label), AC-027 (retry button), AC-040 (aria-live).
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SaveIndicator } from '../SaveIndicator.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setup(props: Parameters<typeof SaveIndicator>[0]) {
  const user = userEvent.setup();
  const { rerender } = render(<SaveIndicator {...props} />);
  return { user, rerender };
}

// ---------------------------------------------------------------------------
// Status label tests
// ---------------------------------------------------------------------------

describe('SaveIndicator — status labels PT-BR', () => {
  it('renders "Salvo" for saved status', () => {
    setup({ saveStatus: 'saved', onRetry: jest.fn() });
    expect(screen.getByText('Salvo')).toBeInTheDocument();
  });

  it('renders "Salvando…" for saving status', () => {
    setup({ saveStatus: 'saving', onRetry: jest.fn() });
    expect(screen.getByText('Salvando…')).toBeInTheDocument();
  });

  it('renders "Editando…" for dirty status (AC-012: distinct from saving)', () => {
    setup({ saveStatus: 'dirty', onRetry: jest.fn() });
    expect(screen.getByText('Editando…')).toBeInTheDocument();
  });

  it('renders "Erro ao salvar" for error status', () => {
    setup({ saveStatus: 'error', onRetry: jest.fn() });
    expect(screen.getByText('Erro ao salvar')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Error state — retry button (AC-027)
// ---------------------------------------------------------------------------

describe('SaveIndicator — error state retry button', () => {
  it('renders retry button in error state', () => {
    setup({ saveStatus: 'error', onRetry: jest.fn() });
    expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
  });

  it('does NOT render retry button in saved state', () => {
    setup({ saveStatus: 'saved', onRetry: jest.fn() });
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('does NOT render retry button in saving state', () => {
    setup({ saveStatus: 'saving', onRetry: jest.fn() });
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('does NOT render retry button in dirty state', () => {
    setup({ saveStatus: 'dirty', onRetry: jest.fn() });
    expect(screen.queryByRole('button', { name: 'Tentar novamente' })).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button clicked', async () => {
    const onRetry = jest.fn();
    const { user } = setup({ saveStatus: 'error', onRetry });
    const btn = screen.getByRole('button', { name: 'Tentar novamente' });
    await user.click(btn);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('retry button is a real <button> element (not div)', () => {
    setup({ saveStatus: 'error', onRetry: jest.fn() });
    const btn = screen.getByRole('button', { name: 'Tentar novamente' });
    expect(btn.tagName).toBe('BUTTON');
  });
});

// ---------------------------------------------------------------------------
// Accessibility (AC-040)
// ---------------------------------------------------------------------------

describe('SaveIndicator — a11y', () => {
  it('status text element has aria-live="polite"', () => {
    setup({ saveStatus: 'saved', onRetry: jest.fn() });
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('status text element has aria-atomic="true"', () => {
    setup({ saveStatus: 'saved', onRetry: jest.fn() });
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-atomic', 'true');
  });

  it('status transitions are reflected in the live region', () => {
    const { rerender } = render(<SaveIndicator saveStatus="saving" onRetry={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Salvando…');

    rerender(<SaveIndicator saveStatus="saved" onRetry={jest.fn()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Salvo');
  });
});
