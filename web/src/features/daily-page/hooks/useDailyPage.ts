/**
 * useDailyPage — orchestrator hook for one day's data lifecycle.
 * Covers: AC-001, AC-002, AC-006–AC-012, AC-020–AC-033.
 *
 * - Load on mount/date change (AbortController, abort stale GETs only)
 * - Snapshot-then-fire autosave debounce (AC-006–AC-008, AC-011)
 * - Retry 3× exponential backoff on 5xx/network (AC-025); 4xx → giveup (AC-026)
 * - beforeunload keepalive PUT (AC-031–AC-033)
 * - localStorage life-raft: write on error, clear on saved (AC-028)
 * - flushSavePending: race protection for date change (AC-020–AC-022)
 * - reload: clears loadError, re-triggers GET (AC-030)
 */

import type { DailyPageData, Mood } from '@calendarfr/shared';
import { useReducer, useEffect, useRef, useCallback } from 'react';

import type { AgendaSlots } from '@/features/agenda';
import type { NotesValue } from '@/features/notes';
import type { PrioritiesTuple } from '@/features/priorities';

import { fetchDay, saveDay, HttpError } from '../api/dailyPageApi.js';
import { computeBackoffDelay } from '../lib/backoff.js';

import { dailyPageReducer, INITIAL_STATE } from './useDailyPage.reducer.js';
import type { UseDailyPageReturn } from './useDailyPage.types.js';

// Public constants — exported for tests and tunability
export const AUTOSAVE_DEBOUNCE_MS = 800; // AC-007
export const MAX_RETRY = 3; // AC-025
export const LIFE_RAFT_KEY_PREFIX = 'calendarfr:dailypage:'; // AC-028

/**
 * Cross-browser abort detection.
 * Chrome/FF throw DOMException("AbortError"); Safari throws TypeError("Load failed").
 * If the controller signal is aborted, any error from that fetch is the abort.
 */
function isAbortError(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted === true) return true;
  if (err instanceof DOMException && err.name === 'AbortError') return true;
  return false;
}

