/**
 * dates.ts — Date utility helpers for real E2E specs.
 *
 * Extracted here to avoid duplication across spec files (DRY).
 */

/**
 * Returns today's date as YYYY-MM-DD using LOCAL date parts.
 * Mirrors the same logic used by the app (getTodayLocal in DailyPage).
 */
export function getTodayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Returns the platform-appropriate modifier key name for Playwright keyboard events.
 * Mac: 'Meta' | Win/Linux: 'Control'
 *
 * Usage: `await page.keyboard.press(\`${modKey()}+ArrowRight\`);`
 */
export function modKey(): string {
  return process.platform === 'darwin' ? 'Meta' : 'Control';
}
