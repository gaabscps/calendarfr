/**
 * baseline-grid.spec.ts — AC-041..AC-044, AC-049: vertical rhythm 24px snap.
 *
 * Covers FEAT-017 SC-001: 9 key elements snap to the 24px Moleskine baseline grid
 * with drift ≤1px (tolerance for sub-pixel rendering on retina displays).
 *
 * Prerequisites (start before running):
 *   Terminal 1: npm run dev:web    (Vite on localhost:3000)
 *   Terminal 2: npm run dev:server (Fastify on localhost:3003)
 *
 * Or simply: npm run dev  (starts both)
 *
 * Run: npx playwright test --project=real e2e/real/baseline-grid.spec.ts
 *
 * Scope: measures `getBoundingClientRect()` of 9 SC-001 elements in two
 * viewports (desktop 1366×900, mobile 360×740) and asserts that both `top`
 * and `top + height` are multiples of 24 within ±1px.
 *
 * The 9 elements (Spec SC-001 + Plan Decision 12):
 *   1. [data-paper-sheet] (sheet)
 *   2. [data-paper-sheet] > div (GridContainer — first child after navigator)
 *   3. h2/h3 "Prioridades"
 *   4. h2/h3 "Agenda"
 *   5. h2/h3 "Notas"
 *   6. [role="radiogroup"] (MoodPicker)
 *   7. First PriorityItem  ([class*="_item_"])
 *   8. First AgendaSlot    ([class*="_row_"])
 *   9. First NoteItem      ([class*="_note_"])
 */

import { expect, test } from '@playwright/test';

import { attachConsoleErrorCapture } from '../_helpers/console-errors.js';
import { waitForCompanion } from '../_helpers/server-ready.js';

const BASELINE = 24;
const TOLERANCE = 1; // sub-pixel tolerance per AC-042

let companionReady = true;

test.beforeAll(async () => {
  try {
    await waitForCompanion();
  } catch {
    companionReady = false;
  }
});

type Rect = { top: number; height: number };

/**
 * Measure the bounding rect of the first element matching `selector`.
 * Returns null if not found.
 *
 * Special selectors handled by the inline `page.evaluate` resolver:
 *   - "heading:Prioridades" / "heading:Agenda" / "heading:Notas"
 *     → finds h1..h6 whose textContent contains the label (case-insensitive).
 *   - any other string → treated as a regular CSS selector.
 */
async function measure(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<Rect | null> {
  return page.evaluate((sel) => {
    const findEl = () => {
      if (sel.startsWith('heading:')) {
        const needle = sel.slice('heading:'.length).toLowerCase();
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        return headings.find((h) => (h.textContent ?? '').toLowerCase().includes(needle)) ?? null;
      }
      return document.querySelector(sel);
    };
    const el = findEl();
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { top: rect.top, height: rect.height };
  }, selector);
}

/**
 * Assert that a measured rect snaps to the 24px baseline grid within ±1px.
 * Both `top` and `top + height` (i.e. bottom edge) must be multiples of 24.
 * `null` rects fail the assertion with a clear "missing element" message.
 */
function assertSnaps(label: string, rect: Rect | null): void {
  expect(rect, `${label}: element not found in DOM`).not.toBeNull();
  if (!rect) return; // narrowed for TS; expect already failed.

  const topMod = Math.abs(rect.top % BASELINE);
  const topDrift = Math.min(topMod, BASELINE - topMod);
  expect(
    topDrift,
    `${label}: top=${rect.top}px drifts ${topDrift}px from 24px grid`,
  ).toBeLessThanOrEqual(TOLERANCE);

  const bottom = rect.top + rect.height;
  const bottomMod = Math.abs(bottom % BASELINE);
  const bottomDrift = Math.min(bottomMod, BASELINE - bottomMod);
  expect(
    bottomDrift,
    `${label}: bottom=${bottom}px (top+height) drifts ${bottomDrift}px from 24px grid`,
  ).toBeLessThanOrEqual(TOLERANCE);
}

const TARGETS: ReadonlyArray<{ label: string; selector: string }> = [
  { label: '[data-paper-sheet]', selector: '[data-paper-sheet]' },
  { label: '[data-paper-sheet] > div (GridContainer)', selector: '[data-paper-sheet] > div' },
  { label: 'heading "Prioridades"', selector: 'heading:Prioridades' },
  { label: 'heading "Agenda"', selector: 'heading:Agenda' },
  { label: 'heading "Notas"', selector: 'heading:Notas' },
  { label: 'MoodPicker [role="radiogroup"]', selector: '[role="radiogroup"]' },
  { label: 'first PriorityItem', selector: '[class*="_item_"]' },
  { label: 'first AgendaSlot', selector: '[class*="_row_"]' },
  { label: 'first NoteItem', selector: '[class*="_note_"]' },
];

async function runBaselineGridChecks(page: import('@playwright/test').Page): Promise<void> {
  const consoleErrors = attachConsoleErrorCapture(page);

  await page.goto('/');

  // Wait for load to complete: a PriorityItem must be mounted AND no
  // LoadingSkeleton must be present. Per Plan Decision 12.
  await page.waitForFunction(
    () =>
      !!document.querySelector('[class*="PriorityItem_item"], [class*="_item_"]') &&
      !document.querySelector('[class*="LoadingSkeleton"]'),
    undefined,
    { timeout: 10_000 },
  );

  for (const { label, selector } of TARGETS) {
    const rect = await measure(page, selector);
    assertSnaps(label, rect);
  }

  expect(
    consoleErrors,
    `baseline-grid: console.error(s) detected:\n${consoleErrors.join('\n')}`,
  ).toHaveLength(0);
}

test('desktop: 9 key elements snap to 24px grid', async ({ page }) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }
  await page.setViewportSize({ width: 1366, height: 900 });
  await runBaselineGridChecks(page);
});

test('mobile: 9 key elements snap to 24px grid', async ({ page }) => {
  if (!companionReady) {
    test.skip(true, 'companion not up on localhost:3003');
    return;
  }
  await page.setViewportSize({ width: 360, height: 740 });
  await runBaselineGridChecks(page);
});
