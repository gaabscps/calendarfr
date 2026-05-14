/**
 * useDrag — init and type-shape tests.
 *
 * AC-019: drag handle props provided (onMouseDown is a function)
 * AC-024: restore position from localStorage on init
 *
 * Touch events are out of scope (AC-025).
 */

import { renderHook } from '@testing-library/react';

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

// ── AC-019: drag handle props ────────────────────────────────────────────────

test('dragHandleProps.onMouseDown is a function', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));

  expect(typeof result.current.dragHandleProps.onMouseDown).toBe('function');
});

test('isDragging is false on initial render', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));

  expect(result.current.isDragging).toBe(false);
});

test('position is present in initial return value', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));

  expect(result.current.position).toBeDefined();
  expect(typeof result.current.position.x).toBe('number');
  expect(typeof result.current.position.y).toBe('number');
});

// ── AC-024: Init from localStorage ──────────────────────────────────────────

test('initialises position from localStorage when key exists', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: 100, y: 200 }));

  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));

  expect(result.current.position).toEqual({ x: 100, y: 200 });
});

test('falls back to defaultPosition when localStorage is empty', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));

  expect(result.current.position).toEqual(DEFAULT_POS);
});

test('falls back to defaultPosition when localStorage has invalid JSON', () => {
  localStorage.setItem(STORAGE_KEY, 'not-valid-json{{{');

  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));

  expect(result.current.position).toEqual(DEFAULT_POS);
});

test('falls back to defaultPosition when localStorage value is missing x or y', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: 50 }));

  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));

  expect(result.current.position).toEqual(DEFAULT_POS);
});

test('falls back to defaultPosition when localStorage value has non-numeric x', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: 'not-a-number', y: 50 }));

  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS));

  expect(result.current.position).toEqual(DEFAULT_POS);
});

test('uses color-specific storage key — red color reads its own key', () => {
  localStorage.setItem('calendarfr_sticky_pos_r', JSON.stringify({ x: 300, y: 400 }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: 100, y: 200 }));

  const { result } = renderHook(() => useDrag('r', DEFAULT_POS));

  expect(result.current.position).toEqual({ x: 300, y: 400 });
});

test('different colors do not share stored position', () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ x: 100, y: 200 }));

  const { result } = renderHook(() => useDrag('g', DEFAULT_POS));

  // green has no stored position — falls back to default
  expect(result.current.position).toEqual(DEFAULT_POS);
});

test('accepts optional panelHeight parameter without error', () => {
  const { result } = renderHook(() => useDrag(COLOR, DEFAULT_POS, 400));

  expect(result.current.position).toEqual(DEFAULT_POS);
  expect(typeof result.current.dragHandleProps.onMouseDown).toBe('function');
});
