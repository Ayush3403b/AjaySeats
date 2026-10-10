import type { NextFunction, Request, Response } from 'express';
import { SESSION_COOKIE, resolveSession } from '../services/auth.js';
import { errors } from '../lib/errors.js';
import { safeEqual } from '../lib/crypto.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Resolves the session cookie to a user. Sets req.auth. Responds 401 otherwise.
 * Mount on admin routers; sessions are validated against MongoDB on every request.
 */
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token !== 'string' || token.length < 20 || token.length > 200) throw errors.unauthorized();
    const env = req.app.locals.env;
    const resolved = await resolveSession(token, env.SESSION_SECRET);
    if (!resolved) throw errors.unauthorized();
    req.auth = resolved;
    next();
  } catch (err) {
    next(err);
  }
}

/** Double-submit style check: unsafe methods must echo the session's CSRF token in X-CSRF-Token. */
export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) return next();
  const header = req.get('x-csrf-token');
  const expected = req.auth?.csrfToken;
  if (!header || !expected || !safeEqual(header, expected)) return next(errors.csrf());
  next();
}

/** Only owners may run destructive or account-level admin actions. */
export function requireOwner(req: Request, _res: Response, next: NextFunction): void {
  if (req.auth?.role !== 'owner') return next(errors.forbidden());
  next();
}
