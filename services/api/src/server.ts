import { loadEnv } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './db/connect.js';
import { createApp } from './app.js';
import { log } from './lib/logger.js';

async function main(): Promise<void> {
  // Fails loudly and early: a bad environment never starts a half-configured server.
  const env = loadEnv();
  await connectDatabase(env.MONGODB_URI);
  const app = createApp(env, { enableRateLimits: true });
  const server = app.listen(env.PORT, '0.0.0.0', () => {
    log('info', 'api listening', { port: env.PORT, env: env.NODE_ENV });
  });

  const shutdown = (signal: string) => {
    log('info', 'shutting down', { signal });
    server.close(() => {
      void disconnectDatabase().finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
