/**
 * Unit tests for ConfirmDeleteButton — FEAT-022 T-006.
 *
 * Covers AC-006 (2-clique confirma), AC-007 (timer expira sem confirmar),
 * AC-008 (clique fora reverte), AC-009 (Tab fora reverte).
 */

import { act, fireEvent, render, screen } from '@testing-library/react';

import { ConfirmDeleteButton } from '../ConfirmDeleteButton';

describe('ConfirmDeleteButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('renders idleLabel and aria-pressed=false by default', () => {
    render(<ConfirmDeleteButton onConfirm={jest.fn()} />);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Remover');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('aria-label', 'Remover');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('first click transitions to confirming state with updated label and aria', () => {
    render(<ConfirmDeleteButton onConfirm={jest.fn()} />);
    const btn = screen.getByRole('button');

    act(() => {
      fireEvent.click(btn);
    });

    expect(btn).toHaveTextContent('Confirmar?');
    expect(btn).toHaveAttribute('aria-pressed', 'true');
    expect(btn).toHaveAttribute('aria-label', 'Confirmar remoção');
  });

  it('second click in confirming calls onConfirm exactly once and reverts to idle', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDeleteButton onConfirm={onConfirm} />);
    const btn = screen.getByRole('button');

    act(() => {
      fireEvent.click(btn);
    });
    act(() => {
      fireEvent.click(btn);
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(btn).toHaveTextContent('Remover');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('reverts to idle after 3s timer without calling onConfirm', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDeleteButton onConfirm={onConfirm} />);
    const btn = screen.getByRole('button');

    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      jest.advanceTimersByTime(3001);
    });

    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveTextContent('Remover');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('reverts to idle when pointerdown fires outside the button', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDeleteButton onConfirm={onConfirm} />);
    const btn = screen.getByRole('button');

    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      fireEvent.pointerDown(document.body);
    });

    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveTextContent('Remover');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does NOT revert when pointerdown is on the button itself', () => {
    render(<ConfirmDeleteButton onConfirm={jest.fn()} />);
    const btn = screen.getByRole('button');

    act(() => {
      fireEvent.click(btn);
    });
    act(() => {
      fireEvent.pointerDown(btn);
    });

    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('reverts to idle when Tab moves focus outside (blur with relatedTarget)', () => {
    const onConfirm = jest.fn();
    render(
      <>
        <ConfirmDeleteButton onConfirm={onConfirm} />
        <button type="button" data-testid="other">
          other
        </button>
      </>,
    );
    const btn = screen.getByRole('button', { name: 'Remover' });
    const other = screen.getByTestId('other');

    act(() => {
      fireEvent.click(btn);
    });
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    act(() => {
      fireEvent.blur(btn, { relatedTarget: other });
    });

    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders custom children in idle and confirmingLabel text in confirming', () => {
    render(
      <ConfirmDeleteButton onConfirm={jest.fn()}>
        <span data-testid="x-icon">X</span>
      </ConfirmDeleteButton>,
    );
    const btn = screen.getByRole('button');

    expect(screen.getByTestId('x-icon')).toBeInTheDocument();

    act(() => {
      fireEvent.click(btn);
    });

    expect(screen.queryByTestId('x-icon')).not.toBeInTheDocument();
    expect(btn).toHaveTextContent('Confirmar?');
  });

  it('applies different CSS classes for idle vs confirming states', () => {
    render(<ConfirmDeleteButton onConfirm={jest.fn()} />);
    const btn = screen.getByRole('button');

    expect(btn.className).toContain('idle');
    expect(btn.className).not.toContain('confirming');

    act(() => {
      fireEvent.click(btn);
    });

    expect(btn.className).toContain('confirming');
  });

  it('honors custom idleLabel/confirmingLabel and aria-label overrides', () => {
    render(
      <ConfirmDeleteButton
        onConfirm={jest.fn()}
        idleLabel="Apagar"
        confirmingLabel="Tem certeza?"
        idleAriaLabel="Apagar item"
        confirmingAriaLabel="Confirmar apagar"
      />,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('Apagar');
    expect(btn).toHaveAttribute('aria-label', 'Apagar item');

    act(() => {
      fireEvent.click(btn);
    });

    expect(btn).toHaveTextContent('Tem certeza?');
    expect(btn).toHaveAttribute('aria-label', 'Confirmar apagar');
  });

  it('does not call onConfirm when reverting via timer expiry', () => {
    const onConfirm = jest.fn();
    render(<ConfirmDeleteButton onConfirm={onConfirm} />);
    const btn = screen.getByRole('button');

    act(() => {
      fireEvent.click(btn);
    });
    act(() => {
      jest.advanceTimersByTime(3001);
    });

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('clears timer on unmount without errors', () => {
    const { unmount } = render(<ConfirmDeleteButton onConfirm={jest.fn()} />);
    const btn = screen.getByRole('button');

    act(() => {
      fireEvent.click(btn);
    });

    expect(() => {
      unmount();
      jest.advanceTimersByTime(5000);
    }).not.toThrow();
  });

  it('applies custom className to the button', () => {
    render(<ConfirmDeleteButton onConfirm={jest.fn()} className="my-custom-class" />);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('my-custom-class');
  });
});
