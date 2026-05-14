/**
 * useDrag — drag-and-drop hook for sticky note panels.
 *
 * Implements free-positioning via mousedown/mousemove/mouseup on document.
 * Persists position to localStorage per color (AC-023, AC-024).
 * Clamps to viewport bounds (AC-022).
 * No external drag library — native DOM events only (NFR-001).
 * Touch events are out of scope (AC-025).
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { Position, StickyColor } from '../types.js';

export type { Position };

export interface UseDragReturn {
  position: Position;
  isDragging: boolean;
  dragHandleProps: { onMouseDown: (e: React.MouseEvent) => void };
}

/** Width/height used for viewport clamping (AC-022). Panel min-height matches this. */
const PANEL_SIZE = 220;

function storageKey(color: StickyColor): string {
  return `calendarfr_sticky_pos_${color}`;
}

function readStoredPosition(color: StickyColor, fallback: Position): Position {
  try {
    const raw = localStorage.getItem(storageKey(color));
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'x' in parsed &&
      'y' in parsed &&
      typeof (parsed as Record<string, unknown>).x === 'number' &&
      typeof (parsed as Record<string, unknown>).y === 'number'
    ) {
      return {
        x: (parsed as { x: number; y: number }).x,
        y: (parsed as { x: number; y: number }).y,
      };
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function useDrag(
  color: StickyColor,
  defaultPosition: Position,
  panelHeight: number = PANEL_SIZE,
): UseDragReturn {
  // AC-024: restore position from localStorage on init; fallback to defaultPosition
  const [position, setPosition] = useState<Position>(() =>
    readStoredPosition(color, defaultPosition),
  );

  // Use state for isDragging so CSS cursor class re-renders (AC-021)
  const [isDragging, setIsDragging] = useState(false);

  // Ref kept in sync with isDragging state to prevent ghost listener leak (BLOCKER-2)
  const isDraggingRef = useRef(false);

  // Keep isDraggingRef in sync with isDragging state
  useEffect(() => {
    isDraggingRef.current = isDragging;
  }, [isDragging]);

  // Refs to avoid stale closures in document-level handlers
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  // Keep a ref for latest position so mouseup can save without stale closure
  const positionRef = useRef<Position>(position);

  // Keep positionRef in sync whenever state updates
  useEffect(() => {
    positionRef.current = position;
  }, [position]);

  // Stable handler refs to allow correct removeEventListener calls
  const handleMouseMoveRef = useRef<((e: MouseEvent) => void) | null>(null);
  const handleMouseUpRef = useRef<((e: MouseEvent) => void) | null>(null);

  const removeListeners = useCallback(() => {
    if (handleMouseMoveRef.current) {
      document.removeEventListener('mousemove', handleMouseMoveRef.current);
    }
    if (handleMouseUpRef.current) {
      document.removeEventListener('mouseup', handleMouseUpRef.current);
    }
  }, []);

  // AC-020: mousedown handler attached to drag handle via dragHandleProps
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Guard: prevent double-binding if mousedown fires twice without mouseup
      if (isDraggingRef.current) return;

      e.preventDefault(); // prevent text selection during drag

      isDraggingRef.current = true;
      setIsDragging(true);

      // Calculate offset of cursor relative to panel's current position
      startXRef.current = e.clientX - positionRef.current.x;
      startYRef.current = e.clientY - positionRef.current.y;

      function handleMouseMove(ev: MouseEvent) {
        const rawX = ev.clientX - startXRef.current;
        const rawY = ev.clientY - startYRef.current;
        // AC-022: clamp to viewport bounds using panelHeight for y-axis
        const x = Math.max(0, Math.min(rawX, window.innerWidth - PANEL_SIZE));
        const y = Math.max(0, Math.min(rawY, window.innerHeight - panelHeight));
        setPosition({ x, y });
      }

      function handleMouseUp() {
        removeListeners();
        isDraggingRef.current = false;
        setIsDragging(false);
        // AC-023: save position to localStorage on mouseup
        // Use ref to avoid stale closure on position state
        localStorage.setItem(storageKey(color), JSON.stringify(positionRef.current));
      }

      handleMouseMoveRef.current = handleMouseMove;
      handleMouseUpRef.current = handleMouseUp;

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [color, panelHeight, removeListeners],
  );

  // Cleanup: remove any active listeners on unmount
  useEffect(() => {
    return () => {
      removeListeners();
    };
  }, [removeListeners]);

  return {
    position,
    isDragging,
    dragHandleProps: { onMouseDown: handleMouseDown },
  };
}
