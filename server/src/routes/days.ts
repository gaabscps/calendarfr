/**
 * Routes: GET /days/:date  and  PUT /days/:date
 * (registered with prefix "/api" in buildApp, so paths become /api/days/:date)
 *
 * Pipeline per request type:
 *   GET: validate :date regex → readDay → return existing OR createEmptyDay (NO disk write)
 *   PUT: validate :date regex → safeParse body → date mismatch check →
 *        sanitizeDayHtml → preserve/set createdAt → set updatedAt → writeDay → echo
 *
 * All thrown errors propagate to the global setErrorHandler (errorHandler.ts).
 *
 * Covers: AC-001, AC-002, AC-003, AC-005, AC-008, AC-010, AC-013, AC-018, AC-023.
 */
import type { DailyPageData } from '@calendarfr/shared';
import type { FastifyInstance } from 'fastify';

import { badRequest, ErrorCode } from '../lib/errors.js';
import { sanitizeDayHtml } from '../lib/sanitize.js';
import { createEmptyDay } from '../schema/createEmptyDay.js';
import { daySchema } from '../schema/daySchema.js';
import { readDay, writeDay } from '../storage/jsonStore.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export default function daysRoutes(app: FastifyInstance): void {
  // -------------------------------------------------------------------------
  // GET /days/:date
  // Returns existing day from disk or an in-memory skeleton (no file written).
  // -------------------------------------------------------------------------
  app.get<{ Params: { date: string } }>('/days/:date', async (req) => {
    const { date } = req.params;

    if (!DATE_RE.test(date)) {
      throw badRequest(ErrorCode.INVALID_DATE_FORMAT, 'Date must be YYYY-MM-DD', {
        received: date,
      });
    }

    const existing = await readDay(date);
    return existing ?? createEmptyDay(date);
  });

  // -------------------------------------------------------------------------
  // PUT /days/:date
  // Validate → sanitize → preserve createdAt → set updatedAt → write atomically.
  // -------------------------------------------------------------------------
  app.put<{ Params: { date: string } }>('/days/:date', async (req) => {
    const { date } = req.params;

    if (!DATE_RE.test(date)) {
      throw badRequest(ErrorCode.INVALID_DATE_FORMAT, 'Date must be YYYY-MM-DD', {
        received: date,
      });
    }

    // Zod parse body
    const parsed = daySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(
        ErrorCode.VALIDATION_FAILED,
        'Invalid request body',
        parsed.error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      );
    }

    // URL date must match body.date (defense-in-depth)
    if (parsed.data.date !== date) {
      throw badRequest(ErrorCode.DATE_MISMATCH, 'URL date does not match body.date');
    }

    // Sanitize HTML in all text fields
    const sanitized = sanitizeDayHtml(parsed.data);

    // Preserve createdAt from existing file; fill on first PUT
    const previous = await readDay(date);
    const now = new Date().toISOString();

    const toWrite: DailyPageData = {
      ...sanitized,
      createdAt: previous?.createdAt ?? now,
      updatedAt: now,
    };

    await writeDay(toWrite);

    return toWrite;
  });
}
