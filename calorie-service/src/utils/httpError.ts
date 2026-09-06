/**
 * A typed HTTP error that the global error handler maps to a JSON response.
 */
export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message = 'Bad request', details?: unknown) =>
  new HttpError(400, message, details);
export const unauthorized = (message = 'Unauthorized') => new HttpError(401, message);
export const forbidden = (message = 'Forbidden') => new HttpError(403, message);
export const notFound = (message = 'Resource not found') => new HttpError(404, message);
export const conflict = (message = 'Conflict') => new HttpError(409, message);
