/**
 * useStickyNote — hook for a single color sticky-note instance.
 *
 * Manages:
 * - Fetch on mount via fetchSticky(color) (AC-026, AC-027)
 * - Debounced save via saveSticky(color, items) at 600ms (AC-028)
 * - Minimum-1 item invariant (AC-026, AC-027)
 * - isLoading cleared in finally (AC-032)
 * - Fallback to 1 empty item on fetch error (AC-027)
 * - isLoading=true while fetch is pending, visible to parent (AC-032)
 *
 * NOTE: isOpen/setIsOpen and click-away are managed externally by useMultiStickyNote.
 */

import { useEffect, useRef, useState } from 'react';
import { ulid } from 'ulid';

import { useNotes } from '@/features/notes';
import type { Note, UseNotesReturn } from '@/features/notes';

import { fetchSticky } from '../api/fetchSticky.js';
import { saveSticky } from '../api/saveSticky.js';
import type { StickyColor } from '../types.js';

export interface UseStickyNoteReturn {
  /** True while the initial GET /api/sticky/:color is in-flight (AC-032) */
  isLoading: boolean;
  /** Current note items — minimum 1 at all times (AC-026) */
  items: Note[];
  /** Delegated notes API from useNotes (provides onAdd for AC-027, etc.) */
  notesApi: UseNotesReturn;
  /** Ref attached to the panel element — used for click-away detection by parent */
  panelRef: React.RefObject<HTMLDivElement | null>;
}

function emptyItem(): Note {
  return { id: ulid(), prefix: '•', text: '' };
}

export function useStickyNote(color: StickyColor): UseStickyNoteReturn {
  // AC-032: loading flag cleared in finally; reset to true on color change
  const [isLoading, setIsLoading] = useState(true);
  // AC-026: minimum-1 item invariant enforced here
  const [items, setItems] = useState<Note[]>([emptyItem()]);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // AC-027: guard against overwriting user edits when fetch settles late
  const hasUserEdited = useRef(false);

  // AC-026, AC-027: fetch on mount for this color; reset hasUserEdited on color change
  useEffect(() => {
    // AC-026: reset edit guard so new color's fetch can populate items
    hasUserEdited.current = false;
    // AC-032: show loading for new color
    setIsLoading(true);
    let cancelled = false;

    fetchSticky(color)
      .then((data) => {
        // AC-027: if user already edited before fetch completed, do not overwrite
        if (cancelled || hasUserEdited.current) return;
        if (data.items.length === 0) {
          // always at least 1 item
          setItems([emptyItem()]);
        } else {
          setItems(data.items);
        }
      })
      .catch(() => {
        // AC-027: network/server error -> fallback to 1 empty item, no blocking error
        // Only apply fallback if user has not already started editing
        if (cancelled || hasUserEdited.current) return;
        setItems([emptyItem()]);
      })
      .finally(() => {
        // AC-032: loading cleared regardless of success or failure
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [color]);

  // AC-028: cleanup debounce timer on color change and unmount to avoid stale saves
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [color]);

  // AC-028: debounced save at 600ms; AC-026: minimum-1 invariant enforced
  function handleChange(newItems: Note[]) {
    const safeItems: Note[] = newItems.length === 0 ? [emptyItem()] : newItems;
    // AC-027: mark that user has interacted so late fetch settle won't overwrite
    hasUserEdited.current = true;
    setItems(safeItems);

    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      // AC-028: fire PUT /api/sticky/:color; silent on network error
      saveSticky(color, safeItems).catch(() => {
        /* silent — UI does not block on save errors */
      });
    }, 600);
  }

  // Delegate notes manipulation to useNotes (AC-027: onAdd available)
  const notesApi = useNotes(items, handleChange);

  return { isLoading, items, notesApi, panelRef };
}
