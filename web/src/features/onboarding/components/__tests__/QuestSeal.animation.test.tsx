import { render, act } from '@testing-library/react';
import React from 'react';

// ─── Framer Motion mock ───────────────────────────────────────────────────────
// jsdom does not animate; we capture motion props via data attributes for assertions.

let mockReducedMotion = false;

jest.mock('framer-motion', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');

  const MotionSvg = ({
    children,
    initial,
    animate,
    transition,
    onAnimationComplete,
    ...rest
  }: React.SVGAttributes<Element> & {
    initial?: unknown;
    animate?: unknown;
    transition?: unknown;
    onAnimationComplete?: () => void;
  }) => {
    ReactMod.useEffect(() => {
      onAnimationComplete?.();
    });
    return ReactMod.createElement(
      'svg',
      {
        'data-motion-initial': JSON.stringify(initial),
        'data-motion-animate': JSON.stringify(animate),
        'data-motion-transition': JSON.stringify(transition),
        'data-testid': 'quest-seal-motion',
        ...rest,
      },
      children,
    );
  };

  return {
    motion: { svg: MotionSvg },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      ReactMod.createElement(ReactMod.Fragment, null, children),
    useReducedMotion: () => mockReducedMotion,
  };
});

import { QuestSeal } from '../QuestSeal.js';

beforeEach(() => {
  mockReducedMotion = false;
});

describe('QuestSeal — animation props (normal motion)', () => {
  it('completed=false: motion.svg has scale:0 initial', () => {
    const { container } = render(<QuestSeal completed={false} />);
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    expect(svg).toBeInTheDocument();
    const initial = JSON.parse(svg!.getAttribute('data-motion-initial') ?? 'null');
    expect(initial).toMatchObject({ scale: 0 });
  });

  it('completed=false: motion.svg animate targets scale:0 (pending stays hidden)', () => {
    const { container } = render(<QuestSeal completed={false} />);
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const animate = JSON.parse(svg!.getAttribute('data-motion-animate') ?? 'null');
    // Pending state: animated to scale 0 (hidden)
    expect(animate).toMatchObject({ scale: 0 });
  });

  it('completed=true on fresh transition: animate targets spring scale sequence', () => {
    // Start pending, rerender as completed to simulate transition
    const { rerender, container } = render(<QuestSeal completed={false} />);
    act(() => {
      rerender(<QuestSeal completed={true} />);
    });
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const animate = JSON.parse(svg!.getAttribute('data-motion-animate') ?? 'null');
    // animate.scale should be the [0, 1.15, 1] array for spring overshoot
    expect(Array.isArray(animate.scale)).toBe(true);
    expect(animate.scale).toContain(1.15);
    expect(animate.scale[animate.scale.length - 1]).toBe(1);
  });

  it('completed=true on fresh transition: transition uses spring with correct stiffness', () => {
    const { rerender, container } = render(<QuestSeal completed={false} />);
    act(() => {
      rerender(<QuestSeal completed={true} />);
    });
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const transition = JSON.parse(svg!.getAttribute('data-motion-transition') ?? 'null');
    expect(transition).toMatchObject({ type: 'spring', stiffness: 220, damping: 18 });
  });

  it('completed=true on fresh transition: animate includes rotate array', () => {
    const { rerender, container } = render(<QuestSeal completed={false} />);
    act(() => {
      rerender(<QuestSeal completed={true} />);
    });
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const animate = JSON.parse(svg!.getAttribute('data-motion-animate') ?? 'null');
    expect(Array.isArray(animate.rotate)).toBe(true);
    expect(animate.rotate[0]).toBe(0);
    // Final rotation is in range -5 to +5
    const finalRotate = animate.rotate[animate.rotate.length - 1];
    expect(finalRotate).toBeGreaterThanOrEqual(-5);
    expect(finalRotate).toBeLessThanOrEqual(5);
  });

  it('completed=true already on mount: initial and animate use scalar (no keyframe array) — AC-018', () => {
    // Mounting with completed=true means wasCompletedOnMount.current === true.
    // Both initial and animate must be scalars so framer-motion sees no transition to run.
    const { container } = render(<QuestSeal completed={true} />);
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const initial = JSON.parse(svg!.getAttribute('data-motion-initial') ?? 'null');
    const animate = JSON.parse(svg!.getAttribute('data-motion-animate') ?? 'null');
    // initial must be a scalar object, not false and not a keyframe array
    expect(typeof initial).toBe('object');
    expect(initial).not.toBeNull();
    expect(initial.scale).toBe(1);
    // animate must also be a scalar (no keyframe array) so no entrance animation fires
    expect(Array.isArray(animate.scale)).toBe(false);
    expect(animate.scale).toBe(1);
  });

  it('completed=true already on mount: re-mount after ? reopen does NOT re-animate (AC-018)', () => {
    // Simulate: first mount with completed=true (already done when sticky reopens via ? button).
    const { container: c1 } = render(<QuestSeal completed={true} />);
    const svg1 = c1.querySelector('[data-testid="quest-seal-motion"]');
    const animate1 = JSON.parse(svg1!.getAttribute('data-motion-animate') ?? 'null');
    expect(Array.isArray(animate1.scale)).toBe(false);
  });

  it('calls onAnimationComplete when animation finishes', async () => {
    const onComplete = jest.fn();
    const { rerender } = render(<QuestSeal completed={false} onAnimationComplete={onComplete} />);
    act(() => {
      rerender(<QuestSeal completed={true} onAnimationComplete={onComplete} />);
    });
    // useEffect in mock fires onAnimationComplete
    expect(onComplete).toHaveBeenCalled();
  });

  it('data-completed attribute reflects completed prop', () => {
    const { container, rerender } = render(<QuestSeal completed={false} />);
    expect(container.querySelector('[data-completed="false"]')).toBeInTheDocument();
    act(() => {
      rerender(<QuestSeal completed={true} />);
    });
    expect(container.querySelector('[data-completed="true"]')).toBeInTheDocument();
  });
});

