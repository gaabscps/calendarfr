/**
 * HTTP PUT client for the sticky-note color-specific endpoint.
 *
 * Covers:
 * - AC-026, AC-028: saveSticky makes PUT /api/sticky/:color with { items } in the body.
 * - AC-021: saveSticky throws on HTTP error (status >= 400) via !res.ok check.
 */

import type { Note } from '@/features/notes';

import type { StickyColor, StickyResponse } from '../types.js';

/**
 * Persists the sticky note items for a given color to the companion server.
 *
 * On 4xx/5xx: throws Error with the HTTP status in the message.
 */
export async function saveSticky(color: StickyColor, items: Note[]): Promise<StickyResponse> {
  const res = await fetch(`/api/sticky/${color}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  });
  if (!res.ok) throw new Error(`saveSticky: HTTP ${res.status}`);
  const data = (await res.json()) as { items: Note[]; updatedAt?: string | null };
  return { items: data.items, updatedAt: data.updatedAt ?? null };
}
