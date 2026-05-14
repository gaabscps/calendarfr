/**
 * HTTP GET client for the sticky-note color-specific endpoint.
 *
 * Covers: AC-026, AC-027 (fetchSticky makes GET /api/sticky/:color and returns StickyResponse).
 */

import type { Note } from '@/features/notes';

import type { StickyColor, StickyResponse } from '../types.js';

/**
 * Fetches sticky note items for a given color from the companion server.
 *
 * On network/server error: throws (caller falls back to empty list).
 * On 4xx/5xx: throws Error with the HTTP status in the message.
 */
export async function fetchSticky(color: StickyColor): Promise<StickyResponse> {
  const res = await fetch(`/api/sticky/${color}`);
  if (!res.ok) throw new Error(`fetchSticky: HTTP ${res.status}`);
  const data = (await res.json()) as { items: Note[]; updatedAt?: string | null };
  return { items: data.items, updatedAt: data.updatedAt ?? null };
}
