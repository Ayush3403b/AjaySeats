import { rateLimit } from 'express-rate-limit';
import type { Request, Response } from 'express';

interface LimitOptions {
  windowMs: number;
  limit: number;
  code: string;
  message: string;
  enabled: boolean;
}

/** Per-IP limiter with the standard JSON error envelope. Disabled only in tests. */
export function makeLimiter({ windowMs, limit, code, message, enabled }: LimitOptions) {
  return rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => !enabled,
    handler: (_req: Request, res: Response) => {
      res.status(429).json({ error: { code, message } });
    },
  });
}
