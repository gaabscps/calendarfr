import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { HelpButton } from '../HelpButton.js';

describe('HelpButton', () => {
  it('renders with default aria-label', () => {
    render(<HelpButton onClick={jest.fn()} />);
    expect(screen.getByRole('button', { name: 'Abrir roteiro do diário' })).toBeInTheDocument();
  });

  it('renders with custom aria-label when provided', () => {
    render(<HelpButton onClick={jest.fn()} ariaLabel="Ajuda personalizada" />);
    expect(screen.getByRole('button', { name: 'Ajuda personalizada' })).toBeInTheDocument();
  });

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    render(<HelpButton onClick={onClick} />);
    await user.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('renders children (HelpGlyph SVG inside)', () => {
    const { container } = render(<HelpButton onClick={jest.fn()} />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });
});
