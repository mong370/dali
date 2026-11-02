import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env.js';

const skip = () => env.NODE_ENV === 'test';
const message = {
  error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' },
};

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 600,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message,
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message,
});

export const formLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip,
  message,
});
