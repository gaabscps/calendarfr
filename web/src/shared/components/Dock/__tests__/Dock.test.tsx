import { render, screen } from '@testing-library/react';

import { Dock } from '../Dock';

describe('Dock', () => {
  it('renders children', () => {
    render(
      <Dock>
        <button>item</button>
      </Dock>,
    );
    expect(screen.getByRole('button', { name: /item/i })).toBeInTheDocument();
  });

  it('uses <nav> with default aria-label="Dock"', () => {
    render(
      <Dock>
        <button>a</button>
      </Dock>,
    );
    const nav = screen.getByRole('navigation', { name: 'Dock' });
    expect(nav).toBeInTheDocument();
  });

  it('respects custom aria-label', () => {
    render(
      <Dock aria-label="Account dock">
        <button>a</button>
      </Dock>,
    );
    expect(screen.getByRole('navigation', { name: 'Account dock' })).toBeInTheDocument();
  });

  it('renders multiple children inline', () => {
    render(
      <Dock>
        <button>one</button>
        <button>two</button>
      </Dock>,
    );
    expect(screen.getByRole('button', { name: /one/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /two/i })).toBeInTheDocument();
  });
});
