import argon2 from 'argon2';
import type { Response } from 'express';
import { Session } from '../models/Session.js';
import { User, type UserDoc } from '../models/User.js';
import { hmacHex, newToken, safeEqual } from '../lib/crypto.js';
import { log } from '../lib/logger.js';

export const SESSION_COOKIE = 'sid';
export const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

const ARGON2_OPTIONS = { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_OPTIONS);
}

let dummyHash: Promise<string> | null = null;

/** Verifies credentials in constant-ish time (always runs one Argon2 verify). */
export async function verifyCredentials(email: string, password: string): Promise<UserDoc | null> {
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
  if (!user || !user.active) {
    dummyHash ??= hashPassword('timing-equaliser-not-a-real-password');
    await argon2.verify(await dummyHash, password).catch(() => false);
    return null;
  }
  const ok = await argon2.verify(user.passwordHash, password).catch(() => false);
  return ok ? user : null;
}

export async function changePassword(userId: string, current: string, next: string): Promise<boolean> {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !user.active) return false;
  const ok = await argon2.verify(user.passwordHash, current).catch(() => false);
  if (!ok) return false;
  user.passwordHash = await hashPassword(next);
  await user.save();
  return true;
}

export async function createSession(res: Response, user: UserDoc, secret: string, secure: boolean): Promise<string> {
  const token = newToken(32);
  const csrfToken = newToken(32);
  const tokenHash = hmacHex(secret, token);
  await Session.create({
    tokenHash,
    userId: user._id,
    csrfToken,
    expiresAt: new Date(Date.now() + SESSION_TTL_MS),
  });
  user.loginAt = new Date();
  await user.save();
  res.cookie(SESSION_COOKIE, token, sessionCookieOptions(secure));
  return csrfToken;
}

export function sessionCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    // Cross-site (Vercel web -> Render API) needs SameSite=None; Secure. Dev uses Lax over http.
    sameSite: secure ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: SESSION_TTL_MS,
  };
}

export async function resolveSession(token: string, secret: string) {
  const tokenHash = hmacHex(secret, token);
  const session = await Session.findOne({ tokenHash, expiresAt: { $gt: new Date() } }).lean();
  if (!session) return null;
  const user = await User.findById(session.userId).lean();
  if (!user || !user.active) return null;
  if (!safeEqual(tokenHash, session.tokenHash)) return null;
  return {
    userId: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    sessionTokenHash: tokenHash,
    csrfToken: session.csrfToken,
  };
}

export async function destroySession(tokenHash: string): Promise<void> {
  await Session.deleteOne({ tokenHash });
}

export async function destroyAllSessionsForUser(userId: string): Promise<void> {
  const result = await Session.deleteMany({ userId });
  log('info', 'sessions revoked', { userId, count: result.deletedCount });
}
