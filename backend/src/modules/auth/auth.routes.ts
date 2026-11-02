import { Router, type Response } from 'express';
import { z } from 'zod';
import { env, isProd } from '../../config/env.js';
import { logger } from '../../config/logger.js';
import { sendMail } from '../../lib/mailer.js';
import { authLimiter } from '../../middleware/rateLimit.js';
import * as auth from './auth.service.js';

export const COOKIE_NAME = 'dali_rt';
const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE ? env.COOKIE_SECURE === 'true' : isProd,
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
};

function setRefreshCookie(res: Response, token: string) {
  res.cookie(COOKIE_NAME, token, {
    ...cookieOptions,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
}

const email = z.email().transform((value) => value.toLowerCase().trim());
export const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be at most 72 characters');

const registerBody = z.object({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  email,
  password,
  phone: z.string().trim().max(20).optional(),
});
const loginBody = z.object({ email, password: z.string().min(1).max(72) });

export const authRouter = Router();
// Every page load calls /refresh, so the strict limiter covers only password-guessing routes.
authRouter.post('/register', authLimiter, async (req, res) => {
  const user = await auth.register(registerBody.parse(req.body));
  const session = await auth.startSession(user);
  setRefreshCookie(res, session.refreshToken);
  res.status(201).json({ user: auth.publicUser(user), accessToken: session.accessToken });
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const input = loginBody.parse(req.body);
  const user = await auth.login(input.email, input.password);
  const session = await auth.startSession(user);
  setRefreshCookie(res, session.refreshToken);
  res.json({ user: auth.publicUser(user), accessToken: session.accessToken });
});

authRouter.post('/refresh', async (req, res) => {
  try {
    const session = await auth.rotateRefreshToken(req.cookies[COOKIE_NAME]);
    setRefreshCookie(res, session.refreshToken);
    res.json({ user: auth.publicUser(session.user), accessToken: session.accessToken });
  } catch (err) {
    res.clearCookie(COOKIE_NAME, cookieOptions);
    throw err;
  }
});

authRouter.post('/logout', async (req, res) => {
  await auth.revokeRefreshToken(req.cookies[COOKIE_NAME]);
  res.clearCookie(COOKIE_NAME, cookieOptions);
  res.status(204).end();
});

authRouter.post('/forgot-password', authLimiter, async (req, res) => {
  const body = z.object({ email }).parse(req.body);
  const reset = await auth.createPasswordReset(body.email);
  if (reset) {
    // A mail failure must not change the response, or it would reveal the account exists.
    await sendMail({
      to: reset.user.email,
      subject: 'Reset your Dali password',
      text: `Reset your password within one hour: ${env.CLIENT_URL}/reset-password?token=${reset.token}`,
    }).catch((err: unknown) => logger.error({ err }, 'Could not send password-reset email'));
  }
  // The same response either way, so this cannot be used to discover accounts.
  res.json({ message: 'If that email has an account, a reset link has been sent.' });
});

authRouter.post('/reset-password', authLimiter, async (req, res) => {
  const body = z.object({ token: z.string().min(10).max(200), password }).parse(req.body);
  await auth.resetPassword(body.token, body.password);
  res.json({ message: 'Your password has been updated. Please sign in.' });
});
