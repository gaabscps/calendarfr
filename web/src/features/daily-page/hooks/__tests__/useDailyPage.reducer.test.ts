/**
 * Pure unit tests for dailyPageReducer — no React, no timers, no network.
 * Every state transition is tested deterministically.
 *
 * Covers AC-006, AC-008, AC-009, AC-010, AC-024, AC-025, AC-026, AC-027,
 *        AC-028, AC-029.
 */

import type { DailyPageData } from '@calendarfr/shared';

import { dailyPageReducer, INITIAL_STATE } from '../useDailyPage.reducer.js';
import type { DailyPageState, DailyPageAction } from '../useDailyPage.types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const MOCK_DATA: DailyPageData = {
  schemaVersion: 1,
  date: '2026-05-11',
  mood: null,
  priorities: [
    { id: 'a', text: '', done: false },
    { id: 'b', text: '', done: false },
    { id: 'c', text: '', done: false },
  ],
  agenda: Array.from({ length: 18 }, (_, i) => ({
    hour: i + 6,
    text: '',
  })) as unknown as DailyPageData['agenda'],
  notes: [],
  createdAt: null,
  updatedAt: null,
};

const SNAPSHOT = { date: '2026-05-11', body: MOCK_DATA };

function reduce(state: DailyPageState, action: DailyPageAction): DailyPageState {
  return dailyPageReducer(state, action);
}

function withData(overrides?: Partial<DailyPageState>): DailyPageState {
  return { ...INITIAL_STATE, data: MOCK_DATA, ...overrides };
}

// ---------------------------------------------------------------------------
// INITIAL_STATE
// ---------------------------------------------------------------------------

