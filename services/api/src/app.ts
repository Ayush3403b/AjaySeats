import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import type { Env } from './config/env.js';
import { requestContext } from './middleware/requestContext.js';
import { errorHandler } from './middleware/errorHandler.js';
import { makeLimiter } from './middleware/rateLimit.js';
import { publicRouter } from './routes/public.js';
import { inquiriesRouter } from './routes/inquiries.js';
import { authRouter } from './routes/auth.js';
import { adminRouter } from './routes/admin.js';
import { inquiryLimitPerHour, makeInquiryLimiter } from './routes/limits.js';

export interface AppOptions {
  /** Tests disable rate limits; production always enables them. */
  enableRateLimits: boolean;
}

export function createApp(env: Env, options: AppOptions = { enableRateLimits: true }): Express {
  const app = express();
  app.locals.env = env;
  app.disable('x-powered-by');
  if (env.isProduction) app.set('trust proxy', 1);

  app.use(requestContext);
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: (origin, callback) => {
        // Requests without an Origin header (curl, health checks) are not browser CORS requests.
        if (!origin) return callback(null, false);
        callback(null, env.clientOrigins.includes(origin));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      maxAge: 600,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '32kb', strict: true }));

  const general = makeLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    code: 'RATE_LIMITED',
    message: 'Too many requests. Please slow down.',
    enabled: options.enableRateLimits,
  });

  const v1 = express.Router();
  v1.use(general);
  v1.use(publicRouter);
  v1.use('/inquiries', makeInquiryLimiter(options.enableRateLimits, inquiryLimitPerHour(env)), inquiriesRouter);
  v1.use('/auth', authRouter({ enableRateLimits: options.enableRateLimits }));
  v1.use('/admin', adminRouter);
  app.use('/api/v1', v1);

  app.use((_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  app.use(errorHandler);
  return app;
}
