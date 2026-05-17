import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { soundController } from '../soundController.js';
import { useSoundController } from '../useSoundController.js';

function Harness() {
  const { muted, toggleMute, play } = useSoundController();
  return (
    <div>
      <span data-testid="state">{muted ? 'muted' : 'unmuted'}</span>
      <button type="button" onClick={toggleMute}>
        toggle
      </button>
      <button type="button" onClick={() => play('mission-complete')}>
        play
      </button>
    </div>
  );
}

describe('useSoundController', () => {
  beforeEach(() => {
    localStorage.clear();
    act(() => {
      soundController.setMuted(false);
    });
  });

  it('reflects current mute state', () => {
    render(<Harness />);
    expect(screen.getByTestId('state')).toHaveTextContent('unmuted');
  });

  it('re-renders when mute toggles', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('state')).toHaveTextContent('muted');
    await user.click(screen.getByText('toggle'));
    expect(screen.getByTestId('state')).toHaveTextContent('unmuted');
  });

  it('exposes play function bound to the singleton', async () => {
    const user = userEvent.setup();
    const playSpy = jest.spyOn(soundController, 'play');
    render(<Harness />);
    await user.click(screen.getByText('play'));
    expect(playSpy).toHaveBeenCalledWith('mission-complete');
    playSpy.mockRestore();
  });
});
