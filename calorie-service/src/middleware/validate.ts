import type { NextFunction, Request, Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { badRequest } from '../utils/httpError';

type Source = 'body' | 'query' | 'params';

/**
 * Validates a request part against a Zod schema and replaces the raw value
 * with the parsed (typed, coerced) value before the handler runs.
 */
export function validate(schema: ZodSchema, source: Source = 'body') {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      next(badRequest('Validation failed', formatZodError(result.error)));
      return;
    }
    req[source] = result.data;
    next();
  };
}

function formatZodError(error: ZodError): { path: string; message: string }[] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '(root)',
    message: issue.message,
  }));
}
