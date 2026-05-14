/**
 * Tests for useMultiStickyNote — AC-006, AC-007, AC-010, AC-011, AC-012,
 * AC-015, AC-016, AC-018, AC-033, AC-034, AC-035
 */

import { act, renderHook } from '@testing-library/react';

import { useMultiStickyNote } from '../useMultiStickyNote.js';

const STORAGE_KEY = 'calendarfr_sticky_colors';

let store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => {
    store[key] = value;
  },
  removeItem: (key: string) => {
    delete store[key];
  },
  clear: () => {
    store = {};
  },
};

beforeEach(() => {
  store = {};
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('useMultiStickyNote — initialization', () => {
  it('starts with activeColors = ["y"] when localStorage is empty (AC-007)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.activeColors).toEqual(['y']);
  });

  it('yellow starts open (AC-007)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.openStates['y']).toBe(true);
  });

  it('all z-indices start at 1 (AC-033)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.zIndices['y']).toBe(1);
    expect(result.current.zIndices['r']).toBe(1);
    expect(result.current.zIndices['g']).toBe(1);
    expect(result.current.zIndices['b']).toBe(1);
  });

  it('availableColors = [r, g, b] on first load (AC-015, AC-016)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.availableColors).toEqual(['r', 'g', 'b']);
  });
});

describe('useMultiStickyNote — localStorage restore (AC-018, AC-034)', () => {
  it('restores saved activeColors from localStorage', () => {
    store[STORAGE_KEY] = JSON.stringify(['y', 'r']);
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.activeColors).toEqual(['y', 'r']);
  });

  it('falls back to ["y"] on invalid JSON', () => {
    store[STORAGE_KEY] = 'not-valid-json{{';
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.activeColors).toEqual(['y']);
  });

  it('falls back to ["y"] when stored value is not an array', () => {
    store[STORAGE_KEY] = JSON.stringify({ color: 'y' });
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.activeColors).toEqual(['y']);
  });

  it('forces y to be present even if missing from stored value', () => {
    store[STORAGE_KEY] = JSON.stringify(['r', 'g']);
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.activeColors).toContain('y');
  });

  it('filters out invalid color values from stored array', () => {
    store[STORAGE_KEY] = JSON.stringify(['y', 'x', 'purple']);
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.activeColors).toEqual(['y']);
  });
});

describe('useMultiStickyNote — addColor (AC-015, AC-018, AC-035)', () => {
  it('adds a new color to activeColors (AC-015)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    expect(result.current.activeColors).toContain('r');
  });

  it('opens the newly added color panel (AC-015, AC-010)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    expect(result.current.openStates['r']).toBe(true);
  });

  it('updates localStorage when color is added (AC-018)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('g');
    });
    expect(JSON.parse(store[STORAGE_KEY] as string)).toContain('g');
  });

  it('shrinks availableColors after adding (AC-015, AC-016)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('b');
    });
    expect(result.current.availableColors).not.toContain('b');
  });

  it('is no-op when color is already active (AC-035)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('y');
    });
    expect(result.current.activeColors).toEqual(['y']);
  });

  it('is no-op when 4 colors already active (AC-035)', () => {
    store[STORAGE_KEY] = JSON.stringify(['y', 'r', 'g', 'b']);
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    expect(result.current.activeColors).toHaveLength(4);
  });

  it('availableColors becomes [] when all 4 colors active (AC-016)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    act(() => {
      result.current.addColor('g');
    });
    act(() => {
      result.current.addColor('b');
    });
    expect(result.current.availableColors).toEqual([]);
  });
});

describe('useMultiStickyNote — removeColor (AC-012, AC-033, AC-034)', () => {
  it('removes a non-yellow color from activeColors (AC-033)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    act(() => {
      result.current.removeColor('r');
    });
    expect(result.current.activeColors).not.toContain('r');
  });

  it('removes openState entry for the removed color (AC-034)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    act(() => {
      result.current.removeColor('r');
    });
    expect(result.current.openStates['r']).toBeUndefined();
  });

  it('updates localStorage when color is removed (AC-034)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('g');
    });
    act(() => {
      result.current.removeColor('g');
    });
    const stored = JSON.parse(store[STORAGE_KEY] as string) as string[];
    expect(stored).not.toContain('g');
  });

  it('is no-op when trying to remove yellow (AC-007, AC-012)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.removeColor('y');
    });
    expect(result.current.activeColors).toContain('y');
  });

  it('returning removed color increases availableColors (AC-015)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    act(() => {
      result.current.removeColor('r');
    });
    expect(result.current.availableColors).toContain('r');
  });

  it('removes calendarfr_sticky_pos_{color} from localStorage (AC-034(d))', () => {
    const POS_KEY = 'calendarfr_sticky_pos_r';
    store[POS_KEY] = JSON.stringify({ x: 100, y: 200 });
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    act(() => {
      result.current.removeColor('r');
    });
    expect(store[POS_KEY]).toBeUndefined();
  });
});

