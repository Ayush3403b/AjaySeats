import { Router } from 'express';
import { z } from 'zod';
import { loginSchema, type SessionInfo } from '@pcs/shared';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { makeLimiter } from '../middleware/rateLimit.js';
import {
  SESSION_COOKIE,
  changePassword,
  createSession,
  destroyAllSessionsForUser,
  destroySession,
  resolveSession,
  verifyCredentials,
} from '../services/auth.js';
import { AppError, errors } from '../lib/errors.js';
import { safeEqual } from '../lib/crypto.js';
import { log } from '../lib/logger.js';

export function authRouter(opts: { enableRateLimits: boolean }): Router {
  const router = Router();
  const loginLimiter = makeLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    code: 'RATE_LIMITED',
    message: 'Too many sign-in attempts. Try again in 15 minutes.',
    enabled: opts.enableRateLimits,
  });

  router.post('/login', loginLimiter, async (req, res) => {
    const input = loginSchema.parse(req.body);
    const env = req.app.locals.env;
    const user = await verifyCredentials(input.email, input.password);
    if (!user) {
      log('warn', 'login failed');
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    const csrfToken = await createSession(res, user, env.SESSION_SECRET, env.isProduction);
    log('info', 'login succeeded', { userId: String(user._id), role: user.role });
    const body: SessionInfo = {
      user: { id: String(user._id), name: user.name, email: user.email, role: user.role },
      csrfToken,
    };
    res.setHeader('Cache-Control', 'no-store');
    res.json(body);
  });

  router.post('/logout', async (req, res) => {
    const env = req.app.locals.env;
    const token = req.cookies?.[SESSION_COOKIE];
    if (typeof token === 'string') {
      const session = await resolveSession(token, env.SESSION_SECRET);
      if (session) {
        const header = req.get('x-csrf-token') ?? '';
        if (!safeEqual(header, session.csrfToken)) throw errors.csrf();
        await destroySession(session.sessionTokenHash);
      }
    }
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.setHeader('Cache-Control', 'no-store');
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    const auth = req.auth!;
    const body: SessionInfo = {
      user: { id: auth.userId, name: auth.name, email: auth.email, role: auth.role },
      csrfToken: auth.csrfToken,
    };
    res.setHeader('Cache-Control', 'no-store');
    res.json(body);
  });

  const changeSchema = z.strictObject({
    currentPassword: z.string().min(1).max(200),
    newPassword: z.string().min(12, 'Use at least 12 characters').max(200),
  });

  /** Changing the password revokes every session for the user; the owner signs in again. */
  router.post('/change-password', requireAuth, requireCsrf, async (req, res) => {
    const input = changeSchema.parse(req.body);
    const ok = await changePassword(req.auth!.userId, input.currentPassword, input.newPassword);
    if (!ok) throw new AppError(422, 'VALIDATION_FAILED', 'Current password is incorrect', [{ path: 'currentPassword', message: 'Incorrect password' }]);
    await destroyAllSessionsForUser(req.auth!.userId);
    res.clearCookie(SESSION_COOKIE, { path: '/' });
    res.status(204).end();
  });

  return router;
}
