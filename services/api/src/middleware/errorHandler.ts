import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors.js';
import { log } from '../lib/logger.js';

/** Single place that turns exceptions into the standard { error: { code, message } } envelope. */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = res.getHeader('X-Request-Id');
  const body = (status: number, code: string, message: string, details?: unknown) => {
    res.status(status).json({ error: { code, message, ...(details !== undefined ? { details } : {}), requestId } });
  };

  if (err instanceof AppError) {
    return body(err.status, err.code, err.message, err.details);
  }
  if (err instanceof z.ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join('.'), message: i.message }));
    return body(422, 'VALIDATION_FAILED', 'Please check the highlighted fields', details);
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return body(400, 'MALFORMED_JSON', 'Request body is not valid JSON');
  }
  const type = (err as { type?: string })?.type;
  if (type === 'entity.too.large') {
    return body(413, 'PAYLOAD_TOO_LARGE', 'Request is too large');
  }
  if (err instanceof mongoose.Error.CastError) {
    return body(400, 'INVALID_ID', 'Invalid identifier');
  }
  if ((err as { code?: number })?.code === 11000) {
    const key = Object.keys((err as { keyPattern?: object }).keyPattern ?? {})[0] ?? 'value';
    return body(409, 'DUPLICATE', `That ${key} is already in use`);
  }
  log('error', 'unhandled error', {
    requestId,
    path: req.path,
    errorName: (err as Error)?.name,
    errorMessage: (err as Error)?.message?.slice(0, 300),
  });
  return body(500, 'INTERNAL', 'Something went wrong. Please try again.');
}
