import type { OnboardingState } from '../../types.js';
import { CUSTOM_EVENT_NAME, STORAGE_KEY } from '../constants.js';
import {
  buildEmptyMissionRecord,
  readStorage,
  subscribeStorage,
  writeStorage,
} from '../storage.js';

const INITIAL_STATE: OnboardingState = {
  schemaVersion: 2,
  progressByDate: {},
  completedAt: null,
  completedOnDate: null,
  status: 'pending',
};

const VALID_STATE: OnboardingState = {
  schemaVersion: 2,
  progressByDate: {
    '2026-05-17': {
      'M-INTENTION': '2026-05-17T10:00:00.000Z',
      'M-MOOD': null,
      'M-PRIORITY': null,
      'M-FORMAT': null,
      'M-CHECK': null,
      'M-WRITE': null,
      'M-GRATITUDE': null,
    },
  },
  completedAt: null,
  completedOnDate: null,
  status: 'in_progress',
};

beforeEach(() => {
  localStorage.clear();
  jest.restoreAllMocks();
});

describe('buildEmptyMissionRecord', () => {
  it('returns a record with all 7 mission IDs set to null', () => {
    const record = buildEmptyMissionRecord();
    const keys = Object.keys(record);
    expect(keys).toHaveLength(7);
    expect(keys).not.toContain('M-NAVIGATE');
    for (const val of Object.values(record)) {
      expect(val).toBeNull();
    }
  });
});

describe('readStorage', () => {
  it('returns initial v2 state when key is absent', () => {
    const result = readStorage();
    expect(result).toEqual(INITIAL_STATE);
    expect(result.schemaVersion).toBe(2);
    expect(result.progressByDate).toEqual({});
  });

  it('returns initial state when JSON is invalid', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json{{{');
    const result = readStorage();
    expect(result).toEqual(INITIAL_STATE);
  });

  it('silently discards v1 schema (AC-022, NFR-010)', () => {
    const v1State = {
      schemaVersion: 1,
      status: 'in_progress',
      missionsCompleted: {
        'M-INTENTION': '2026-05-17T10:00:00.000Z',
        'M-MOOD': null,
        'M-PRIORITY': null,
        'M-FORMAT': null,
        'M-CHECK': null,
        'M-WRITE': null,
        'M-GRATITUDE': null,
        'M-NAVIGATE': null,
      },
      completedAt: null,
      completedOnDate: null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v1State));
    const errorSpy = jest.spyOn(console, 'error');
    const warnSpy = jest.spyOn(console, 'warn');
    const result = readStorage();
    expect(result).toEqual(INITIAL_STATE);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('returns initial state when status is invalid', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...VALID_STATE, status: 'unknown_status' }));
    const result = readStorage();
    expect(result).toEqual(INITIAL_STATE);
  });

  it('returns initial state when progressByDate is an array (AC-020)', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...VALID_STATE, progressByDate: [1, 2, 3] }),
    );
    const result = readStorage();
    expect(result).toEqual(INITIAL_STATE);
  });

  it('returns initial state when progressByDate is a number (AC-020)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...VALID_STATE, progressByDate: 42 }));
    const result = readStorage();
    expect(result).toEqual(INITIAL_STATE);
  });

  it('returns initial state when progressByDate is a string (AC-020)', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...VALID_STATE, progressByDate: 'bad' }));
    const result = readStorage();
    expect(result).toEqual(INITIAL_STATE);
  });

  it('returns initial state when a date entry mission value is empty string (AC-020)', () => {
    const withEmpty = {
      ...VALID_STATE,
      progressByDate: {
        '2026-05-17': {
          'M-INTENTION': '',
          'M-MOOD': null,
          'M-PRIORITY': null,
          'M-FORMAT': null,
          'M-CHECK': null,
          'M-WRITE': null,
          'M-GRATITUDE': null,
        },
      },
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(withEmpty));
    const result = readStorage();
    expect(result).toEqual(INITIAL_STATE);
  });

  it('returns intact state when valid v2 data', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(VALID_STATE));
    const result = readStorage();
    expect(result).toEqual(VALID_STATE);
  });

  it('does not call console.error on parse failure', () => {
    const spy = jest.spyOn(console, 'error');
    localStorage.setItem(STORAGE_KEY, 'invalid json');
    readStorage();
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('writeStorage', () => {
  it('writes v2 state to localStorage', () => {
    writeStorage(VALID_STATE);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(VALID_STATE);
  });

  it('does not throw when setItem throws QuotaExceededError', () => {
    jest.spyOn(globalThis.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new globalThis.DOMException('QuotaExceededError');
    });
    expect(() => writeStorage(VALID_STATE)).not.toThrow();
  });

  it('does not call console.error or console.warn when setItem throws', () => {
    const errorSpy = jest.spyOn(console, 'error');
    const warnSpy = jest.spyOn(console, 'warn');
    jest.spyOn(globalThis.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new globalThis.DOMException('QuotaExceededError');
    });
    writeStorage(VALID_STATE);
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('dispatches CustomEvent on success', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    writeStorage(VALID_STATE);
    expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({ type: CUSTOM_EVENT_NAME }));
  });

  it('does not dispatch CustomEvent when setItem throws', () => {
    jest.spyOn(globalThis.Storage.prototype, 'setItem').mockImplementation(() => {
      throw new globalThis.DOMException('QuotaExceededError');
    });
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
    writeStorage(VALID_STATE);
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

describe('subscribeStorage', () => {
  it('calls callback on native storage event', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeStorage(callback);
    window.dispatchEvent(new globalThis.StorageEvent('storage', { key: STORAGE_KEY }));
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('calls callback on CustomEvent (same-tab sync)', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeStorage(callback);
    window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
    expect(callback).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('removes both listeners on cleanup', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeStorage(callback);
    unsubscribe();
    window.dispatchEvent(new globalThis.StorageEvent('storage', { key: STORAGE_KEY }));
    window.dispatchEvent(new Event(CUSTOM_EVENT_NAME));
    expect(callback).not.toHaveBeenCalled();
  });

  it('returns a cleanup function', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeStorage(callback);
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });

  it('does NOT call callback when storage event key is a different key', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeStorage(callback);
    window.dispatchEvent(new globalThis.StorageEvent('storage', { key: 'other.key' }));
    expect(callback).not.toHaveBeenCalled();
    unsubscribe();
  });
});
