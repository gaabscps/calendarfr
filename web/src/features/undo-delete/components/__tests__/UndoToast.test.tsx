/**
 * Unit tests: UndoToast — FEAT-022 (AC-001, AC-002).
 *
 * Covers:
 *  - renders label text
 *  - renders countdown formatted as "Ns"
 *  - clicking "Desfazer" calls onUndo once
 *  - button has accessible name "Desfazer remoção"
 *  - does not crash with secondsRemaining: 0
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { UndoToast } from '../UndoToast';

describe('UndoToast', () => {
  it('renders the label prop text', () => {
    render(<UndoToast label="Prioridade removida" secondsRemaining={7} onUndo={() => {}} />);
    expect(screen.getByText('Prioridade removida')).toBeInTheDocument();
  });

  it('renders the countdown formatted as "Ns"', () => {
    render(<UndoToast label="Nota removida" secondsRemaining={5} onUndo={() => {}} />);
    expect(screen.getByText('5s')).toBeInTheDocument();
  });

  it('clicking "Desfazer" calls onUndo exactly once', async () => {
    const user = userEvent.setup();
    const handleUndo = jest.fn();
    render(<UndoToast label="Prioridade removida" secondsRemaining={9} onUndo={handleUndo} />);

    const button = screen.getByRole('button', { name: 'Desfazer remoção' });
    await user.click(button);

    expect(handleUndo).toHaveBeenCalledTimes(1);
  });

  it('button exposes accessible name "Desfazer remoção"', () => {
    render(<UndoToast label="qualquer" secondsRemaining={3} onUndo={() => {}} />);
    expect(screen.getByRole('button', { name: 'Desfazer remoção' })).toBeInTheDocument();
  });

  it('does not crash with secondsRemaining=0 and renders "0s"', () => {
    render(<UndoToast label="Item removido" secondsRemaining={0} onUndo={() => {}} />);
    expect(screen.getByText('0s')).toBeInTheDocument();
  });
});
