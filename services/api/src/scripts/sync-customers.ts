/**
 * Rebuilds the customers collection from quote requests. Safe to run more than once.
 * Staff opt-outs are never changed by this script.
 *   npm run customers:sync -w @pcs/api   (reads MONGODB_URI from the environment or .env)
 */
import { loadEnv } from '../config/env.js';
import { connectDatabase, disconnectDatabase } from '../db/connect.js';
import { syncCustomersFromInquiries } from '../services/customers.js';

async function main(): Promise<void> {
  const env = loadEnv();
  await connectDatabase(env.MONGODB_URI);
  try {
    const result = await syncCustomersFromInquiries();
    console.log(`Customers synced from inquiries: ${result.customers}`);
  } finally {
    await disconnectDatabase();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
