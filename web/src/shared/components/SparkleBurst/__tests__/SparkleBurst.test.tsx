import { render, screen } from '@testing-library/react';

let mockReducedMotion = false;
jest.mock('framer-motion', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');
  type MotionProps = {
    children?: React.ReactNode;
  } & Record<string, unknown>;
  const MotionSpan = ({ children, initial, animate, transition, ...rest }: MotionProps) =>
    ReactMod.createElement(
      'span',
      {
        'data-motion-initial': JSON.stringify(initial),
        'data-motion-animate': JSON.stringify(animate),
        'data-motion-transition': JSON.stringify(transition),
        ...rest,
      },
      children,
    );
  return {
    motion: { span: MotionSpan, div: MotionSpan, svg: MotionSpan, path: MotionSpan },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      ReactMod.createElement(ReactMod.Fragment, null, children),
    useReducedMotion: () => mockReducedMotion,
  };
});

import { SparkleBurst } from '../SparkleBurst';

describe('SparkleBurst', () => {
  it('renders the requested number of particles', () => {
    render(<SparkleBurst count={5} />);
    expect(screen.getAllByTestId('sparkleBurst-particle')).toHaveLength(5);
  });

  it('defaults to 4 particles when count is omitted', () => {
    render(<SparkleBurst />);
    expect(screen.getAllByTestId('sparkleBurst-particle')).toHaveLength(4);
  });

  it('clamps count to a minimum of 1', () => {
    render(<SparkleBurst count={0} />);
    expect(screen.getAllByTestId('sparkleBurst-particle')).toHaveLength(1);
  });

  it('is decorative (aria-hidden)', () => {
    render(<SparkleBurst />);
    const container = screen.getByTestId('sparkleBurst-root');
    expect(container).toHaveAttribute('aria-hidden', 'true');
  });

  it('renders nothing when prefers-reduced-motion is set', () => {
    mockReducedMotion = true;
    const { container } = render(<SparkleBurst />);
    expect(container.firstChild).toBeNull();
    mockReducedMotion = false;
  });
});
