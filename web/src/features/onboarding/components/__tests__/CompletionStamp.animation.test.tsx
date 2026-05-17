import { render } from '@testing-library/react';
import React from 'react';

// ─── Framer Motion mock ───────────────────────────────────────────────────────
// Captures motion props via data attributes; no real animation in jsdom.

let mockReducedMotion = false;

jest.mock('framer-motion', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');

  const makeMotionEl =
    (tag: string) =>
    ({
      children,
      initial,
      animate,
      transition,
      ...rest
    }: React.HTMLAttributes<HTMLElement> & {
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
    }) =>
      ReactMod.createElement(
        tag,
        {
          'data-motion-initial': JSON.stringify(initial),
          'data-motion-animate': JSON.stringify(animate),
          'data-motion-transition': JSON.stringify(transition),
          ...rest,
        },
        children,
      );

  return {
    motion: {
      div: makeMotionEl('div'),
      svg: makeMotionEl('svg'),
      p: makeMotionEl('p'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      ReactMod.createElement(ReactMod.Fragment, null, children),
    useReducedMotion: () => mockReducedMotion,
  };
});

import { CompletionStamp } from '../CompletionStamp.js';

const DATE = '2026-05-17';

beforeEach(() => {
  mockReducedMotion = false;
});

describe('CompletionStamp — static rendering (no dates match)', () => {
  it('renders nothing when dates do not match', () => {
    const { container } = render(
      <CompletionStamp completedOnDate="2026-05-16" currentDate={DATE} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when completedOnDate is null', () => {
    const { container } = render(<CompletionStamp completedOnDate={null} currentDate={DATE} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('CompletionStamp — 3-phase animation (normal motion)', () => {
  it('renders 3 distinct motion elements when dates match', () => {
    const { container } = render(<CompletionStamp completedOnDate={DATE} currentDate={DATE} />);
    const motionEls = container.querySelectorAll('[data-motion-animate]');
    expect(motionEls.length).toBeGreaterThanOrEqual(3);
  });

  it('Phase 1 (shadow): motion.div fades in with opacity 0→1 and no delay', () => {
    const { container } = render(<CompletionStamp completedOnDate={DATE} currentDate={DATE} />);
    const shadow = container.querySelector('[data-testid="stamp-shadow"]');
    expect(shadow).toBeInTheDocument();
    const initial = JSON.parse(shadow!.getAttribute('data-motion-initial') ?? 'null');
    const animate = JSON.parse(shadow!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(shadow!.getAttribute('data-motion-transition') ?? 'null');
    expect(initial).toMatchObject({ opacity: 0 });
    expect(animate).toMatchObject({ opacity: 1 });
    expect(transition.duration).toBeCloseTo(0.28, 1);
  });

  it('Phase 2 (stamp SVG): motion.svg springs from scale 0.6 → 1 with delay 0.20', () => {
    const { container } = render(<CompletionStamp completedOnDate={DATE} currentDate={DATE} />);
    const stamp = container.querySelector('[data-testid="stamp-svg"]');
    expect(stamp).toBeInTheDocument();
    const initial = JSON.parse(stamp!.getAttribute('data-motion-initial') ?? 'null');
    const animate = JSON.parse(stamp!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(stamp!.getAttribute('data-motion-transition') ?? 'null');
    expect(initial).toMatchObject({ scale: 0.6 });
    expect(animate.scale).toBe(1);
    // rotate sequence
    expect(Array.isArray(animate.rotate)).toBe(true);
    expect(transition).toMatchObject({ type: 'spring', stiffness: 220, damping: 20 });
    expect(transition.delay).toBeCloseTo(0.2, 1);
  });

  it('Phase 3 (tagline): motion.p fades in with delay 0.60', () => {
    const { container } = render(<CompletionStamp completedOnDate={DATE} currentDate={DATE} />);
    const tagline = container.querySelector('[data-testid="completion-stamp-tagline"]');
    expect(tagline).toBeInTheDocument();
    const initial = JSON.parse(tagline!.getAttribute('data-motion-initial') ?? 'null');
    const animate = JSON.parse(tagline!.getAttribute('data-motion-animate') ?? 'null');
    const transition = JSON.parse(tagline!.getAttribute('data-motion-transition') ?? 'null');
    expect(initial).toMatchObject({ opacity: 0 });
    expect(animate).toMatchObject({ opacity: 1 });
    expect(transition.delay).toBeCloseTo(0.6, 1);
    expect(transition.duration).toBeCloseTo(0.32, 1);
  });

  it('tagline contains formatted PT-BR date', () => {
    const { container } = render(<CompletionStamp completedOnDate={DATE} currentDate={DATE} />);
    const tagline = container.querySelector('[data-testid="completion-stamp-tagline"]');
    expect(tagline?.textContent).toMatch(/iniciado em/i);
    expect(tagline?.textContent).toMatch(/17 de maio de 2026/i);
  });
});

describe('CompletionStamp — reduced-motion path (AC-015)', () => {
  beforeEach(() => {
    mockReducedMotion = true;
  });

  it('reduced-motion: renders a single fade wrapper instead of 3 phases', () => {
    const { container } = render(<CompletionStamp completedOnDate={DATE} currentDate={DATE} />);
    const wrapper = container.querySelector('[data-testid="stamp-reduced-wrapper"]');
    expect(wrapper).toBeInTheDocument();
    // Should NOT have the individual phase elements
    expect(container.querySelector('[data-testid="stamp-shadow"]')).not.toBeInTheDocument();
    expect(container.querySelector('[data-testid="stamp-svg"]')).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-testid="completion-stamp-tagline"]'),
    ).not.toBeInTheDocument();
  });

  it('reduced-motion: wrapper fades in with duration ≤ 0.2s', () => {
    const { container } = render(<CompletionStamp completedOnDate={DATE} currentDate={DATE} />);
    const wrapper = container.querySelector('[data-testid="stamp-reduced-wrapper"]');
    const transition = JSON.parse(wrapper!.getAttribute('data-motion-transition') ?? 'null');
    expect(transition.duration).toBeLessThanOrEqual(0.2);
  });

  it('reduced-motion: wrapper has no spring type', () => {
    const { container } = render(<CompletionStamp completedOnDate={DATE} currentDate={DATE} />);
    const wrapper = container.querySelector('[data-testid="stamp-reduced-wrapper"]');
    const transition = JSON.parse(wrapper!.getAttribute('data-motion-transition') ?? 'null');
    expect(transition.type).not.toBe('spring');
  });
});
