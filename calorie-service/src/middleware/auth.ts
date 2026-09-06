import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { unauthorized } from '../utils/httpError';
import { findUserById } from '../repositories/user.repo';

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}

interface TokenPayload {
  sub: number;
  email: string;
  name: string;
}

export interface AuthedRequest extends Request {
  user: AuthUser;
}

/**
 * Verifies the Bearer token and attaches the authenticated user to the request.
 * Re-checks the database so that deleted users are immediately rejected.
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      throw unauthorized('Missing or malformed authorization header');
    }

    const token = header.slice('Bearer '.length).trim();
    const payload = jwt.verify(token, config.jwt.secret) as unknown as TokenPayload;

    const user = await findUserById(payload.sub);
    if (!user) throw unauthorized('Account no longer exists');

    (req as AuthedRequest).user = {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
    };
    next();
  } catch (err) {
    next(err instanceof Error && err.name === 'HttpError' ? err : unauthorized('Invalid or expired token'));
  }
}
