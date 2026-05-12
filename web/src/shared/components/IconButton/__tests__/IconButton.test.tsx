import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { IconButton } from '../IconButton';

describe('IconButton', () => {
  // AC-016: component exists and renders
  it('renders a button element', () => {
    render(<IconButton aria-label="delete item">X</IconButton>);
    expect(screen.getByRole('button', { name: 'delete item' })).toBeInTheDocument();
  });

  // AC-017: aria-label is required — TS enforces this at compile time;
  // at runtime, the label must be present in the DOM
  it('applies aria-label to the button', () => {
    render(<IconButton aria-label="close">X</IconButton>);
    const btn = screen.getByRole('button', { name: 'close' });
    expect(btn).toHaveAttribute('aria-label', 'close');
  });

  it('supports aria-labelledby when passed via discriminated type', () => {
    render(
      <>
        <span id="lbl">remove</span>
        {/* Cast through unknown — testing runtime path of discriminated union */}
        <IconButton {...({ 'aria-labelledby': 'lbl' } as unknown as { 'aria-label': string })}>
          X
        </IconButton>
      </>,
    );
    // aria-labelledby gives the button the accessible name from the span
    expect(screen.getByRole('button', { name: 'remove' })).toBeInTheDocument();
  });

  // AC-018: size sm produces min-width / min-height of 32px enforced via CSS;
  // identity-obj-proxy returns class names as their key, so we verify the class is applied
  it('applies size class for sm (default)', () => {
    render(<IconButton aria-label="btn">X</IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('sm');
  });

  it('applies size class for md when size=md', () => {
    render(
      <IconButton aria-label="btn" size="md">
        X
      </IconButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('md');
  });

  it('applies size class for lg when size=lg', () => {
    render(
      <IconButton aria-label="btn" size="lg">
        X
      </IconButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('lg');
  });

  // AC-019: variant ghost / danger
  it('applies ghost variant class by default', () => {
    render(<IconButton aria-label="btn">X</IconButton>);
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('ghost');
  });

  it('applies danger variant class when variant=danger', () => {
    render(
      <IconButton aria-label="btn" variant="danger">
        X
      </IconButton>,
    );
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('danger');
  });

  it('renders children inside the button', () => {
    render(<IconButton aria-label="move">&#8594;</IconButton>);
    expect(screen.getByRole('button', { name: 'move' })).toHaveTextContent('→');
  });

  it('is disabled when disabled prop is passed', () => {
    render(
      <IconButton aria-label="btn" disabled>
        X
      </IconButton>,
    );
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(
      <IconButton aria-label="click me" onClick={handleClick}>
        X
      </IconButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup();
    const handleClick = jest.fn();
    render(
      <IconButton aria-label="click me" onClick={handleClick} disabled>
        X
      </IconButton>,
    );
    await user.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards additional HTML button attributes', () => {
    render(
      <IconButton aria-label="btn" type="submit" data-testid="my-btn">
        X
      </IconButton>,
    );
    const btn = screen.getByTestId('my-btn');
    expect(btn).toHaveAttribute('type', 'submit');
  });

  it('defaults to type=button to prevent accidental form submission', () => {
    render(<IconButton aria-label="btn">X</IconButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
  });
});
