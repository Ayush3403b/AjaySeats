import { AppError } from './errors.js';

/** Validates a route :id param as a Mongo ObjectId string. */
export function idParam(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{24}$/i.test(value)) {
    throw new AppError(400, 'INVALID_ID', 'Invalid identifier');
  }
  return value;
}
