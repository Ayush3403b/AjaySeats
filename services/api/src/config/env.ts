import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  /** Comma-separated allowlist of web origins, e.g. http://localhost:5173,https://your-site.vercel.app */
  CLIENT_URL: z.string().min(1).default('http://localhost:5173'),
  MONGODB_URI: z.string().regex(/^mongodb(\+srv)?:\/\//, 'MONGODB_URI must start with mongodb:// or mongodb+srv://'),
  /** Used to HMAC session tokens before storage. Rotating it logs everyone out. */
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  /** Digits only with country code, e.g. 919876543210. Public: used to build wa.me links. */
  WHATSAPP_NUMBER: z.string().regex(/^\d{8,15}$/, 'WHATSAPP_NUMBER must be digits with country code').optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  /** Dev and test only: raises the quote-form limit for local end-to-end runs. Ignored in production. */
  DEV_INQUIRY_LIMIT_PER_HOUR: z.coerce.number().int().min(1).max(10000).optional(),
});

export interface Env extends z.infer<typeof schema> {
  clientOrigins: string[];
  isProduction: boolean;
}

/** Validates environment once at startup. Throws with a readable list of problems. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = schema.safeParse(source);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`);
    throw new Error(`Invalid API environment configuration:\n${lines.join('\n')}`);
  }
  const env = parsed.data;
  const clientOrigins = env.CLIENT_URL.split(',').map((s) => s.trim()).filter(Boolean);
  const problems: string[] = [];
  for (const origin of clientOrigins) {
    try {
      const url = new URL(origin);
      if (url.pathname !== '/' || url.search || url.hash) problems.push(`CLIENT_URL entry must be an origin only: ${origin}`);
    } catch {
      problems.push(`CLIENT_URL entry is not a valid URL: ${origin}`);
    }
  }
  const isProduction = env.NODE_ENV === 'production';
  if (isProduction) {
    if (clientOrigins.some((o) => !o.startsWith('https://'))) problems.push('CLIENT_URL must use https:// in production');
    if (/change-me|example|dev-secret/i.test(env.SESSION_SECRET)) problems.push('SESSION_SECRET looks like a placeholder');
  }
  if (problems.length) throw new Error(`Invalid API environment configuration:\n  - ${problems.join('\n  - ')}`);
  return { ...env, clientOrigins, isProduction };
}
