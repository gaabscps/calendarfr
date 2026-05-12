import { useEffect, useState } from 'react';

import { getCurrentAgendaHour } from '../lib/currentHour.js';
import type { AgendaHour } from '../types.js';

/**
 * Returns the current agenda hour (6–23), updating automatically when the
 * hour changes. Uses a smart schedule: syncs to the next minute boundary so
 * the highlight advances within ≤1 second of the real hour change.
 *
 * @param now - Optional Date override for testability (Storybook/Jest).
 *   When provided, the initial value uses this date. Ticks always use
 *   new Date() internally (or jest.setSystemTime in tests).
 */
export function useCurrentHour(now?: Date): AgendaHour | null {
  const [currentHour, setCurrentHour] = useState<AgendaHour | null>(() =>
    getCurrentAgendaHour(now),
  );

  useEffect(() => {
    const tick = () => setCurrentHour(getCurrentAgendaHour());

    const origin = new Date();
    const msToNextMinute = 60_000 - (origin.getSeconds() * 1_000 + origin.getMilliseconds());

    // intervalId is set inside the timeout callback; declared in outer scope
    // so the cleanup function can reference it.
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const timeoutId = setTimeout(() => {
      tick();
      intervalId = setInterval(tick, 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId !== null) clearInterval(intervalId);
    };
  }, []);

  return currentHour;
}
