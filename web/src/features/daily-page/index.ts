/**
 * Public barrel for the daily-page feature.
 *
 * This is the ONLY import point for external consumers (regra inviolável #1).
 * Exports ONLY: DailyPage (component), SaveStatus (type), HttpError (type).
 * Everything else (lib utils, raw API, hooks) is feature-internal.
 *
 * Covers: AC-043 (public API surface), AC-052 (App.tsx imports only from this barrel).
 */

// ── Component ─────────────────────────────────────────────────────────────────
export { DailyPage } from './components/DailyPage.js';

// ── Types ─────────────────────────────────────────────────────────────────────
export type { SaveStatus } from './types.js';
export type { HttpError } from './types.js';
