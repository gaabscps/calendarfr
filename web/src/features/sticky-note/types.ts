/**
 * Public types for the sticky-note feature.
 *
 * StickyResponse is the shape returned by GET /api/sticky/:color and PUT /api/sticky/:color.
 * Note is re-used from the notes feature barrel (AC-023).
 * StickyColor enumerates the supported post-it colors (AC-026).
 * Position is used by useDrag for panel coordinates (AC-019, AC-024).
 */

import type { Note } from '@/features/notes';

export type { Note };

export type StickyColor = 'y' | 'r' | 'g' | 'b';

export interface Position {
  x: number;
  y: number;
}

export const STICKY_COLOR_HEX: Record<StickyColor, string> = {
  y: '#f5e06e',
  r: '#fca5a5',
  g: '#86efac',
  b: '#93c5fd',
};

export interface StickyResponse {
  items: Note[];
  updatedAt: string | null;
}
