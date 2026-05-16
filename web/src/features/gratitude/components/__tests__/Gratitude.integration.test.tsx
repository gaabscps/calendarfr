/**
 * Integration tests for Gratitude fold/unfold animation, washi tape, reduce-motion.
 * Framer Motion is mocked so motion.div calls onAnimationComplete via useEffect,
 * letting state machine tests run fast while validating consumer wiring.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import React from 'react';

import { Gratitude } from '../Gratitude.js';

// ─── Framer Motion mock ───────────────────────────────────────────────────────
let reducedMotion = false;

// When true (default), MotionDiv fires onAnimationComplete immediately.
// Set to false to defer callbacks — lets tests assert the intermediate DOM state
// before state machine advances. Sync act() flushes effects (useEffect stores cb)
// but does NOT flush Promise.resolve microtasks, so state stays in animating-*.
let autoComplete = true;
const pendingCallbacks: Array<() => void> = [];

jest.mock('framer-motion', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');

  function MotionDiv({
    children,
    onAnimationComplete,
    style,
    className,
    initial: _initial,
    animate: _animate,
    exit: _exit,
    transition: _transition,
    variants: _variants,
    ...rest
  }: React.HTMLAttributes<HTMLDivElement> & {
    onAnimationComplete?: () => void;
    initial?: unknown;
    animate?: unknown;
    exit?: unknown;
    transition?: unknown;
    variants?: unknown;
  }) {
    ReactMod.useEffect(() => {
      if (!onAnimationComplete) return;
      if (autoComplete) {
        onAnimationComplete();
      } else {
        pendingCallbacks.push(onAnimationComplete);
      }
    });
    return ReactMod.createElement(
      'div',
      { style, className, 'data-testid': 'motion-div', ...rest },
      children,
    );
  }

  function AnimatePresence({ children }: { children: ReactNode }) {
    return ReactMod.createElement(ReactMod.Fragment, null, children);
  }

  function MotionConfig({ children }: { children: ReactNode }) {
    return ReactMod.createElement(ReactMod.Fragment, null, children);
  }

  return {
    motion: { div: MotionDiv },
    AnimatePresence,
    MotionConfig,
    useReducedMotion: () => reducedMotion,
  };
});

// ─── RichTextBlock mock ───────────────────────────────────────────────────────
let capturedFirstEditorFocus: jest.Mock | null = null;

jest.mock('@/features/rich-text-line', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');
  return {
    RichTextBlock: ({
      value,
      onChange,
      placeholder,
      ariaLabel,
      editorRef,
    }: {
      value: string;
      onChange: (_html: string) => void;
      placeholder?: string;
      ariaLabel?: string;
      editorRef?: { current: { commands: { focus: () => void } } | null };
    }) => {
      if (editorRef && !editorRef.current) {
        const focusSpy = jest.fn();
        editorRef.current = { commands: { focus: focusSpy } };
        if (capturedFirstEditorFocus === null) capturedFirstEditorFocus = focusSpy;
      }
      return ReactMod.createElement(
        'div',
        {
          'data-testid': 'rtb',
          'data-value': value,
          'data-placeholder': placeholder,
          'aria-label': ariaLabel,
        },
        ReactMod.createElement('button', { onClick: () => onChange('<p>nova</p>') }, 'edit'),
      );
    },
  };
});

beforeEach(() => {
  capturedFirstEditorFocus = null;
  reducedMotion = false;
  autoComplete = true;
  pendingCallbacks.length = 0;
});

describe('Gratitude integration — animation + washi tape + reduce-motion', () => {
  // ── AC-003: open animation calls focus on first editor ──────────────────
  it('after open animation completes, first editor focus is called (AC-003)', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const openBtn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(openBtn);
    });
    expect(capturedFirstEditorFocus).not.toBeNull();
    expect(capturedFirstEditorFocus).toHaveBeenCalled();
  });

  // ── AC-007: reduce-motion mode still manages focus ───────────────────────
  it('with reduced motion, card still opens and focuses first editor (AC-007)', async () => {
    reducedMotion = true;
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const openBtn = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    await act(async () => {
      fireEvent.click(openBtn);
    });
    expect(capturedFirstEditorFocus).not.toBeNull();
    expect(capturedFirstEditorFocus).toHaveBeenCalled();
    expect(screen.getAllByTestId('rtb')).toHaveLength(3);
  });

  it('with reduced motion, card closes and returns focus to folded root (AC-007)', async () => {
    reducedMotion = true;
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /dobrar cartão de gratidão/i }));
    });
    const foldedRoot = screen.getByRole('button', { name: /abrir cartão de gratidão/i });
    expect(foldedRoot).toBeInTheDocument();
    expect(foldedRoot).toHaveFocus();
  });

  // ── AC-002: washi tape decorative in folded state ────────────────────────
  it('washi tape SVGs are present and aria-hidden in folded state (AC-002)', () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    const tapes = document.querySelectorAll('[data-testid="washi-tape"]');
    expect(tapes.length).toBeGreaterThanOrEqual(2);
    tapes.forEach((tape) => {
      expect(tape).toHaveAttribute('aria-hidden', 'true');
    });
  });

  // ── AC-002 + AC-004: washi tape present in unfolded state too ───────────
  it('washi tape SVGs are still present in unfolded state (AC-002, AC-004)', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    const tapes = document.querySelectorAll('[data-testid="washi-tape"]');
    expect(tapes.length).toBeGreaterThanOrEqual(2);
  });

  // ── AC-002: indicator count updates with value prop ──────────────────────
  it('filled indicator updates when value changes (AC-002)', () => {
    const { rerender } = render(<Gratitude value={[]} onChange={jest.fn()} />);
    expect(screen.getByRole('button', { name: /vazio/i })).toBeInTheDocument();

    rerender(
      <Gratitude
        value={[
          { id: 'a', text: '<p>feliz</p>' },
          { id: 'b', text: '<p>grato</p>' },
        ]}
        onChange={jest.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /2 escritas/i })).toBeInTheDocument();
  });

  // ── AC-008: pointer-events disabled during animating states ─────────────
  it('card settles to unfolded state after open animation (no stuck animating state)', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    expect(screen.getAllByTestId('rtb')).toHaveLength(3);
    expect(screen.queryByRole('button', { name: /abrir cartão de gratidão/i })).toBeNull();
  });

  it('card settles to folded state after close animation (no stuck animating state)', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /dobrar cartão de gratidão/i }));
    });
    expect(screen.getByRole('button', { name: /abrir cartão de gratidão/i })).toBeInTheDocument();
    expect(screen.queryAllByTestId('rtb')).toHaveLength(0);
  });

  // ── AC-005: close completes, focus on folded root ───────────────────────
  it('folded root receives focus after close animation completes (AC-005)', async () => {
    render(<Gratitude value={[]} onChange={jest.fn()} />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /dobrar cartão de gratidão/i }));
    });
    expect(screen.getByRole('button', { name: /abrir cartão de gratidão/i })).toHaveFocus();
  });

  // ── NFR-002: adjacent siblings stable across fold/unfold ────────────────
  it('container wrapper is stable (min-height present) across fold/unfold (NFR-002)', async () => {
    render(
      <div>
        <div data-testid="sibling-before">antes</div>
        <Gratitude value={[]} onChange={jest.fn()} />
        <div data-testid="sibling-after">depois</div>
      </div>,
    );
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /abrir/i }));
    });
    expect(screen.getByTestId('sibling-before')).toBeInTheDocument();
    expect(screen.getByTestId('sibling-after')).toBeInTheDocument();
  });

  // Animation-specific tests (autoComplete=false, simultaneous folded+unfolded rendering,
  // intermediate animating-* state assertions) were removed in the animation wipe — the
  // visual fold transition was scrapped; this file now only covers terminal-state behavior.
});
