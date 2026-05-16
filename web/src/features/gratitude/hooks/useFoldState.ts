import { useState, useCallback } from 'react';

export type FoldState = 'folded' | 'animating-open' | 'unfolded' | 'animating-close';

export interface UseFoldStateReturn {
  state: FoldState;
  requestOpen: () => void;
  requestClose: () => void;
  onAnimationOpenComplete: () => void;
  onAnimationCloseComplete: () => void;
}

/**
 * 4-state fold machine: folded → animating-open → unfolded → animating-close → folded.
 * Gestures during animating-* are ignored (no queue, no race).
 * T-002 wires real Framer Motion onAnimationComplete into the *Complete callbacks.
 * T-001 calls them synchronously via queueMicrotask to skip through animating-* states.
 */
export function useFoldState(): UseFoldStateReturn {
  const [state, setState] = useState<FoldState>('folded');

  const requestOpen = useCallback(() => {
    setState((current) => {
      if (current !== 'folded') return current;
      return 'animating-open';
    });
  }, []);

  const requestClose = useCallback(() => {
    setState((current) => {
      if (current !== 'unfolded') return current;
      return 'animating-close';
    });
  }, []);

  const onAnimationOpenComplete = useCallback(() => {
    setState((current) => {
      if (current !== 'animating-open') return current;
      return 'unfolded';
    });
  }, []);

  const onAnimationCloseComplete = useCallback(() => {
    setState((current) => {
      if (current !== 'animating-close') return current;
      return 'folded';
    });
  }, []);

  return { state, requestOpen, requestClose, onAnimationOpenComplete, onAnimationCloseComplete };
}
