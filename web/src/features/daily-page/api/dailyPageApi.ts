/**
 * HTTP client for daily-page data.
 *
 * Pure module — no React, no hooks, no state. Accepts AbortSignal for
 * cancellation and exposes typed HttpError for error discrimination.
 *
 * API contract: GET/PUT /api/days/:date (companion FEAT-006).
 *
 * Covers: AC-043, AC-044, AC-045, AC-046, AC-047.
 */

import type { DailyPageData } from '@calendarfr/shared';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Resolves the API base URL from the Vite environment.
 *
 * In Vite dev/build: import.meta.env.VITE_API_URL is set (or empty).
 * In Jest/jsdom: import.meta is unavailable (SWC CJS transform does not
 * support it at runtime). We read from globalThis.__VITE_API_URL__ which
 * tests can set, or fall back to the hardcoded default.
 *
 * Note: globalThis.__VITE_API_URL__ is set by jest.polyfills.js (BATCH-E adds it)
 * or manually in individual test files when a non-default URL is needed.
 * The VITE_API_URL env var is the production source; jest tests use the fallback.
 *
 * Covers: AC-046.
 */
declare global {
  // Injected by Vite build (via define config) or set in test setup.
  var __VITE_API_URL__: string | undefined;
}

function resolveApiBaseUrl(): string {
  // Production path: Vite injects VITE_API_URL as a compile-time constant.
  // Jest path: globalThis.__VITE_API_URL__ can be set in test setup.
  // Fallback: hardcoded localhost for development/test when neither is set.
  if (typeof globalThis.__VITE_API_URL__ === 'string' && globalThis.__VITE_API_URL__) {
    return globalThis.__VITE_API_URL__;
  }
  return 'http://localhost:3003';
}

/**
 * Base URL for the companion server.
 * Reads from VITE_API_URL (injected by Vite as globalThis.__VITE_API_URL__),
 * falls back to http://localhost:3003.
 * Exported for use in tests.
 */
export const API_BASE_URL: string = resolveApiBaseUrl();

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

/**
 * Typed HTTP error with the response status code.
 * Thrown for 4xx and 5xx responses.
 *
 * Covers AC-044: discriminable by instanceof + .status field.
 */
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    // Maintain correct prototype chain in TS compiled output.
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Asserts a Response is OK; throws HttpError otherwise.
 * AbortError propagates naturally (fetch throws DOMException before we get here).
 */
async function assertOk(response: Response): Promise<void> {
  if (!response.ok) {
    let message = `HTTP ${response.status}`;
    try {
      const body = (await response.json()) as { message?: string };
      if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // JSON parse failed — keep the default message
    }
    throw new HttpError(response.status, message);
  }
}

// ---------------------------------------------------------------------------
// Public API functions
// ---------------------------------------------------------------------------

/**
 * Fetches the daily page data for the given ISO date string.
 *
 * - On 404: companion returns an in-memory skeleton (not a real 404),
 *   so the client should never see a 404 in practice (FEAT-006 lazy creation).
 * - On abort: fetch throws DOMException with name "AbortError" (AC-045).
 * - On 4xx/5xx: throws HttpError with the response status (AC-044).
 *
 * JSON parse trust boundary: a 200 response with a malformed JSON body
 * propagates as `SyntaxError` from `response.json()`. Callers should treat
 * this as an unrecoverable load error (no retry) — SyntaxError is the correct
 * signal for a non-retryable malformed-server response.
 */
export async function fetchDay(
  date: string,
  opts?: { signal?: AbortSignal },
): Promise<DailyPageData> {
  const response = await fetch(`${API_BASE_URL}/api/days/${date}`, {
    method: 'GET',
    // No Content-Type header: GETs have no body; the header is semantically
    // wrong and a CORS preflight risk.
    ...(opts?.signal != null ? { signal: opts.signal } : {}),
  });

  await assertOk(response);

  return response.json() as Promise<DailyPageData>;
}

/**
 * Saves the daily page data for the given ISO date string.
 *
 * Options:
 * - signal: AbortSignal — for cancelling the request (AC-045).
 * - keepalive: boolean — set to true for beforeunload saves so the request
 *   survives page navigation (AC-031).
 *
 * JSON parse trust boundary: a 200 response with a malformed JSON body
 * propagates as `SyntaxError` from `response.json()`. Callers should treat
 * this as an unrecoverable load error (no retry) — SyntaxError is the correct
 * signal for a non-retryable malformed-server response.
 */
export async function saveDay(
  args: { date: string; body: DailyPageData },
  opts?: { signal?: AbortSignal; keepalive?: boolean },
): Promise<DailyPageData> {
  const response = await fetch(`${API_BASE_URL}/api/days/${args.date}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(args.body),
    keepalive: opts?.keepalive ?? false,
    ...(opts?.signal != null ? { signal: opts.signal } : {}),
  });

  await assertOk(response);

  return response.json() as Promise<DailyPageData>;
}
