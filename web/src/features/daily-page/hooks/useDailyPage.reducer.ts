/**
 * Pure reducer for useDailyPage state machine.
 *
 * Extracted for testability (no React imports, no side effects).
 * All state transitions are deterministic given (state, action).
 *
 * State machine diagram (saveStatus transitions):
 *
 *   ┌─────────────────────────────────────────────────────────────────┐
 *   │                     saveStatus transitions                       │
 *   │                                                                  │
 *   │  initial ──LOAD_SUCCESS──► saved                                 │
 *   │                                                                  │
 *   │  saved ──EDIT_SLICE──► dirty                                     │
 *   │  error ──EDIT_SLICE──► dirty   (AC-029)                          │
 *   │                                                                  │
 *   │  dirty ──SAVE_START──► saving                                    │
 *   │                                                                  │
 *   │  saving ──SAVE_SUCCESS──► saved  (if !editedDuringSave)          │
 *   │  saving ──SAVE_SUCCESS──► dirty  (if editedDuringSave, AC-010)   │
 *   │  saving ──SAVE_ERROR_RETRYABLE──► saving  (retry scheduled)      │
 *   │  saving ──SAVE_GIVEUP──► error   (AC-026, AC-027)                │
 *   │                                                                  │
 *   │  error ──RETRY_MANUAL──► dirty   (AC-027)                        │
 *   │                                                                  │
 *   │  any ──DATE_RESET──► saved (clean slate)                         │
 *   └─────────────────────────────────────────────────────────────────┘
 *
 * Covers: AC-006, AC-008, AC-009, AC-010, AC-024, AC-025, AC-026, AC-027,
 *         AC-028, AC-029.
 */

import type { DailyPageState, DailyPageAction } from './useDailyPage.types.js';

export const INITIAL_STATE: DailyPageState = {
  data: null,
  loadError: null,
  saveStatus: 'saved',
  retryAttempt: 0,
  lastSnapshot: null,
  editedDuringSave: false,
};

export function dailyPageReducer(state: DailyPageState, action: DailyPageAction): DailyPageState {
  switch (action.type) {
    // ── Load lifecycle ────────────────────────────────────────────────────────
    case 'LOAD_START':
      // data → null forces skeleton immediately (AC-024)
      return {
        ...state,
        data: null,
        loadError: null,
        saveStatus: 'saved',
        retryAttempt: 0,
        lastSnapshot: null,
        editedDuringSave: false,
      };

    case 'LOAD_SUCCESS':
      return {
        ...state,
        data: action.data,
        loadError: null,
        saveStatus: 'saved',
      };

    case 'LOAD_ERROR':
      return {
        ...state,
        data: null,
        loadError: action.err,
      };

    // ── Slice edits ───────────────────────────────────────────────────────────
    case 'EDIT_SLICE': {
      if (state.data === null) {
        // Guard: cannot edit before data is loaded
        return state;
      }
      const nextData = applySliceEdit(state.data, action.slice, action.value);
      // If we're currently saving, mark that data changed during the save.
      // This lets SAVE_SUCCESS transition to dirty instead of saved (AC-010).
      const editedDuringSave = state.saveStatus === 'saving' ? true : state.editedDuringSave;
      // Edits while in error state re-arm debounce (AC-029).
      const nextStatus: DailyPageState['saveStatus'] =
        state.saveStatus === 'saving' ? 'saving' : 'dirty';
      return {
        ...state,
        data: nextData,
        saveStatus: nextStatus,
        editedDuringSave,
      };
    }

    // ── Save lifecycle ────────────────────────────────────────────────────────
    case 'SAVE_START':
      return {
        ...state,
        saveStatus: 'saving',
        lastSnapshot: action.snapshot,
        editedDuringSave: false,
      };

    case 'SAVE_SUCCESS': {
      // If user edited during the save, stay dirty (AC-010)
      const nextSaveStatus: DailyPageState['saveStatus'] = state.editedDuringSave
        ? 'dirty'
        : 'saved';
      return {
        ...state,
        saveStatus: nextSaveStatus,
        retryAttempt: 0,
        // Retain lastSnapshot when editedDuringSave: Effect 2 will immediately re-arm
        // the debounce and call fireSave with the fresh state.data as the next snapshot.
        // Clearing here would be safe too, but retaining avoids a brief null window.
        lastSnapshot: state.editedDuringSave ? state.lastSnapshot : null,
        editedDuringSave: false,
      };
    }

    case 'SAVE_ERROR_RETRYABLE':
      // saveStatus stays 'saving' — retry is scheduled in the effect layer.
      // retryAttempt is incremented by the effect before scheduling.
      return {
        ...state,
        retryAttempt: state.retryAttempt + 1,
      };

    case 'SAVE_GIVEUP':
      return {
        ...state,
        saveStatus: 'error',
        // Preserve data — never discard user input (AC-028)
      };

    case 'RETRY_MANUAL':
      // Reset retry counter; set dirty so debounce re-arms (AC-027, AC-028)
      return {
        ...state,
        saveStatus: 'dirty',
        retryAttempt: 0,
        lastSnapshot: null,
      };

    case 'DATE_RESET':
      return {
        ...INITIAL_STATE,
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Slice edit helper
// ---------------------------------------------------------------------------

function applySliceEdit(
  data: NonNullable<DailyPageState['data']>,
  slice: 'priorities' | 'mood' | 'agenda' | 'notes' | 'intention' | 'gratitude',
  value: unknown,
): NonNullable<DailyPageState['data']> {
  switch (slice) {
    case 'priorities':
      return { ...data, priorities: value as typeof data.priorities };
    case 'mood':
      return { ...data, mood: value as typeof data.mood };
    case 'agenda':
      return { ...data, agenda: value as typeof data.agenda };
    case 'notes':
      return { ...data, notes: value as typeof data.notes };
    case 'intention':
      return { ...data, intention: value as string | null };
    case 'gratitude':
      return { ...data, gratitude: value as typeof data.gratitude };
  }
}