describe('useMultiStickyNote — toggleOpen (AC-010, AC-011)', () => {
  it('toggles yellow from open to closed (AC-010)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.toggleOpen('y');
    });
    expect(result.current.openStates['y']).toBe(false);
  });

  it('toggles yellow from closed back to open (AC-010)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.toggleOpen('y');
    });
    act(() => {
      result.current.toggleOpen('y');
    });
    expect(result.current.openStates['y']).toBe(true);
  });

  it('multiple panels can be open simultaneously (AC-011)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    expect(result.current.openStates['y']).toBe(true);
    expect(result.current.openStates['r']).toBe(true);
  });

  it('toggling one color does not affect others (AC-010, AC-011)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    act(() => {
      result.current.toggleOpen('y');
    });
    expect(result.current.openStates['y']).toBe(false);
    expect(result.current.openStates['r']).toBe(true);
  });
});

describe('useMultiStickyNote — bringToFront (AC-033)', () => {
  it('increments z-index above current max (AC-033)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    const initialMax = Math.max(...Object.values(result.current.zIndices));
    act(() => {
      result.current.bringToFront('y');
    });
    expect(result.current.zIndices['y']).toBeGreaterThan(initialMax);
  });

  it('brings color above all others on repeated calls (AC-033)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    act(() => {
      result.current.addColor('r');
    });
    act(() => {
      result.current.bringToFront('r');
    });
    act(() => {
      result.current.bringToFront('y');
    });
    const allZ = Object.values(result.current.zIndices);
    expect(result.current.zIndices['y']).toBe(Math.max(...allZ));
  });

  it('does not change z-index of other colors (AC-033)', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    const rBefore = result.current.zIndices['r'];
    act(() => {
      result.current.bringToFront('y');
    });
    expect(result.current.zIndices['r']).toBe(rBefore);
  });
});

describe('useMultiStickyNote — availableColors derivation (AC-015, AC-016)', () => {
  it('filters based on activeColors correctly', () => {
    store[STORAGE_KEY] = JSON.stringify(['y', 'r']);
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.availableColors).toEqual(['g', 'b']);
  });

  it('is [] when all 4 colors are active (AC-016)', () => {
    store[STORAGE_KEY] = JSON.stringify(['y', 'r', 'g', 'b']);
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.availableColors).toEqual([]);
  });
});

describe('useMultiStickyNote — addColor no-op guard (AC-035)', () => {
  it('addColor y when y already active — openStates[y] stays true, no spurious update', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    // yellow starts open; toggling it closed first proves the guard works
    act(() => {
      result.current.toggleOpen('y');
    });
    expect(result.current.openStates['y']).toBe(false);
    // now addColor('y') should be a strict no-op — panel must NOT reopen
    act(() => {
      result.current.addColor('y');
    });
    expect(result.current.openStates['y']).toBe(false);
    expect(result.current.activeColors).toEqual(['y']);
  });

  it('addColor r when 4 colors active — openStates[r] should NOT become true (AC-035)', () => {
    store[STORAGE_KEY] = JSON.stringify(['y', 'r', 'g', 'b']);
    const { result } = renderHook(() => useMultiStickyNote());
    // r is already active; close it manually to confirm guard doesn't reopen
    act(() => {
      result.current.toggleOpen('r');
    });
    const openBefore = result.current.openStates['r'];
    act(() => {
      result.current.addColor('r');
    });
    expect(result.current.openStates['r']).toBe(openBefore);
    expect(result.current.activeColors).toHaveLength(4);
  });
});

describe('useMultiStickyNote — readStoredColors deduplication (AC-034)', () => {
  it('deduplicates ["y","y","r"] to ["y","r"]', () => {
    store[STORAGE_KEY] = JSON.stringify(['y', 'y', 'r']);
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.activeColors).toEqual(['y', 'r']);
  });
});

describe('useMultiStickyNote — closeAll (AC-012)', () => {
  it('sets all openStates to false', () => {
    const { result } = renderHook(() => useMultiStickyNote());
    expect(result.current.openStates.y).toBe(true);

    act(() => {
      result.current.closeAll();
    });

    expect(result.current.openStates.y).toBeFalsy();
  });
});
