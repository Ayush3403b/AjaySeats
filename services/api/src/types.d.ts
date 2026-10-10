import type { Env } from './config/env.js';

declare module 'express-serve-static-core' {
  interface Request {
    auth?: {
      userId: string;
      name: string;
      email: string;
      role: 'owner' | 'staff';
      sessionTokenHash: string;
      csrfToken: string;
    };
  }
  interface Application {
    locals: { env: Env };
  }
}
