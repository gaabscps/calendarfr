/* eslint-disable import/order */
import { render, screen } from '@testing-library/react';
import React from 'react';

import { soundController } from '@/shared/sound/soundController';

// Mock framer-motion to render synchronously and support motion.span used by QuestSeal
// and SparkleBurst particles.
jest.mock('framer-motion', () => {
  const ReactMod = jest.requireActual<typeof import('react')>('react');
  type MotionProps = {
    children?: React.ReactNode;
    onAnimationComplete?: () => void;
  } & Record<string, unknown>;
  function makeMotion(tag: string) {
    return ({
      children,
      initial,
      animate,
      exit,
      transition,
      onAnimationComplete,
      ...rest
    }: MotionProps) => {
      ReactMod.useEffect(() => {
        onAnimationComplete?.();
      });
      return ReactMod.createElement(
        tag,
        {
          'data-motion-initial': JSON.stringify(initial ?? null),
          'data-motion-animate': JSON.stringify(animate ?? null),
          'data-motion-exit': JSON.stringify(exit ?? null),
          'data-motion-transition': JSON.stringify(transition ?? null),
          ...rest,
        },
        children,
      );
    };
  }
  return {
    motion: {
      span: makeMotion('span'),
      svg: makeMotion('svg'),
      path: makeMotion('path'),
      div: makeMotion('div'),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) =>
      ReactMod.createElement(ReactMod.Fragment, null, children),
    useReducedMotion: () => false,
  };
});

import { QuestSeal } from '../QuestSeal';

describe('QuestSeal (FEAT-029)', () => {
  beforeEach(() => {
    localStorage.clear();
    soundController.setMuted(false);
  });

  it('renders the sticker asset (die + check) when completed', () => {
    render(<QuestSeal completed={true} />);
    expect(screen.getByTestId('questSealSticker-svg')).toBeInTheDocument();
  });

  it('mounts in completed state without playing sound (no transition occurred)', () => {
    const playSpy = jest.spyOn(soundController, 'play');
    render(<QuestSeal completed={true} />);
    expect(playSpy).not.toHaveBeenCalled();
    playSpy.mockRestore();
  });

  it('plays mission-complete when transitioning pending → completed', () => {
    const playSpy = jest.spyOn(soundController, 'play');
    const { rerender } = render(<QuestSeal completed={false} />);
    expect(playSpy).not.toHaveBeenCalled();
    rerender(<QuestSeal completed={true} />);
    expect(playSpy).toHaveBeenCalledWith('mission-complete');
    playSpy.mockRestore();
  });

  it('renders a SparkleBurst when transitioning pending → completed', () => {
    const { rerender } = render(<QuestSeal completed={false} />);
    expect(screen.queryByTestId('sparkleBurst-root')).toBeNull();
    rerender(<QuestSeal completed={true} />);
    expect(screen.getByTestId('sparkleBurst-root')).toBeInTheDocument();
  });

  it('does not play sound on regression (completed → pending)', () => {
    const playSpy = jest.spyOn(soundController, 'play');
    const { rerender } = render(<QuestSeal completed={true} />);
    playSpy.mockClear();
    rerender(<QuestSeal completed={false} />);
    expect(playSpy).not.toHaveBeenCalled();
    playSpy.mockRestore();
  });

  it('sets data-completed attribute to reflect prop', () => {
    const { rerender } = render(<QuestSeal completed={false} />);
    expect(screen.getByTestId('quest-seal')).toHaveAttribute('data-completed', 'false');
    rerender(<QuestSeal completed={true} />);
    expect(screen.getByTestId('quest-seal')).toHaveAttribute('data-completed', 'true');
  });
});