export function useDailyPage(date: string): UseDailyPageReturn {
  const [state, dispatch] = useReducer(dailyPageReducer, INITIAL_STATE);

  // Stable refs — latest state/date accessible in async callbacks without stale closures
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const dateRef = useRef(date);
  useEffect(() => {
    dateRef.current = date;
  });

  // prevDateRef: updated at the END of Effect 1 so it holds the date of the last
  // completed load cycle — used by the date-change cleanup to capture the old date.
  const prevDateRef = useRef(date);

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retryRejectRef = useRef<((err: Error) => void) | null>(null);
  const saveInFlightRef = useRef<Promise<void> | null>(null);

  const [loadGen, setLoadGen] = useReducer((n: number) => n + 1, 0);

  // localStorage life-raft helpers (AC-028) — all localStorage access wrapped in try/catch
  const writeLifeRaft = useCallback((d: string, body: DailyPageData) => {
    try {
      localStorage.setItem(`${LIFE_RAFT_KEY_PREFIX}${d}`, JSON.stringify(body));
    } catch {
      /* quota */
    }
  }, []);

  const clearLifeRaft = useCallback((d: string) => {
    try {
      localStorage.removeItem(`${LIFE_RAFT_KEY_PREFIX}${d}`);
    } catch {
      /* swallow */
    }
  }, []);

  // fireSave — immutable snapshot PUT with retry loop (AC-008, AC-025, AC-026)
  const fireSave = useCallback(
    (snapshot: { date: string; body: DailyPageData }): Promise<void> => {
      const promise = (async () => {
        dispatch({ type: 'SAVE_START', snapshot });
        // Local counter avoids stale-ref race — stateRef.current.retryAttempt
        // is updated by useEffect (after render), not synchronously in this IIFE.
        let localRetry = 0;
        for (;;) {
          try {
            await saveDay({ date: snapshot.date, body: snapshot.body });
            dispatch({ type: 'SAVE_SUCCESS' });
            clearLifeRaft(snapshot.date);
            break;
          } catch (err) {
            if (isAbortError(err)) break;
            if (err instanceof HttpError && err.status >= 400 && err.status < 500) {
              console.error('[useDailyPage] Save failed 4xx, no retry:', err);
              dispatch({ type: 'SAVE_GIVEUP', err });
              writeLifeRaft(snapshot.date, stateRef.current.data ?? snapshot.body);
              break;
            }
            if (localRetry < MAX_RETRY) {
              dispatch({ type: 'SAVE_ERROR_RETRYABLE' });
              const delay = computeBackoffDelay(localRetry++);
              try {
                await new Promise<void>((resolve, reject) => {
                  retryTimerRef.current = setTimeout(() => {
                    retryTimerRef.current = null;
                    retryRejectRef.current = null;
                    resolve();
                  }, delay);
                  retryRejectRef.current = reject;
                });
              } catch (waitErr) {
                // Cancelled by date change (AbortError) — stop retrying without error state
                if (isAbortError(waitErr)) break;
                throw waitErr;
              }
            } else {
              dispatch({
                type: 'SAVE_GIVEUP',
                err: err instanceof Error ? err : new Error(String(err)),
              });
              writeLifeRaft(snapshot.date, stateRef.current.data ?? snapshot.body);
              break;
            }
          }
        }
      })();
      saveInFlightRef.current = promise;
      void promise.finally(() => {
        if (saveInFlightRef.current === promise) saveInFlightRef.current = null;
      });
      return promise;
    },
    [clearLifeRaft, writeLifeRaft],
  );

  // Effect 1: Load on date change (AC-002, AC-023, AC-024, AC-030)
  useEffect(() => {
    // MAJOR #2 (L3 fix): fire-and-forget pending dirty edit before resetting state (AC-021
    // second-defence). We read `stateRef.current.saveStatus === 'dirty'` instead of inspecting
    // debounceTimerRef — because Effect 2's cleanup runs BEFORE this effect's body when `date`
    // changes (React effect cleanup ordering), nulling debounceTimerRef. The reducer-derived
    // 'dirty' signal is independent of that ref and faithfully indicates "edit happened, save
    // not yet fired". prevDateRef holds the date of the PREVIOUS load cycle — correct old-date
    // for the PUT URL.
    if (
      stateRef.current.saveStatus === 'dirty' &&
      stateRef.current.data !== null &&
      prevDateRef.current !== date
    ) {
      const snapshot = { date: prevDateRef.current, body: stateRef.current.data };
      // intentionally untracked — best-effort defence; flushSavePending does not await this path
      saveDay(snapshot).catch((err: unknown) => {
        console.error('[useDailyPage] save on date-change failed:', err);
      });
    }
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
    // BLOCKER fix: cancel in-flight retry wait so fireSave IIFE doesn't hang (AC-021/022)
    if (retryTimerRef.current !== null) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    if (retryRejectRef.current !== null) {
      retryRejectRef.current(new DOMException('Save cancelled by date change', 'AbortError'));
      retryRejectRef.current = null;
    }
    dispatch({ type: 'DATE_RESET' });
    prevDateRef.current = date; // record this cycle's date for next cleanup
    const ctrl = new AbortController();
    void (async () => {
      dispatch({ type: 'LOAD_START' });
      try {
        const data = await fetchDay(date, { signal: ctrl.signal });
        dispatch({ type: 'LOAD_SUCCESS', data });
      } catch (err) {
        if (isAbortError(err, ctrl.signal)) return; // stale GET cancelled (AC-023)
        dispatch({ type: 'LOAD_ERROR', err: err instanceof Error ? err : new Error(String(err)) });
      }
    })();
    return () => {
      ctrl.abort();
    }; // abort stale GET on date change (AC-023)
  }, [date, loadGen]); // loadGen re-triggers on reload() (AC-030)

  // Effect 2: Autosave debounce on dirty (AC-007, AC-008, AC-011)
  useEffect(() => {
    if (state.saveStatus !== 'dirty' || state.data === null) return;
    const snapshot = { date: dateRef.current, body: state.data }; // snapshot-then-fire (AC-008)
    if (debounceTimerRef.current !== null) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      void fireSave(snapshot);
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => {
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [state.saveStatus, state.data, fireSave]);

  // Effect 3: beforeunload keepalive PUT (AC-031–AC-033)
  useEffect(() => {
    const handleBeforeUnload = () => {
      const cur = stateRef.current;
      if (cur.saveStatus !== 'dirty') return; // AC-031: only fire keepalive for genuinely unsent edits
      if (cur.data === null) return;
      void saveDay({ date: dateRef.current, body: cur.data }, { keepalive: true }); // AC-031, AC-033
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Effect 4: localStorage life-raft sync (AC-028)
  useEffect(() => {
    if (state.saveStatus === 'error' && state.data !== null) writeLifeRaft(date, state.data);
    else if (state.saveStatus === 'saved') clearLifeRaft(date);
  }, [state.saveStatus, state.data, date, writeLifeRaft, clearLifeRaft]);

  // Public setters (AC-006)
  const setPriorities = useCallback((next: PrioritiesTuple) => {
    dispatch({ type: 'EDIT_SLICE', slice: 'priorities', value: next });
  }, []);
  const setMood = useCallback((next: Mood | null) => {
    dispatch({ type: 'EDIT_SLICE', slice: 'mood', value: next });
  }, []);
  const setAgenda = useCallback((next: AgendaSlots) => {
    dispatch({ type: 'EDIT_SLICE', slice: 'agenda', value: next });
  }, []);
  const setNotes = useCallback((next: NotesValue) => {
    dispatch({ type: 'EDIT_SLICE', slice: 'notes', value: next });
  }, []);

  // retrySave — resets retry counter, re-arms debounce (AC-027, AC-028)
  const retrySave = useCallback(() => {
    dispatch({ type: 'RETRY_MANUAL' });
  }, []);

  // flushSavePending — race protection for date change (AC-020, AC-021)
  const flushSavePending = useCallback((): Promise<void> => {
    if (debounceTimerRef.current !== null) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
      const cur = stateRef.current;
      if (cur.data !== null) return fireSave({ date: dateRef.current, body: cur.data });
      return Promise.resolve();
    }
    if (saveInFlightRef.current !== null) return saveInFlightRef.current;
    return Promise.resolve();
  }, [fireSave]);

  // reload — clears loadError, re-triggers GET (AC-030)
  const reload = useCallback(() => {
    setLoadGen();
  }, []);

  return {
    data: state.data,
    loadError: state.loadError,
    saveStatus: state.saveStatus,
    setPriorities,
    setMood,
    setAgenda,
    setNotes,
    retrySave,
    flushSavePending,
    reload,
  };
}
