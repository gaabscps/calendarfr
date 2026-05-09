import { render, screen } from '@testing-library/react';

import { PaperSheet } from './PaperSheet';

describe('PaperSheet', () => {
  it('renders children', () => {
    render(<PaperSheet>hello world</PaperSheet>);
    expect(screen.getByText('hello world')).toBeInTheDocument();
  });

  it('has data-paper-sheet attribute', () => {
    render(<PaperSheet>content</PaperSheet>);
    expect(screen.getByText('content').closest('[data-paper-sheet="true"]')).toBeInTheDocument();
  });

  it('applies padded class when padded prop is true (default)', () => {
    render(<PaperSheet>padded</PaperSheet>);
    const el = screen.getByText('padded').closest('[data-paper-sheet="true"]');
    expect(el?.className).toContain('padded');
  });

  it('renders with custom as tag', () => {
    render(<PaperSheet as="section">section content</PaperSheet>);
    const el = screen.getByText('section content');
    expect(el.tagName.toLowerCase()).toBe('section');
  });

  it('propagates ariaLabel', () => {
    render(<PaperSheet ariaLabel="my label">content</PaperSheet>);
    expect(screen.getByLabelText('my label')).toBeInTheDocument();
  });
});
