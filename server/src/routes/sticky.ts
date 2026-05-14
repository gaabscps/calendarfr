/**
 * Routes: GET /sticky, PUT /sticky (legacy yellow-only)
 *         GET /sticky/:color, PUT /sticky/:color (multi-color, FEAT-021)
 * (registered with prefix "/api" in buildApp, so paths become /api/sticky[/:color])
 *
 * Pipeline per request type:
 *   GET legacy: delegates to readStickyColor('y') → lazy init { items: [], updatedAt: null }
 *   PUT legacy: safeParse body → sanitizeText per item → writeStickyColor('y', ...) → echo
 *   GET color: validate color param → readStickyColor(color) → lazy init or data
 *   PUT color: validate color param → safeParse body → sanitizeText → writeStickyColor → echo
 *
 * All thrown errors propagate to the global setErrorHandler (errorHandler.ts).
 *
 * Covers: AC-017, AC-018, AC-019, AC-020, AC-021, AC-026, AC-027, AC-029, AC-030, AC-031.
 */
import type { FastifyInstance } from 'fastify';

import { badRequest, ErrorCode } from '../lib/errors.js';
import { sanitizeText } from '../lib/sanitize.js';
import { stickyBodySchema, stickyColorSchema } from '../schema/stickySchema.js';
import { readStickyColor, writeStickyColor } from '../storage/stickyStore.js';

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------

export default function stickyRoutes(app: FastifyInstance): void {
  // -------------------------------------------------------------------------
  // GET /sticky  (legacy — yellow only, AC-031)
  // Delegates to readStickyColor('y').
  // -------------------------------------------------------------------------
  app.get('/sticky', async () => {
    const entry = await readStickyColor('y');

    if (entry === null) {
      return { items: [], updatedAt: null };
    }

    return { items: entry.items, updatedAt: entry.updatedAt };
  });

  // -------------------------------------------------------------------------
  // PUT /sticky  (legacy — yellow only, AC-031)
  // Validate → sanitize item.text → writeStickyColor('y', ...) → echo with updatedAt.
  // -------------------------------------------------------------------------
  app.put('/sticky', async (req) => {
    const parsed = stickyBodySchema.safeParse(req.body);

    if (!parsed.success) {
      throw badRequest(ErrorCode.VALIDATION_FAILED, 'Invalid sticky body');
    }

    const sanitizedItems = parsed.data.items.map((item) => ({
      ...item,
      text: sanitizeText(item.text),
    }));

    const updatedAt = await writeStickyColor('y', sanitizedItems);

    return { items: sanitizedItems, updatedAt };
  });

  // -------------------------------------------------------------------------
  // GET /sticky/:color  (multi-color, AC-026, AC-027)
  // Validate color param → readStickyColor(color) → lazy init or data.
  // -------------------------------------------------------------------------
  app.get<{ Params: { color: string } }>('/sticky/:color', async (req, reply) => {
    const colorResult = stickyColorSchema.safeParse(req.params.color);
    if (!colorResult.success) {
      return reply.status(400).send({ error: 'invalid color' });
    }

    const entry = await readStickyColor(colorResult.data);
    if (entry === null) {
      return reply.send({ items: [], updatedAt: null });
    }

    return reply.send({ items: entry.items, updatedAt: entry.updatedAt });
  });

  // -------------------------------------------------------------------------
  // PUT /sticky/:color  (multi-color, AC-029, AC-030)
  // Validate color param → safeParse body → sanitize → writeStickyColor → echo.
  // -------------------------------------------------------------------------
  app.put<{ Params: { color: string } }>('/sticky/:color', async (req, reply) => {
    const colorResult = stickyColorSchema.safeParse(req.params.color);
    if (!colorResult.success) {
      return reply.status(400).send({ error: 'invalid color' });
    }

    const parsed = stickyBodySchema.safeParse(req.body);
    if (!parsed.success) {
      throw badRequest(ErrorCode.VALIDATION_FAILED, 'Invalid sticky body');
    }

    const sanitizedItems = parsed.data.items.map((item) => ({
      ...item,
      text: sanitizeText(item.text),
    }));

    const updatedAt = await writeStickyColor(colorResult.data, sanitizedItems);

    return reply.send({ items: sanitizedItems, updatedAt });
  });
}
