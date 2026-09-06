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
export const notFound = (message = 'Resource not found') => new HttpError(404, message);
