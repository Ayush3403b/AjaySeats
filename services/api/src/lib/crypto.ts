import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Keyed hash so a database leak alone cannot be replayed as a session token. */
export function hmacHex(secret: string, value: string): string {
  return createHmac('sha256', secret).update(value).digest('hex');
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
