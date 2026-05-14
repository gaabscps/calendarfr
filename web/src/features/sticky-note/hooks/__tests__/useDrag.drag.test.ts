/**
 * useDrag — drag mechanics, clamp, save, and cleanup tests.
 *
 * AC-020/021: mousedown starts drag + isDragging flag
 * AC-022: mousemove position update + viewport clamping
 * AC-023: mouseup persists to localStorage
 * Cleanup: document listeners removed on unmount
 * AC-025: touch events are out of scope (not tested here)
 */

import { act, renderHook } from '@testing-library/react';

import { useDrag } from '../useDrag.js';

const DEFAULT_POS = { x: 22, y: 14 };
const COLOR = 'y' as const;
const STORAGE_KEY = 'calendarfr_sticky_pos_y';

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: 1024,
  });
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: 768,
  });
});

afterEach(() => {
  localStorage.clear();
});

// helpers
function fireMouseDown(
  result: ReturnType<typeof renderHook<ReturnType<typeof useDrag>, unknown>>['result'],
  clientX = 50,
  clientY = 50,
) {
  result.current.dragHandleProps.onMouseDown({
    clientX,
    clientY,
    preventDefault: () => {},
  } as React.MouseEvent);
}

// ── AC-020 / AC-021: mousedown starts drag ───────────────────────────────────

test('isDragging becomes true after mousedown on drag handle', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));
  expect(result.current.isDragging).toBe(false);
  act(() => {
    fireMouseDown(result, 100, 100);
  });
  expect(result.current.isDragging).toBe(true);
});

test('second mousedown while dragging is a no-op (isDraggingRef guard)', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));
  act(() => {
    fireMouseDown(result);
  });

  const addSpy = jest.spyOn(document, 'addEventListener');
  act(() => {
    fireMouseDown(result, 100, 100);
  });
  expect(addSpy).not.toHaveBeenCalled();
  addSpy.mockRestore();
});

// ── AC-022: mousemove updates position ──────────────────────────────────────

test('mousemove updates position based on cursor delta', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));
  // startX = 50-22=28, startY = 50-14=36
  act(() => {
    fireMouseDown(result);
  });
  // newX = 200-28=172, newY = 300-36=264
  act(() => {
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 300, bubbles: true }),
    );
  });
  expect(result.current.position).toEqual({ x: 172, y: 264 });
});

test('mousemove clamps x to 0 when cursor goes left of viewport', () => {
  const { result } = renderHook(() => useDrag(COLOR, { x: 0, y: 0 }));
  act(() => {
    fireMouseDown(result, 10, 10);
  });
  act(() => {
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: -50, clientY: 10, bubbles: true }),
    );
  });
  expect(result.current.position.x).toBe(0);
});

test('mousemove clamps x to innerWidth-220 when cursor exceeds right edge', () => {
  const { result } = renderHook(() => useDrag(COLOR, { x: 0, y: 0 }));
  act(() => {
    fireMouseDown(result, 0, 0);
  });
  act(() => {
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 9999, clientY: 0, bubbles: true }),
    );
  });
  expect(result.current.position.x).toBe(1024 - 220);
});

test('mousemove clamps y to innerHeight-panelHeight (default 220)', () => {
  const { result } = renderHook(() => useDrag(COLOR, { x: 0, y: 0 }));
  act(() => {
    fireMouseDown(result, 0, 0);
  });
  act(() => {
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 0, clientY: 9999, bubbles: true }),
    );
  });
  expect(result.current.position.y).toBe(768 - 220);
});

test('mousemove clamps y using custom panelHeight param (tall panel)', () => {
  // AC-022 gap: tall panels (up to 400px) must not be dragged off screen
  const TALL_PANEL = 400;
  const { result } = renderHook(() => useDrag(COLOR, { x: 0, y: 0 }, TALL_PANEL));
  act(() => {
    fireMouseDown(result, 0, 0);
  });
  act(() => {
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 0, clientY: 9999, bubbles: true }),
    );
  });
  expect(result.current.position.y).toBe(768 - TALL_PANEL);
});

// ── AC-023: mouseup ends drag and saves to localStorage ─────────────────────

test('mouseup sets isDragging to false', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));
  act(() => {
    fireMouseDown(result);
  });
  expect(result.current.isDragging).toBe(true);
  act(() => {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });
  expect(result.current.isDragging).toBe(false);
});

test('mouseup saves current position to localStorage', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));
  act(() => {
    fireMouseDown(result);
  });
  act(() => {
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 200, clientY: 300, bubbles: true }),
    );
  });
  act(() => {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });

  const saved = localStorage.getItem(STORAGE_KEY);
  expect(saved).not.toBeNull();
  const parsed = JSON.parse(saved!) as unknown;
  expect(parsed).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
});

test('mouseup saves correct color-specific key for non-yellow color', () => {
  const { result } = renderHook(() => useDrag('r', DEFAULT_POS));
  act(() => {
    fireMouseDown(result);
  });
  act(() => {
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  });

  expect(localStorage.getItem('calendarfr_sticky_pos_r')).not.toBeNull();
  expect(localStorage.getItem('calendarfr_sticky_pos_y')).toBeNull();
});

// ── Cleanup: event listeners removed on unmount ──────────────────────────────

test('unmount removes mousemove and mouseup listeners', () => {
  const removeSpy = jest.spyOn(document, 'removeEventListener');
  const { result, unmount } = renderHook(() => useDrag(COLOR, DEFAULT_POS));
  act(() => {
    fireMouseDown(result);
  });

  removeSpy.mockClear();
  unmount();

  const removedEvents = removeSpy.mock.calls.map((c) => c[0]);
  expect(removedEvents).toContain('mousemove');
  expect(removedEvents).toContain('mouseup');
  removeSpy.mockRestore();
});

test('position state does not update after unmount', () => {
  const { result, unmount } = renderHook(() => useDrag(COLOR, DEFAULT_POS));
  act(() => {
    fireMouseDown(result);
  });
  unmount();

  expect(() => {
    document.dispatchEvent(
      new MouseEvent('mousemove', { clientX: 999, clientY: 999, bubbles: true }),
    );
  }).not.toThrow();
});
