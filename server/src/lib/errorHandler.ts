/**
 * Global Fastify error handler.
 *
 * Registered via `app.setErrorHandler(errorHandler)` BEFORE any route
 * in buildApp(). Catches all thrown errors from routes and storage.
 *
 * Response envelope: { error: { code, message, details? } }
 * Content-Type: application/json (Fastify default for .send(object))
 *
 * Covers: AC-004, AC-007, AC-024, AC-025.
 */
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

import { ErrorCode, HttpError, StorageCorruptError, StorageWriteError } from './errors.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ErrorHandler = (
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) => void;

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export const errorHandler: ErrorHandler = (error, request, reply) => {
  // HttpError: thrown by route handlers via badRequest() / internal()
  if (error instanceof HttpError) {
    const body: { code: string; message: string; details?: unknown } = {
      code: error.code,
      message: error.message,
    };
    if (error.details !== undefined) {
      body.details = error.details;
    }
    void reply.code(error.statusCode).send({ error: body });
    return;
  }

  // StorageCorruptError: file on disk is corrupt / invalid schema
  if (error instanceof StorageCorruptError) {
    request.log.error({ err: error.cause, path: error.path }, 'storage corrupt');
    void reply.code(500).send({
      error: {
        code: ErrorCode.STORAGE_CORRUPT,
        message: error.message,
        details: { path: error.path },
      },
    });
    return;
  }

  // StorageWriteError: atomic write failed (tmp write or rename)
  if (error instanceof StorageWriteError) {
    request.log.error({ err: error.cause, path: error.path }, 'storage write failed');
    void reply.code(500).send({
      error: {
        code: ErrorCode.STORAGE_WRITE_FAILED,
        message: error.message,
        details: { path: error.path },
      },
    });
    return;
  }

  // ZodError: defense-in-depth in case a route forgets to wrap safeParse
  if (error instanceof ZodError) {
    void reply.code(400).send({
      error: {
        code: ErrorCode.VALIDATION_FAILED,
        message: 'Invalid request body',
        details: error.issues.map((i) => ({
          path: i.path.join('.'),
          message: i.message,
        })),
      },
    });
    return;
  }

  // Default: unhandled error — log with stack, return generic 500 (no stack leak)
  request.log.error({ err: error }, 'unhandled');
  void reply.code(500).send({
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: 'Internal server error',
    },
  });
};
