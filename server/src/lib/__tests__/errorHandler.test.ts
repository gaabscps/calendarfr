/**
 * @jest-environment node
 *
 * Unit tests for errorHandler.ts and errors.ts factories.
 * Covers ZodError branch, default unhandled branch, and the `internal()` factory.
 *
 * AC-024 (INTERNAL_ERROR catch-all), AC-025 (envelope shape).
 */
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ZodError, ZodIssueCode } from 'zod';

import { errorHandler } from '../errorHandler';
import { ErrorCode, HttpError, StorageCorruptError, StorageWriteError, internal } from '../errors';

// ---------------------------------------------------------------------------
// Test doubles — minimal Fastify request/reply stubs
// TypeScript requires double-cast (via unknown) since the stub shapes don't
// have enough overlap with the full FastifyRequest/FastifyReply interfaces.
// ---------------------------------------------------------------------------

function makeReply() {
  const sent: unknown[] = [];
  let statusCode = 200;
  const stub = {
    code(n: number) {
      statusCode = n;
      return stub;
    },
    send(body: unknown) {
      sent.push(body);
      return stub;
    },
    _statusCode: () => statusCode,
    _sent: () => sent,
  };
  return stub as unknown as FastifyReply & { _statusCode(): number; _sent(): unknown[] };
}

function makeRequest() {
  const logged: unknown[] = [];
  const stub = {
    log: {
      error: (...args: unknown[]) => {
        logged.push(args);
      },
    },
    _logged: () => logged,
  };
  return stub as unknown as FastifyRequest & { _logged(): unknown[] };
}

// ---------------------------------------------------------------------------
// Scenario 1: ZodError → 400 VALIDATION_FAILED (defense-in-depth branch)
// ---------------------------------------------------------------------------
it('errorHandler: ZodError → 400 VALIDATION_FAILED envelope', () => {
  const zodErr = new ZodError([
    {
      code: ZodIssueCode.invalid_type,
      expected: 'string',
      received: 'number',
      path: ['priorities', 0, 'text'],
      message: 'Expected string, received number',
    },
  ]);

  const req = makeRequest();
  const reply = makeReply();

  errorHandler(zodErr as unknown as Parameters<typeof errorHandler>[0], req, reply);

  expect(reply._statusCode()).toBe(400);
  const body = reply._sent()[0] as {
    error: { code: string; details: { path: string; message: string }[] };
  };
  expect(body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
  expect(body.error.details[0]?.path).toBe('priorities.0.text');
});

// ---------------------------------------------------------------------------
// Scenario 2: Generic/unhandled error → 500 INTERNAL_ERROR (no stack leak)
// ---------------------------------------------------------------------------
it('errorHandler: unhandled Error → 500 INTERNAL_ERROR, logs error, no stack in response', () => {
  const genericErr = new Error('something exploded');

  const req = makeRequest();
  const reply = makeReply();

  errorHandler(genericErr as unknown as Parameters<typeof errorHandler>[0], req, reply);

  expect(reply._statusCode()).toBe(500);
  const body = reply._sent()[0] as { error: { code: string; message: string } };
  expect(body.error.code).toBe(ErrorCode.INTERNAL_ERROR);
  expect(body.error.message).toBe('Internal server error');
  // stack must NOT be present
  expect(JSON.stringify(body)).not.toContain('something exploded');
  // request.log.error was called
  expect(req._logged().length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Scenario 3: HttpError (with details) handled correctly
// ---------------------------------------------------------------------------
it('errorHandler: HttpError with details → correct statusCode, code, details', () => {
  const err = new HttpError(400, ErrorCode.DATE_MISMATCH, 'mismatch', { url: 'x', body: 'y' });

  const req = makeRequest();
  const reply = makeReply();

  errorHandler(err as unknown as Parameters<typeof errorHandler>[0], req, reply);

  expect(reply._statusCode()).toBe(400);
  const body = reply._sent()[0] as { error: { code: string; details: unknown } };
  expect(body.error.code).toBe(ErrorCode.DATE_MISMATCH);
  expect(body.error.details).toEqual({ url: 'x', body: 'y' });
});

// ---------------------------------------------------------------------------
// Scenario 4: StorageCorruptError → 500 STORAGE_CORRUPT (logs cause + path)
// ---------------------------------------------------------------------------
it('errorHandler: StorageCorruptError → 500 STORAGE_CORRUPT with path, logs error', () => {
  const cause = new SyntaxError('bad json');
  const err = new StorageCorruptError('/data/days/2026-05-09.json', cause);

  const req = makeRequest();
  const reply = makeReply();

  errorHandler(err as unknown as Parameters<typeof errorHandler>[0], req, reply);

  expect(reply._statusCode()).toBe(500);
  const body = reply._sent()[0] as { error: { code: string; details: { path: string } } };
  expect(body.error.code).toBe(ErrorCode.STORAGE_CORRUPT);
  expect(body.error.details.path).toBe('/data/days/2026-05-09.json');
  expect(req._logged().length).toBeGreaterThan(0);
});

// ---------------------------------------------------------------------------
// Scenario 5: StorageWriteError → 500 STORAGE_WRITE_FAILED
// ---------------------------------------------------------------------------
it('errorHandler: StorageWriteError → 500 STORAGE_WRITE_FAILED with path', () => {
  const err = new StorageWriteError('/data/days/tmp.123', new Error('ENOSPC'));

  const req = makeRequest();
  const reply = makeReply();

  errorHandler(err as unknown as Parameters<typeof errorHandler>[0], req, reply);

  expect(reply._statusCode()).toBe(500);
  const body = reply._sent()[0] as { error: { code: string; details: { path: string } } };
  expect(body.error.code).toBe(ErrorCode.STORAGE_WRITE_FAILED);
  expect(body.error.details.path).toBe('/data/days/tmp.123');
});

// ---------------------------------------------------------------------------
// Scenario 6: errors.ts `internal()` factory produces HttpError(500, code)
// ---------------------------------------------------------------------------
it('errors.internal() creates HttpError with statusCode 500', () => {
  const err = internal(ErrorCode.INTERNAL_ERROR, 'boom', { hint: 'debug' });
  expect(err).toBeInstanceOf(HttpError);
  expect(err.statusCode).toBe(500);
  expect(err.code).toBe(ErrorCode.INTERNAL_ERROR);
  expect(err.message).toBe('boom');
  expect(err.details).toEqual({ hint: 'debug' });
});
