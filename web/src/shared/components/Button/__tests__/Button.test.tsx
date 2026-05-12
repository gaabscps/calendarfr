import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { Button } from '../Button';

describe('Button', () => {
  // AC-033/AC-034: variant + size API tipada (default secondary/md)
  it('renders with default variant=secondary and size=md', () => {
    render(<Button>Click me</Button>);
    const btn = screen.getByRole('button', { name: /click me/i });
    expect(btn).toBeInTheDocument();
    expect(btn.className).toContain('secondary');
    expect(btn.className).toContain('md');
  });

  it('renders with variant=primary', () => {
    render(<Button variant="primary">Primary</Button>);
    const btn = screen.getByRole('button', { name: /primary/i });
    expect(btn.className).toContain('primary');
  });

  it('renders with variant=ghost', () => {
    render(<Button variant="ghost">Ghost</Button>);
    expect(screen.getByRole('button', { name: /ghost/i }).className).toContain('ghost');
  });

  it('renders with variant=danger', () => {
    render(<Button variant="danger">Danger</Button>);
    expect(screen.getByRole('button', { name: /danger/i }).className).toContain('danger');
  });

  it('renders with size=sm', () => {
    render(<Button size="sm">Small</Button>);
    expect(screen.getByRole('button', { name: /small/i }).className).toContain('sm');
  });

  it('renders with size=md explicitly', () => {
    render(<Button size="md">Medium</Button>);
    expect(screen.getByRole('button', { name: /medium/i }).className).toContain('md');
  });

  // AC-033: aceita props HTML nativas de <button>
  it('has default type=button to prevent accidental form submission', () => {
    render(<Button>Default type</Button>);
    expect(screen.getByRole('button', { name: /default type/i })).toHaveAttribute('type', 'button');
  });

  it('forwards native button props (type, disabled)', () => {
    render(
      <Button type="submit" disabled>
        Submit
      </Button>,
    );
    const btn = screen.getByRole('button', { name: /submit/i });
    expect(btn).toHaveAttribute('type', 'submit');
    expect(btn).toBeDisabled();
  });

  it('calls onClick handler when clicked', async () => {
    const handler = jest.fn();
    render(<Button onClick={handler}>Click</Button>);
    await userEvent.click(screen.getByRole('button', { name: /click/i }));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const handler = jest.fn();
    render(
      <Button disabled onClick={handler}>
        Disabled
      </Button>,
    );
    await userEvent.click(screen.getByRole('button', { name: /disabled/i }));
    expect(handler).not.toHaveBeenCalled();
  });

  // AC-033: nome neutro — o componente é chamado Button
  it('renders a <button> element', () => {
    render(<Button>Element</Button>);
    expect(screen.getByRole('button', { name: /element/i }).tagName.toLowerCase()).toBe('button');
  });

  // AC-033: aceita aria-* props nativas
  it('forwards aria-label', () => {
    render(<Button aria-label="custom label">X</Button>);
    expect(screen.getByRole('button', { name: /custom label/i })).toBeInTheDocument();
  });

  it('forwards additional className', () => {
    render(<Button className="extra-class">Extra</Button>);
    expect(screen.getByRole('button', { name: /extra/i }).className).toContain('extra-class');
  });
});
