import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { QuestSticky } from '../QuestSticky.js';

import { soundController } from '@/shared/sound/soundController';

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

describe('QuestSticky — FEAT-029 sound + mute toggle', () => {
  beforeEach(() => {
    localStorage.clear();
    soundController.setMuted(false);
  });

  it('plays sticky-attach when first rendered visible', () => {
    const playSpy = jest.spyOn(soundController, 'play');
    render(
      <QuestSticky visible={true} ariaLabel="x" headerLabel="Roteiro">
        <div>body</div>
      </QuestSticky>,
    );
    expect(playSpy).toHaveBeenCalledWith('sticky-attach');
    playSpy.mockRestore();
  });

  it('plays sticky-peel when transitioning visible → hidden', () => {
    const playSpy = jest.spyOn(soundController, 'play');
    const { rerender } = render(
      <QuestSticky visible={true} ariaLabel="x" headerLabel="Roteiro">
        <div>body</div>
      </QuestSticky>,
    );
    playSpy.mockClear();
    rerender(
      <QuestSticky visible={false} ariaLabel="x" headerLabel="Roteiro">
        <div>body</div>
      </QuestSticky>,
    );
    expect(playSpy).toHaveBeenCalledWith('sticky-peel');
    playSpy.mockRestore();
  });

  it('renders the MuteToggle in the header', () => {
    render(
      <QuestSticky visible={true} ariaLabel="x" headerLabel="Roteiro">
        <div>body</div>
      </QuestSticky>,
    );
    expect(screen.getByRole('button', { name: /silenciar sons/i })).toBeInTheDocument();
  });

  it('clicking the MuteToggle does not invoke onDismiss', async () => {
    const onDismiss = jest.fn();
    const user = userEvent.setup();
    render(
      <QuestSticky visible={true} ariaLabel="x" headerLabel="Roteiro" onDismiss={onDismiss}>
        <div>body</div>
      </QuestSticky>,
    );
    await user.click(screen.getByRole('button', { name: /silenciar sons/i }));
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
