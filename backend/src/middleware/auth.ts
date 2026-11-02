import type { Request, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { ApiError } from '../lib/ApiError.js';

export interface AuthUser {
  id: string;
  role: 'customer' | 'admin';
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthUser;
  }
}

function readUser(req: Request): AuthUser | undefined {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  try {
    const payload = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET, {
      algorithms: ['HS256'],
    }) as jwt.JwtPayload;
    return { id: String(payload.sub), role: payload.role };
  } catch {
    throw ApiError.unauthorized('Your session has expired', 'TOKEN_EXPIRED');
  }
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  req.user = readUser(req);
  if (!req.user) throw ApiError.unauthorized();
  next();
};

/** Attaches the user when a valid token is present; never rejects a missing token. */
export const optionalAuth: RequestHandler = (req, _res, next) => {
  req.user = readUser(req);
  next();
};

export const requireAdmin: RequestHandler = (req, _res, next) => {
  req.user = readUser(req);
  if (!req.user) throw ApiError.unauthorized();
  if (req.user.role !== 'admin') throw ApiError.forbidden();
  next();
};

/** For handlers behind requireAuth, where the user is guaranteed to exist. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw ApiError.unauthorized();
  return req.user;
}
