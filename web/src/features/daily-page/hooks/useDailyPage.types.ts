/**
 * Types for useDailyPage hook — reducer state, actions, and public return.
 *
 * Extracted to keep useDailyPage.ts ≤ 250 LOC (regra inviolável #6).
 *
 * Covers: AC-001, AC-002, AC-006, AC-007, AC-008, AC-009, AC-010, AC-011,
 *         AC-012, AC-020, AC-021, AC-022, AC-023, AC-024, AC-025, AC-026,
 *         AC-027, AC-028, AC-029, AC-030, AC-031, AC-032, AC-033.
 */

import type { DailyPageData, Mood } from '@calendarfr/shared';

import type { AgendaSlots } from '@/features/agenda';
import type { NotesValue } from '@/features/notes';
import type { Priority } from '@/features/priorities';

import type { SaveStatus } from '../types.js';

// ---------------------------------------------------------------------------
// Public args
// ---------------------------------------------------------------------------

/**
 * Optional args for useDailyPage. FEAT-022 (undo-delete) T-007.
 *
 * `gateOpen`: when `false`, autosave debounce is gated (does NOT arm setTimeout)
 * and any pending timer is cleared. When transitions `false → true` while
 * `saveStatus === 'dirty'`, the debounce re-arms automatically. Default `true`
 * (ungated, autosave runs normally — byte-equivalent to no-args behaviour).
 *
 * Naming rationale: chose boolean `gateOpen` over function-form `saveGate`
 * (originally proposed in tasks.md) because (a) React data-flow is value-based
 * not function-based, (b) dependency-tracking a boolean is reliable while a
 * function reference requires an extra tick/version prop. Consumers needing
 * function form can wrap (`gateOpen: queue.length === 0`). AC-003, AC-004.
 */
export interface UseDailyPageArgs {
  gateOpen?: boolean;
}

// ---------------------------------------------------------------------------
// Public return
// ---------------------------------------------------------------------------

export interface UseDailyPageReturn {
  /** null while loading initial data (shows skeleton). */
  data: DailyPageData | null;
  /** null = no error; set on failed GET. */
  loadError: Error | null;
  saveStatus: SaveStatus;
  setPriorities: (next: Priority[]) => void;
  setMood: (next: Mood | null) => void;
  setAgenda: (next: AgendaSlots) => void;
  setNotes: (next: NotesValue) => void;
  /** Resets retry counter, re-arms debounce with current body. AC-027, AC-028. */
  retrySave: () => void;
  /**
   * Race protection: flush pending debounce or await in-flight PUT.
   * Called by BATCH-D PageNavigator's onBeforeChange before date change. AC-020.
   */
  flushSavePending: () => Promise<void>;
  /** Clears loadError and re-triggers GET. AC-030. */
  reload: () => void;
}

// ---------------------------------------------------------------------------
// Reducer state
// ---------------------------------------------------------------------------

export interface DailyPageState {
  data: DailyPageData | null;
  loadError: Error | null;
  saveStatus: SaveStatus;
  /** Current retry attempt (0-indexed). 0 = not yet retried. AC-025. */
  retryAttempt: number;
  /**
   * Snapshot captured at save-schedule time (snapshot-then-fire). AC-008.
   * null when no save is in-flight.
   */
  lastSnapshot: { date: string; body: DailyPageData } | null;
  /**
   * Whether data was edited since the in-flight save started.
   * Allows SAVE_SUCCESS to transition to dirty (not saved) when user kept editing.
   */
  editedDuringSave: boolean;
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type DailyPageAction =
  /** Load lifecycle. AC-002, AC-023, AC-024. */
  | { type: 'LOAD_START' }
  | { type: 'LOAD_SUCCESS'; data: DailyPageData }
  | { type: 'LOAD_ERROR'; err: Error }
  /** Slice mutations. AC-006, AC-011. */
  | { type: 'EDIT_SLICE'; slice: 'priorities' | 'mood' | 'agenda' | 'notes'; value: unknown }
  /** Save lifecycle. AC-008, AC-009, AC-010. */
  | { type: 'SAVE_START'; snapshot: { date: string; body: DailyPageData } }
  | { type: 'SAVE_SUCCESS' }
  /** 5xx / network error — retry counter incremented outside reducer. AC-025. */
  | { type: 'SAVE_ERROR_RETRYABLE' }
  /** Give up: 4xx or retries exhausted. AC-026, AC-027. */
  | { type: 'SAVE_GIVEUP'; err: Error }
  /** User clicks "Tentar novamente". Resets retry, re-arms debounce. AC-027, AC-028. */
  | { type: 'RETRY_MANUAL' }
  /** Date prop changed — reset for fresh load. AC-024. */
  | { type: 'DATE_RESET' };
