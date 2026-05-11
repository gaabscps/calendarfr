/**
 * Branch coverage tests for LoadErrorScreen.tsx.
 *
 * Covers uncovered branch:
 *   - Line 36: error.message fallback when message is empty string
 *     (the `error.message || 'Não foi possível carregar os dados.'` branch)
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { LoadErrorScreen } from '../LoadErrorScreen.js';

describe('LoadErrorScreen — onRetry / message branches (line 36)', () => {
  it('shows fallback message when error.message is empty string', () => {
    // Covers line 36: error.message is falsy → shows fallback
    const emptyMessageError = new Error('');
    render(<LoadErrorScreen error={emptyMessageError} onReload={jest.fn()} />);

    expect(screen.getByText('Não foi possível carregar os dados.')).toBeInTheDocument();
  });

  it('shows the error message when error.message is non-empty', () => {
    // Covers line 36: error.message truthy → shows it
    const err = new Error('Servidor indisponível');
    render(<LoadErrorScreen error={err} onReload={jest.fn()} />);

    expect(screen.getByText('Servidor indisponível')).toBeInTheDocument();
  });

  it('calls onReload when the Recarregar button is clicked', async () => {
    const onReload = jest.fn();
    render(<LoadErrorScreen error={new Error('erro')} onReload={onReload} />);

    await userEvent.click(screen.getByRole('button', { name: /recarregar/i }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  it('renders error screen with role=alert', () => {
    render(<LoadErrorScreen error={new Error('erro')} onReload={jest.fn()} />);

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });
});
