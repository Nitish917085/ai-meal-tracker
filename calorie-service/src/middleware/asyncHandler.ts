import type { NextFunction, Request, Response } from 'express';

/**
 * Wraps an async route handler so rejected promises are forwarded to the global
 * error handler instead of crashing the process.
 *
 * The request type is generic so handlers that receive an augmented request
 * (e.g. `AuthedRequest` with a `user`) are accepted, while the returned
 * middleware still satisfies Express's `RequestHandler` signature.
 */
export function asyncHandler<TReq extends Request = Request>(
  handler: (req: TReq, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    handler(req as TReq, res, next).catch(next);
  };
}
