import type { NextFunction, Request, Response } from 'express';
import { HttpError } from '../utils/httpError';
import { config } from '../config';

/**
 * Final error handler. Converts known errors into a consistent JSON shape and
 * hides internal details in production.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // Multer file-size / type errors.
  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File is too large (max 10MB)' });
    return;
  }

  // Generic multer/body-parser errors.
  if (anyErr && typeof anyErr === 'object' && 'status' in (anyErr as object)) {
    const status = (anyErr as { status: number }).status;
    if (Number.isFinite(status)) {
      res.status(status).json({ error: anyErr.message ?? 'Request error' });
      return;
    }
  }

  // eslint-disable-next-line no-console
  console.error('[error]', err);
  const message = config.isProduction ? 'Internal server error' : (anyErr?.message ?? 'Internal server error');
  res.status(500).json({ error: message });
}

/** 404 handler for unmatched routes. */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}
