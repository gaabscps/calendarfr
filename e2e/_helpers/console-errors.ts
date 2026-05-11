/**
 * console-errors.ts — Console error capture helper for real E2E specs.
 *
 * Attaches listeners to capture console.error and pageerror events.
 * Extracted to avoid copy-paste across spec files (DRY).
 *
 * Usage:
 *   const consoleErrors = attachConsoleErrorCapture(page);
 *   // ... run test ...
 *   expect(consoleErrors).toHaveLength(0);
 */

import type { Page } from '@playwright/test';

/**
 * Attaches console.error and pageerror listeners to the page.
 * Returns the shared array that accumulates captured messages.
 * Call before page.goto() so no errors are missed.
 */
export function attachConsoleErrorCapture(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    errors.push(`[pageerror] ${err.message}`);
  });
  return errors;
}
