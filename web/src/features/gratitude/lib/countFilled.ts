import type { GratitudeItem } from '@calendarfr/shared';

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '');
}

/** Returns count of slots whose text content is non-empty after stripping HTML and trimming. */
export function countFilled(items: readonly GratitudeItem[]): number {
  return items.filter((g) => stripHtml(g.text).trim().length > 0).length;
}
