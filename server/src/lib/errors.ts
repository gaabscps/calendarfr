/**
 * Error codes, classes, and factories for the server companion.
 *
 * Covers: AC-022 (ErrorCode enum), AC-023 (INVALID_DATE_FORMAT),
 * AC-024 (INTERNAL_ERROR catch-all), AC-025 (envelope shape).
 *
 * Carry-over from BATCH-A: StorageCorruptError / StorageWriteError kept here.
 */

// ---------------------------------------------------------------------------
// Error codes (closed set — switch-safe on the client)
// ---------------------------------------------------------------------------

export const ErrorCode = {
  INVALID_DATE_FORMAT: 'INVALID_DATE_FORMAT',
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  DATE_MISMATCH: 'DATE_MISMATCH',
  STORAGE_CORRUPT: 'STORAGE_CORRUPT',
  STORAGE_WRITE_FAILED: 'STORAGE_WRITE_FAILED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

// ---------------------------------------------------------------------------
// HttpError — thrown by route handlers, caught by setErrorHandler
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
    cause?: unknown,
  ) {
    super(message, { cause });
    this.name = 'HttpError';
  }
}

// ---------------------------------------------------------------------------
// Factory helpers (DRY: removes repetition in route handlers)
// ---------------------------------------------------------------------------

export const badRequest = (code: ErrorCode, message: string, details?: unknown): HttpError =>
  new HttpError(400, code, message, details);

export const internal = (code: ErrorCode, message: string, details?: unknown): HttpError =>
  new HttpError(500, code, message, details);

// ---------------------------------------------------------------------------
// Storage errors (used by jsonStore — kept from BATCH-A stub)
// ---------------------------------------------------------------------------

export class StorageCorruptError extends Error {
  constructor(
    public readonly path: string,
    public override readonly cause: unknown,
  ) {
    super(`Corrupt JSON at ${path}`, { cause });
    this.name = 'StorageCorruptError';
  }
}

export class StorageWriteError extends Error {
  constructor(
    public readonly path: string,
    public override readonly cause: unknown,
  ) {
    super(`Write failed at ${path}`, { cause });
    this.name = 'StorageWriteError';
  }
}

// ---------------------------------------------------------------------------
// Filesystem helpers
// ---------------------------------------------------------------------------

export function isEnoent(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as NodeJS.ErrnoException).code === 'ENOENT'
  );
}
