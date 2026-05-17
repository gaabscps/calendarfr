import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QuestSticky } from '../QuestSticky.js';

describe('QuestSticky', () => {
  it('renders children inside a region with the given aria-label', () => {
    render(
      <QuestSticky ariaLabel="Roteiro do diário">
        <span>content</span>
      </QuestSticky>,
    );
    const region = screen.getByRole('region', { name: 'Roteiro do diário' });
    expect(region).toBeInTheDocument();
    expect(region).toHaveTextContent('content');
  });

  it('renders "ocultar roteiro" button when onDismiss is provided', () => {
    render(
      <QuestSticky ariaLabel="Roteiro do diário" onDismiss={jest.fn()}>
        <span>content</span>
      </QuestSticky>,
    );
    expect(screen.getByRole('button', { name: /ocultar roteiro/i })).toBeInTheDocument();
  });

  it('calls onDismiss when "ocultar roteiro" is clicked', async () => {
    const user = userEvent.setup();
    const onDismiss = jest.fn();
    render(
      <QuestSticky ariaLabel="Roteiro do diário" onDismiss={onDismiss}>
        <span>content</span>
      </QuestSticky>,
    );
    await user.click(screen.getByRole('button', { name: /ocultar roteiro/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not render "ocultar roteiro" button when onDismiss is absent', () => {
    render(
      <QuestSticky ariaLabel="Roteiro do diário">
        <span>content</span>
      </QuestSticky>,
    );
    expect(screen.queryByRole('button', { name: /ocultar roteiro/i })).not.toBeInTheDocument();
  });

  it('renders optional headerLabel when provided', () => {
    render(
      <QuestSticky ariaLabel="Roteiro do diário" headerLabel="Roteiro concluído ✓">
        <span>content</span>
      </QuestSticky>,
    );
    expect(screen.getByText('Roteiro concluído ✓')).toBeInTheDocument();
  });
});
