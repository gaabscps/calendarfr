import { render, screen } from '@testing-library/react';

import { QuestSealSticker } from '../QuestSealSticker';

describe('QuestSealSticker', () => {
  it('renders an svg with a white die-cut border and a check path', () => {
    render(<QuestSealSticker />);
    const svg = screen.getByTestId('questSealSticker-svg');
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg.querySelector('[data-testid="questSealSticker-die"]')).not.toBeNull();
    expect(svg.querySelector('[data-testid="questSealSticker-check"]')).not.toBeNull();
  });

  it('is decorative (aria-hidden)', () => {
    render(<QuestSealSticker />);
    expect(screen.getByTestId('questSealSticker-svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
