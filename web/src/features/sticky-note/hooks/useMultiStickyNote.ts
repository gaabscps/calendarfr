/**
 * useMultiStickyNote — orchestrator hook for multi-color sticky note state.
 *
 * Manages:
 * - activeColors: colors currently displayed as tabs (AC-006, AC-011)
 * - openStates: which panels are open/closed (AC-007, AC-010)
 * - zIndices: z-index per color for stacking (AC-033)
 * - availableColors: colors not yet active (AC-015, AC-016)
 *
 * Persistence:
 * - calendarfr_sticky_colors in localStorage (AC-018, AC-034)
 *
 * Yellow ('y') is always present and cannot be removed (AC-007, AC-012).
 * Maximum 4 active colors; addColor is no-op when at capacity (AC-035).
 */

import { useCallback, useState } from 'react';

import type { StickyColor } from '../types.js';

const ALL_COLORS: StickyColor[] = ['y', 'r', 'g', 'b'];
const STORAGE_KEY = 'calendarfr_sticky_colors';

function readStoredColors(): StickyColor[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return ['y'];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return ['y'];
    // AC-034: deduplicate — a corrupted store like ["y","y","r"] yields ["y","r"]
    const seen = new Set<StickyColor>();
    const valid = (parsed as unknown[]).reduce<StickyColor[]>((acc, c) => {
      const sc = c as StickyColor;
      if (ALL_COLORS.includes(sc) && !seen.has(sc)) {
        seen.add(sc);
        acc.push(sc);
      }
      return acc;
    }, []);
    return valid.includes('y') ? valid : ['y', ...valid];
  } catch {
    return ['y'];
  }
}

export interface UseMultiStickyNoteReturn {
  /** Colors currently displayed as tabs (AC-006, AC-011) */
  activeColors: StickyColor[];
  /** Which panels are open — keyed by color (AC-007, AC-010) */
  openStates: Partial<Record<StickyColor, boolean>>;
  /** z-index per color for stacking order (AC-033) */
  zIndices: Record<StickyColor, number>;
  /** Colors not yet active — empty when all 4 slots used (AC-015, AC-016) */
  availableColors: StickyColor[];
  /** Add a color: opens its panel, persists to localStorage (AC-015, AC-018) */
  addColor: (color: StickyColor) => void;
  /** Remove a color (no-op for yellow) — updates localStorage (AC-012, AC-034) */
  removeColor: (color: StickyColor) => void;
  /** Toggle open/closed state for a color (AC-010) */
  toggleOpen: (color: StickyColor) => void;
  /** Bring a color's panel to the front (AC-033) */
  bringToFront: (color: StickyColor) => void;
  /** Close all open panels (AC-012 — called by global click-away in StickyNote) */
  closeAll: () => void;
}

export function useMultiStickyNote(): UseMultiStickyNoteReturn {
  // AC-018: restore from localStorage on init; fallback ['y']
  const [activeColors, setActiveColors] = useState<StickyColor[]>(() => readStoredColors());

  // AC-007: yellow starts open; others start closed
  const [openStates, setOpenStates] = useState<Partial<Record<StickyColor, boolean>>>(() => ({
    y: true,
  }));

  // AC-033: all z-indices start at 1
  const [zIndices, setZIndices] = useState<Record<StickyColor, number>>(() => ({
    y: 1,
    r: 1,
    g: 1,
    b: 1,
  }));

  // AC-015, AC-016: derived — colors not in activeColors
  const availableColors = ALL_COLORS.filter((c) => !activeColors.includes(c));

  // AC-015, AC-018, AC-035: add color if not present and under cap
  const addColor = useCallback((color: StickyColor) => {
    // AC-035: setOpenStates must only fire when a color was actually added.
    // React guarantees the functional updater runs synchronously, so didAdd
    // is set before the if-check below.
    let didAdd = false;
    setActiveColors((prev) => {
      if (prev.includes(color) || prev.length >= 4) return prev;
      didAdd = true;
      const next = [...prev, color];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    // AC-015: open the newly added panel — only when actually added
    if (didAdd) {
      setOpenStates((prev) => ({ ...prev, [color]: true }));
    }
  }, []);

  // AC-012, AC-034: remove color — yellow is permanent
  const removeColor = useCallback((color: StickyColor) => {
    if (color === 'y') return;
    setActiveColors((prev) => {
      const next = prev.filter((c) => c !== color);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setOpenStates((prev) => {
      const next = { ...prev };
      delete next[color];
      return next;
    });
    // AC-034(d): remove saved position for this color
    localStorage.removeItem(`calendarfr_sticky_pos_${color}`);
  }, []);

  // AC-010, AC-011: toggle open state — independent per color
  const toggleOpen = useCallback((color: StickyColor) => {
    setOpenStates((prev) => ({ ...prev, [color]: !prev[color] }));
  }, []);

  // AC-033: increment this color's z-index above the current max
  const bringToFront = useCallback((color: StickyColor) => {
    setZIndices((prev) => {
      const maxZ = Math.max(...Object.values(prev));
      return { ...prev, [color]: maxZ + 1 };
    });
  }, []);

  const closeAll = useCallback(() => {
    setOpenStates({});
  }, []);

  return {
    activeColors,
    openStates,
    zIndices,
    availableColors,
    addColor,
    removeColor,
    toggleOpen,
    bringToFront,
    closeAll,
  };
}
