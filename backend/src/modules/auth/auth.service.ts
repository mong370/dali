import { randomBytes, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { env } from '../../config/env.js';
import { ApiError } from '../../lib/ApiError.js';
import { sha256 } from '../../lib/helpers.js';
import { User, type UserDoc } from '../users/user.model.js';
import { RefreshToken } from './refreshToken.model.js';

// Two tabs can refresh with the same token at once. A short grace period stops
// that being mistaken for token theft, which would sign the customer out.
const REUSE_GRACE_MS = 10_000;

// Compared against when the account does not exist, so response time does not reveal which emails are registered.
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), env.BCRYPT_ROUNDS);

export const hashPassword = (password: string) => bcrypt.hash(password, env.BCRYPT_ROUNDS);

export function publicUser(user: UserDoc) {
  return {
    id: user.id as string,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    addresses: user.addresses,
  };
}

function signAccessToken(user: UserDoc) {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id as string,
    expiresIn: env.ACCESS_TOKEN_TTL_MINUTES * 60,
    algorithm: 'HS256',
  });
}

async function issueRefreshToken(userId: Types.ObjectId, family: string) {
  const token = randomBytes(48).toString('base64url');
  await RefreshToken.create({
    user: userId,
    tokenHash: sha256(token),
    family,
    expiresAt: new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
  });
  return token;
}

export async function startSession(user: UserDoc) {
  return {
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user._id, randomUUID()),
  };
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
  phone?: string;
}) {
  if (await User.exists({ email: input.email })) {
    throw ApiError.conflict('An account with this email already exists', 'EMAIL_TAKEN');
  }
  return User.create({
    name: input.name,
    email: input.email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
  });
}

export async function login(email: string, password: string) {
  const user = await User.findOne({ email }).select('+passwordHash');
  const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid) {
    throw ApiError.unauthorized('Incorrect email or password', 'INVALID_CREDENTIALS');
  }
  // Only reached with the right password, so this reveals nothing to a stranger.
  if (user.isBanned) {
    const reason = user.banReason ? ` Reason: ${user.banReason}` : '';
    throw ApiError.forbidden(`This account has been banned.${reason}`);
  }
  if (!user.isActive) throw ApiError.forbidden('This account has been disabled. Please contact us.');
  return user;
}

export async function rotateRefreshToken(token: string | undefined) {
  const invalid = ApiError.unauthorized('Please sign in again', 'INVALID_REFRESH_TOKEN');
  if (!token) throw invalid;

  const stored = await RefreshToken.findOne({ tokenHash: sha256(token) });
  if (!stored || stored.expiresAt.getTime() < Date.now()) throw invalid;

  if (stored.revokedAt && Date.now() - stored.revokedAt.getTime() > REUSE_GRACE_MS) {
    // A long-rotated token came back, so it may be stolen: end every session from this login.
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { revokedAt: new Date() },
    );
    throw invalid;
  }

  const user = await User.findById(stored.user);
  if (!user || !user.isActive || user.isBanned) throw invalid;

  if (!stored.revokedAt) {
    await RefreshToken.updateOne({ _id: stored._id, revokedAt: null }, { revokedAt: new Date() });
  }
  return {
    user,
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user._id, stored.family),
  };
}

export async function revokeRefreshToken(token: string | undefined) {
  if (!token) return;
  const stored = await RefreshToken.findOne({ tokenHash: sha256(token) });
  if (stored) {
    await RefreshToken.updateMany(
      { family: stored.family, revokedAt: null },
      { revokedAt: new Date() },
    );
  }
}

export const revokeAllSessions = (userId: Types.ObjectId) =>
  RefreshToken.updateMany({ user: userId, revokedAt: null }, { revokedAt: new Date() });

export async function createPasswordReset(email: string) {
  const user = await User.findOne({ email, isActive: true, isBanned: { $ne: true } });
  if (!user) return null;
  const token = randomBytes(32).toString('base64url');
  await User.updateOne(
    { _id: user._id },
    { passwordResetHash: sha256(token), passwordResetExpires: new Date(Date.now() + 3_600_000) },
  );
  return { user, token };
}

export async function resetPassword(token: string, password: string) {
  const user = await User.findOne({
    passwordResetHash: sha256(token),
    passwordResetExpires: { $gt: new Date() },
  });
  if (!user) throw ApiError.badRequest('This reset link is invalid or has expired', 'INVALID_TOKEN');
  await User.updateOne(
    { _id: user._id },
    {
      passwordHash: await hashPassword(password),
      $unset: { passwordResetHash: 1, passwordResetExpires: 1 },
    },
  );
  await revokeAllSessions(user._id);
}
