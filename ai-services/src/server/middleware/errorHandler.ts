import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './httpError';
import { config } from '../../config';

/** Final error handler — consistent JSON shape, hides internals in production. */
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

  const anyErr = err as { code?: string; message?: string };
  if (anyErr?.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({ error: 'File is too large (max 10MB)' });
    return;
  }

  console.error('[ai][error]', err);
  const message = config.isProduction ? 'Internal server error' : (anyErr?.message ?? 'Internal server error');
  res.status(500).json({ error: message });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Route not found' });
}