describe('QuestSeal — reduced-motion path (AC-015)', () => {
  beforeEach(() => {
    mockReducedMotion = true;
  });

  it('reduced-motion: transition duration is ≤ 0.08s (fast fade)', () => {
    const { rerender, container } = render(<QuestSeal completed={false} />);
    act(() => {
      rerender(<QuestSeal completed={true} />);
    });
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const transition = JSON.parse(svg!.getAttribute('data-motion-transition') ?? 'null');
    expect(transition.duration).toBeLessThanOrEqual(0.08);
  });

  it('reduced-motion: no spring type in transition', () => {
    const { rerender, container } = render(<QuestSeal completed={false} />);
    act(() => {
      rerender(<QuestSeal completed={true} />);
    });
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const transition = JSON.parse(svg!.getAttribute('data-motion-transition') ?? 'null');
    expect(transition.type).not.toBe('spring');
  });

  it('reduced-motion: animate is opacity-based fade (no scale array)', () => {
    const { rerender, container } = render(<QuestSeal completed={false} />);
    act(() => {
      rerender(<QuestSeal completed={true} />);
    });
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const animate = JSON.parse(svg!.getAttribute('data-motion-animate') ?? 'null');
    // Should be a simple opacity fade, not an array
    expect(typeof animate.opacity).toBe('number');
    expect(Array.isArray(animate.scale)).toBe(false);
  });

  it('reduced-motion + already completed on mount: initial starts at opacity 1 (no entrance fade) — AC-018', () => {
    const { container } = render(<QuestSeal completed={true} />);
    const svg = container.querySelector('[data-testid="quest-seal-motion"]');
    const initial = JSON.parse(svg!.getAttribute('data-motion-initial') ?? 'null');
    expect(initial).toMatchObject({ opacity: 1 });
  });
});