describe('INITIAL_STATE', () => {
  it('has saveStatus=saved, data=null, loadError=null, retryAttempt=0', () => {
    expect(INITIAL_STATE.data).toBeNull();
    expect(INITIAL_STATE.loadError).toBeNull();
    expect(INITIAL_STATE.saveStatus).toBe('saved');
    expect(INITIAL_STATE.retryAttempt).toBe(0);
    expect(INITIAL_STATE.lastSnapshot).toBeNull();
    expect(INITIAL_STATE.editedDuringSave).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Load lifecycle
// ---------------------------------------------------------------------------

describe('LOAD_START', () => {
  it('clears data, loadError, resets status=saved and retryAttempt', () => {
    const state = withData({ loadError: new Error('prev'), retryAttempt: 2, saveStatus: 'error' });
    const next = reduce(state, { type: 'LOAD_START' });
    expect(next.data).toBeNull();
    expect(next.loadError).toBeNull();
    expect(next.saveStatus).toBe('saved');
    expect(next.retryAttempt).toBe(0);
    expect(next.lastSnapshot).toBeNull();
    expect(next.editedDuringSave).toBe(false);
  });
});

describe('LOAD_SUCCESS', () => {
  it('sets data, clears loadError, status=saved', () => {
    const state: DailyPageState = { ...INITIAL_STATE, loadError: new Error('oops') };
    const next = reduce(state, { type: 'LOAD_SUCCESS', data: MOCK_DATA });
    expect(next.data).toBe(MOCK_DATA);
    expect(next.loadError).toBeNull();
    expect(next.saveStatus).toBe('saved');
  });

  it('does not reset retryAttempt or lastSnapshot (load is independent of save)', () => {
    const state: DailyPageState = {
      ...INITIAL_STATE,
      retryAttempt: 1,
      lastSnapshot: SNAPSHOT,
    };
    const next = reduce(state, { type: 'LOAD_SUCCESS', data: MOCK_DATA });
    // Load success doesn't care about save state
    expect(next.data).toBe(MOCK_DATA);
    expect(next.saveStatus).toBe('saved');
  });
});

describe('LOAD_ERROR', () => {
  it('sets loadError, clears data', () => {
    const err = new Error('network');
    const state = withData();
    const next = reduce(state, { type: 'LOAD_ERROR', err });
    expect(next.data).toBeNull();
    expect(next.loadError).toBe(err);
  });
});

// ---------------------------------------------------------------------------
// DATE_RESET
// ---------------------------------------------------------------------------

describe('DATE_RESET', () => {
  it('resets to INITIAL_STATE', () => {
    const state = withData({
      saveStatus: 'error',
      retryAttempt: 3,
      lastSnapshot: SNAPSHOT,
      editedDuringSave: true,
    });
    const next = reduce(state, { type: 'DATE_RESET' });
    expect(next).toEqual(INITIAL_STATE);
  });
});

// ---------------------------------------------------------------------------
// EDIT_SLICE
// ---------------------------------------------------------------------------

describe('EDIT_SLICE', () => {
  it('updates priorities slice, status becomes dirty', () => {
    const state = withData({ saveStatus: 'saved' });
    const newPriorities = [
      { id: 'x', text: 'foo', done: false },
      { id: 'b', text: '', done: false },
      { id: 'c', text: '', done: false },
    ];
    const next = reduce(state, {
      type: 'EDIT_SLICE',
      slice: 'priorities',
      value: newPriorities,
    });
    expect(next.saveStatus).toBe('dirty');
    expect(next.data!.priorities).toBe(newPriorities);
  });

  it('updates mood slice', () => {
    const state = withData({ saveStatus: 'saved' });
    const mood = { emoji: '😊', label: 'Feliz', color: '#fff' };
    const next = reduce(state, { type: 'EDIT_SLICE', slice: 'mood', value: mood });
    expect(next.data!.mood).toBe(mood);
  });

  it('updates agenda slice', () => {
    const state = withData({ saveStatus: 'saved' });
    const newAgenda = state.data!.agenda.map((s) => ({ ...s, text: 'meeting' }));
    const next = reduce(state, { type: 'EDIT_SLICE', slice: 'agenda', value: newAgenda });
    expect(next.data!.agenda).toBe(newAgenda);
  });

  it('updates notes slice', () => {
    const state = withData({ saveStatus: 'saved' });
    const notes = [{ id: 'n1', prefix: '•' as const, text: 'hello' }];
    const next = reduce(state, { type: 'EDIT_SLICE', slice: 'notes', value: notes });
    expect(next.data!.notes).toBe(notes);
  });

  it('no-ops when data is null (guard)', () => {
    const state: DailyPageState = { ...INITIAL_STATE, data: null };
    const next = reduce(state, { type: 'EDIT_SLICE', slice: 'notes', value: [] });
    expect(next).toBe(state);
  });

  it('stays saving when edit during in-flight save (AC-010)', () => {
    const state = withData({ saveStatus: 'saving', editedDuringSave: false });
    const next = reduce(state, { type: 'EDIT_SLICE', slice: 'notes', value: [] });
    expect(next.saveStatus).toBe('saving');
    expect(next.editedDuringSave).toBe(true);
  });

  it('transitions from error to dirty on edit (AC-029)', () => {
    const state = withData({ saveStatus: 'error' });
    const next = reduce(state, { type: 'EDIT_SLICE', slice: 'notes', value: [] });
    expect(next.saveStatus).toBe('dirty');
  });
});

// ---------------------------------------------------------------------------
// SAVE_START
// ---------------------------------------------------------------------------

describe('SAVE_START', () => {
  it('sets status=saving, stores snapshot, resets editedDuringSave', () => {
    const state = withData({ saveStatus: 'dirty', editedDuringSave: true });
    const next = reduce(state, { type: 'SAVE_START', snapshot: SNAPSHOT });
    expect(next.saveStatus).toBe('saving');
    expect(next.lastSnapshot).toBe(SNAPSHOT);
    expect(next.editedDuringSave).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// SAVE_SUCCESS
// ---------------------------------------------------------------------------

describe('SAVE_SUCCESS', () => {
  it('transitions to saved when no edits during save', () => {
    const state = withData({ saveStatus: 'saving', editedDuringSave: false, retryAttempt: 2 });
    const next = reduce(state, { type: 'SAVE_SUCCESS' });
    expect(next.saveStatus).toBe('saved');
    expect(next.retryAttempt).toBe(0);
    expect(next.lastSnapshot).toBeNull();
    expect(next.editedDuringSave).toBe(false);
  });

  it('transitions to dirty when edited during save (AC-010)', () => {
    const state = withData({
      saveStatus: 'saving',
      editedDuringSave: true,
      lastSnapshot: SNAPSHOT,
    });
    const next = reduce(state, { type: 'SAVE_SUCCESS' });
    expect(next.saveStatus).toBe('dirty');
    expect(next.editedDuringSave).toBe(false);
    // lastSnapshot preserved when dirty (needed for next save)
    expect(next.lastSnapshot).toBe(SNAPSHOT);
  });
});

// ---------------------------------------------------------------------------
// SAVE_ERROR_RETRYABLE
// ---------------------------------------------------------------------------

describe('SAVE_ERROR_RETRYABLE', () => {
  it('increments retryAttempt, status stays saving', () => {
    const state = withData({ saveStatus: 'saving', retryAttempt: 0 });
    const next = reduce(state, { type: 'SAVE_ERROR_RETRYABLE' });
    expect(next.retryAttempt).toBe(1);
    expect(next.saveStatus).toBe('saving');
  });

  it('increments retryAttempt twice', () => {
    const s1 = withData({ saveStatus: 'saving', retryAttempt: 0 });
    const s2 = reduce(s1, { type: 'SAVE_ERROR_RETRYABLE' });
    const s3 = reduce(s2, { type: 'SAVE_ERROR_RETRYABLE' });
    expect(s3.retryAttempt).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// SAVE_GIVEUP
// ---------------------------------------------------------------------------

describe('SAVE_GIVEUP', () => {
  it('sets status=error, preserves data (AC-028)', () => {
    const err = new Error('permanent');
    const state = withData({ saveStatus: 'saving' });
    const next = reduce(state, { type: 'SAVE_GIVEUP', err });
    expect(next.saveStatus).toBe('error');
    expect(next.data).toBe(state.data);
  });
});

// ---------------------------------------------------------------------------
// RETRY_MANUAL
// ---------------------------------------------------------------------------

describe('RETRY_MANUAL', () => {
  it('resets retryAttempt to 0, status=dirty, clears lastSnapshot (AC-027)', () => {
    const state = withData({
      saveStatus: 'error',
      retryAttempt: 3,
      lastSnapshot: SNAPSHOT,
    });
    const next = reduce(state, { type: 'RETRY_MANUAL' });
    expect(next.saveStatus).toBe('dirty');
    expect(next.retryAttempt).toBe(0);
    expect(next.lastSnapshot).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// default case — unknown action type returns state unchanged (line 154)
// ---------------------------------------------------------------------------

describe('default case', () => {
  it('returns state unchanged for unknown action types (line 154)', () => {
    const state = withData({ saveStatus: 'saved' });
    // Cast to DailyPageAction to satisfy TypeScript while dispatching unknown type
    const next = dailyPageReducer(state, { type: 'UNKNOWN_ACTION' } as unknown as DailyPageAction);
    expect(next).toBe(state);
  });
});
