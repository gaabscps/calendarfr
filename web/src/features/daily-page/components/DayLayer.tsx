/**
 * DayLayer — manages the two-layer page-turn animation.
 *
 * Strategy B: Two layers crossing. When direction/date changes and reducedMotion
 * is false, renders BOTH an outgoing layer (is-leaving) and an incoming layer
 * (is-entering) simultaneously for ANIMATION_DURATION_MS. After that, the
 * outgoing layer is dropped (isAnimating goes false).
 *
 * Strategy A (re-mount via key) is used when reducedMotion is true — instant
 * DOM swap with no animation.
 *
 * Direction-aware CSS:
 *   next: outgoing slides left (-100%), incoming enters from right (+100%)
 *   prev: outgoing slides right (+100%), incoming enters from left (-100%)
 *
 * L-MAJOR-2 fix: onAnimationEnd on outgoing element fires when the CSS animation
 * completes — more accurate than a raw setTimeout. setTimeout 300ms is kept as a
 * defensive fallback for when the tab is backgrounded (requestAnimationFrame is
 * throttled and CSS animationend may fire late).
 *
 * L-MINOR-4 fix: snapshot the incoming direction alongside the outgoing snapshot
 * so the incoming CSS class is frozen at the moment the animation starts.
 *
 * L-MINOR-2 fix: swipeProps is accepted from DailyPage and spread on the outer
 * container, making swipe functional even during load and error states.
 *
 * Covers: AC-034 (two layers with CSS animation), AC-035 (reduced-motion instant
 * swap), AC-036 (CSS-only, no animation libs), AC-037 (skeleton in incoming when
 * load not yet resolved).
 */

import type { HTMLAttributes, ReactNode } from 'react';
import { useRef, useEffect, useState, useCallback } from 'react';

import styles from './DayLayer.module.css';

export interface DayLayerProps {
  date: string;
  direction: 'prev' | 'next' | null;
  isAnimating: boolean;
  reducedMotion: boolean;
  children: ReactNode;
  /** Swipe gesture props — spread on the outer container (L-MINOR-2). */
  swipeProps?: HTMLAttributes<HTMLElement>;
}

/**
 * Tracks the "outgoing" snapshot (previous date + children) for the duration
 * of the animation so we can render both layers simultaneously.
 * incomingDirection is snapshotted at animation-start so it stays stable
 * even if a race bypasses the isAnimating guard (L-MINOR-4).
 */
interface LayerSnapshot {
  date: string;
  children: ReactNode;
  outgoingDirection: 'prev' | 'next';
  incomingDirection: 'prev' | 'next';
}

export function DayLayer({
  date,
  direction,
  isAnimating,
  reducedMotion,
  children,
  swipeProps,
}: DayLayerProps) {
  // Keep a snapshot of the outgoing layer when animation starts
  const [outgoing, setOutgoing] = useState<LayerSnapshot | null>(null);

  // Track the previous date to detect changes
  const prevDateRef = useRef(date);
  const prevChildrenRef = useRef(children);

  // Ref to hold the outgoing DOM element for animationend handling
  const outgoingRef = useRef<HTMLDivElement | null>(null);

  // Ref to hold the fallback timer
  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Clear animation lifecycle resources — called by both onAnimationEnd and fallback.
   * Uses a ref to avoid double-firing.
   */
  const animationDoneRef = useRef(false);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (reducedMotion) {
      // AC-035: instant swap, no outgoing layer
      prevDateRef.current = date;
      prevChildrenRef.current = children;
      setOutgoing(null);
      clearFallback();
      return;
    }

    if (isAnimating && date !== prevDateRef.current && direction !== null) {
      // New animation starting — capture outgoing snapshot
      // L-MINOR-4: snapshot incomingDirection at animation start (stable class)
      animationDoneRef.current = false;
      setOutgoing({
        date: prevDateRef.current,
        children: prevChildrenRef.current,
        outgoingDirection: direction,
        incomingDirection: direction,
      });
    }

    if (!isAnimating) {
      // Animation ended (timer fired) — drop outgoing layer
      clearFallback();
      setOutgoing(null);
      prevDateRef.current = date;
      prevChildrenRef.current = children;
    }
  }, [date, direction, isAnimating, reducedMotion, children, clearFallback]);

  // Cleanup fallback timer on unmount
  useEffect(() => {
    return () => {
      clearFallback();
    };
  }, [clearFallback]);

  /**
   * L-MAJOR-2: onAnimationEnd handler for the outgoing layer.
   * Fires when the CSS keyframe animation completes — clears the outgoing layer
   * immediately (more accurate than the 300ms fallback timer in usePageNavigation).
   * We filter by animationName to avoid firing on child animations.
   * The fallback timer in usePageNavigation still fires setIsAnimating(false) after
   * 300ms — this handler just drops the DOM node eagerly when the animation ends.
   */
  const handleOutgoingAnimationEnd = useCallback(
    (e: React.AnimationEvent<HTMLDivElement>) => {
      // Only handle animations on the outgoing element itself (not children)
      if (e.currentTarget !== e.target) {
        return;
      }
      if (animationDoneRef.current) {
        return;
      }
      animationDoneRef.current = true;
      clearFallback();
      setOutgoing(null);
      prevDateRef.current = date;
      prevChildrenRef.current = children;
    },
    [date, children, clearFallback],
  );

  if (reducedMotion) {
    // AC-035: instant swap — single layer, no animation
    return (
      <div className={styles.layer} data-day-layer="single" data-date={date} {...swipeProps}>
        {children}
      </div>
    );
  }

  return (
    <div className={styles.container} {...swipeProps}>
      {/* Outgoing layer: only during animation */}
      {outgoing !== null && isAnimating && (
        <div
          ref={outgoingRef}
          className={`${styles.layer} ${styles.outgoing} ${
            outgoing.outgoingDirection === 'next'
              ? styles['outgoing--next']
              : styles['outgoing--prev']
          }`}
          data-day-layer="outgoing"
          data-date={outgoing.date}
          aria-hidden="true"
          onAnimationEnd={handleOutgoingAnimationEnd}
        >
          {outgoing.children}
        </div>
      )}

      {/* Incoming layer: always present as the "current" content.
          L-MINOR-4: incomingDirection is snapshotted at animation-start — stable. */}
      <div
        className={`${styles.layer} ${
          isAnimating && outgoing !== null
            ? outgoing.incomingDirection === 'next'
              ? styles['incoming--next']
              : styles['incoming--prev']
            : ''
        }`}
        data-day-layer={isAnimating && outgoing !== null ? 'incoming' : 'single'}
        data-date={date}
      >
        {children}
      </div>
    </div>
  );
}
