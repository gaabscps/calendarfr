import { renderHook, act } from '@testing-library/react';

import { useNavigationTracker } from '../useNavigationTracker.js';

describe('useNavigationTracker', () => {
  it('returns false on initial mount', () => {
    const { result } = renderHook(() => useNavigationTracker('2026-05-17'));
    expect(result.current).toBe(false);
  });

  it('returns false when re-rendered with the same date', () => {
    const { result, rerender } = renderHook(({ date }) => useNavigationTracker(date), {
      initialProps: { date: '2026-05-17' },
    });
    rerender({ date: '2026-05-17' });
    expect(result.current).toBe(false);
  });

  it('returns true after navigating to a different date', () => {
    const { result, rerender } = renderHook(({ date }) => useNavigationTracker(date), {
      initialProps: { date: '2026-05-17' },
    });
    act(() => {
      rerender({ date: '2026-05-18' });
    });
    expect(result.current).toBe(true);
  });

  it('stays true (latched) after navigating back to original date', () => {
    const { result, rerender } = renderHook(({ date }) => useNavigationTracker(date), {
      initialProps: { date: '2026-05-17' },
    });
    act(() => {
      rerender({ date: '2026-05-18' });
    });
    act(() => {
      rerender({ date: '2026-05-17' });
    });
    expect(result.current).toBe(true);
  });
});
