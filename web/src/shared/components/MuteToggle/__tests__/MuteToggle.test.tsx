import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { MuteToggle } from '../MuteToggle';

import { soundController } from '@/shared/sound/soundController';

describe('MuteToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    soundController.setMuted(false);
  });

  it('renders unmuted icon and the "silence" aria-label by default', () => {
    render(<MuteToggle />);
    const btn = screen.getByRole('button', { name: /silenciar sons/i });
    expect(btn).toBeInTheDocument();
    expect(btn.querySelector('[data-testid="muteToggle-iconUnmuted"]')).not.toBeNull();
  });

  it('renders muted icon and the "activate" label after toggle', async () => {
    const user = userEvent.setup();
    render(<MuteToggle />);
    await user.click(screen.getByRole('button'));
    const btn = screen.getByRole('button', { name: /ativar sons/i });
    expect(btn.querySelector('[data-testid="muteToggle-iconMuted"]')).not.toBeNull();
  });

  it('persists state across remount via shared singleton', async () => {
    const user = userEvent.setup();
    const first = render(<MuteToggle />);
    await user.click(screen.getByRole('button'));
    first.unmount();
    render(<MuteToggle />);
    expect(screen.getByRole('button', { name: /ativar sons/i })).toBeInTheDocument();
  });
});
