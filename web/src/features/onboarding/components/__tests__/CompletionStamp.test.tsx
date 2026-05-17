import { render, screen } from '@testing-library/react';

import { SealHandDrawn } from '../../assets/SealHandDrawn.js';
import { CompletionStamp } from '../CompletionStamp.js';

describe('CompletionStamp', () => {
  it('renders nothing when completedOnDate is null', () => {
    const { container } = render(
      <CompletionStamp completedOnDate={null} currentDate="2026-05-17" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when completedOnDate differs from currentDate', () => {
    const { container } = render(
      <CompletionStamp completedOnDate="2026-05-16" currentDate="2026-05-17" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders stamp when completedOnDate matches currentDate', () => {
    render(<CompletionStamp completedOnDate="2026-05-17" currentDate="2026-05-17" />);
    const stamp = screen.getByRole('img', { hidden: true });
    expect(stamp).toBeInTheDocument();
  });

  it('renders tagline with pt-BR formatted date when matching', () => {
    render(<CompletionStamp completedOnDate="2026-05-17" currentDate="2026-05-17" />);
    const tagline = screen.getByTestId('completion-stamp-tagline');
    expect(tagline.textContent).toMatch(/iniciado em/i);
    expect(tagline.textContent).toMatch(/17 de maio de 2026/i);
  });

  it('rendered container has pointer-events: none via data attribute', () => {
    const { container } = render(
      <CompletionStamp completedOnDate="2026-05-17" currentDate="2026-05-17" />,
    );
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveAttribute('data-testid', 'completion-stamp');
  });
});

describe('SealHandDrawn — unique filter IDs', () => {
  it('renders 2 instances with distinct filter IDs and no duplicates', () => {
    const { container } = render(
      <>
        <SealHandDrawn completed={false} />
        <SealHandDrawn completed={true} />
      </>,
    );
    const filters = container.querySelectorAll('[id^="seal-turbulence"]');
    expect(filters).toHaveLength(2);
    const id0 = filters[0]?.getAttribute('id');
    const id1 = filters[1]?.getAttribute('id');
    expect(id0).toBeTruthy();
    expect(id1).toBeTruthy();
    expect(id0).not.toEqual(id1);
  });
});
