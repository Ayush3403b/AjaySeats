import mongoose from 'mongoose';
import { log } from '../lib/logger.js';

export async function connectDatabase(uri: string): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 10_000, autoIndex: true });
  log('info', 'database connected', { name: mongoose.connection.name });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
