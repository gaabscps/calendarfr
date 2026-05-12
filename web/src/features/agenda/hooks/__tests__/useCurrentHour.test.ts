import { act, renderHook } from '@testing-library/react';

import { useCurrentHour } from '../useCurrentHour.js';

describe('useCurrentHour', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  // ── Valor inicial ────────────────────────────────────────────────────────

  describe('initial value', () => {
    it('returns current hour immediately when within range', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T10:30:00'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBe(10);
    });

    it('returns null immediately when hour is out of range', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T03:00:00'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBeNull();
    });

    it('uses now prop when provided (testability override)', () => {
      const { result } = renderHook(() => useCurrentHour(new Date('2026-05-12T14:00:00')));
      expect(result.current).toBe(14);
    });
  });

  // ── Smart schedule — detecção da virada de hora ──────────────────────────

  describe('smart schedule', () => {
    it('updates highlight when hour changes (tick on minute boundary)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T10:59:30.000'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBe(10);

      act(() => {
        jest.advanceTimersByTime(30_000); // agora 11:00:00
      });
      expect(result.current).toBe(11);
    });

    it('returns null after hour leaves range (23 → 0)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T23:59:30.000'));
      const { result } = renderHook(() => useCurrentHour());
      expect(result.current).toBe(23);

      act(() => {
        jest.advanceTimersByTime(30_000); // agora 00:00:00
      });
      expect(result.current).toBeNull();
    });
  });

  // ── Cleanup ──────────────────────────────────────────────────────────────

  describe('cleanup on unmount', () => {
    it('clears timeout on unmount before interval starts', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-05-12T10:30:00'));
      const clearTimeoutSpy = jest.spyOn(globalThis, 'clearTimeout');
      const { unmount } = renderHook(() => useCurrentHour());

      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('clears interval on unmount after timeout fires', () => {
      jest.useFakeTimers();
      // Mount at exact minute boundary so msToNextMinute ≈ 60_000ms
      jest.setSystemTime(new Date('2026-05-12T10:00:00.000'));
      const clearIntervalSpy = jest.spyOn(globalThis, 'clearInterval');
      const { unmount } = renderHook(() => useCurrentHour());

      // Advance past the initial timeout (60s) so intervalId is set
      act(() => {
        jest.advanceTimersByTime(61_000);
      });

      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });
});
