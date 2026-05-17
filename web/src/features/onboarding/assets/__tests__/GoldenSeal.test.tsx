import { render, screen } from '@testing-library/react';

import { GoldenSeal } from '../GoldenSeal';

describe('GoldenSeal (FEAT-029 redesign)', () => {
  it('renders an svg with the happy-sticker palette (coral + white die-cut)', () => {
    render(<GoldenSeal />);
    const svg = screen.getByTestId('goldenSeal-svg');
    expect(svg.getAttribute('width')).toBe('72');
    const die = svg.querySelector('[data-testid="goldenSeal-die"]');
    expect(die).not.toBeNull();
    expect(die?.getAttribute('fill')).toBe('#f5854b');
    expect(die?.getAttribute('stroke')).toBe('#fff');
  });

  it('renders the "Boa!" hand-lettered label', () => {
    render(<GoldenSeal />);
    expect(screen.getByText('Boa!')).toBeInTheDocument();
  });

  it('is decorative (aria-hidden)', () => {
    render(<GoldenSeal />);
    expect(screen.getByTestId('goldenSeal-svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders a checkmark path', () => {
    render(<GoldenSeal />);
    expect(
      screen.getByTestId('goldenSeal-svg').querySelector('[data-testid="goldenSeal-check"]'),
    ).not.toBeNull();
  });
});
