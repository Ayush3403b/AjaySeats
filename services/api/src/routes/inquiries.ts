import { Router } from 'express';
import { inquiryCreateSchema } from '@pcs/shared';
import { createInquiry } from '../services/inquiries.js';
import { AppError } from '../lib/errors.js';
import { log } from '../lib/logger.js';

export const inquiriesRouter = Router();

inquiriesRouter.post('/', async (req, res) => {
  // Honeypot check runs before schema validation so bots get a generic rejection, not a field list.
  const honeypot = (req.body as Record<string, unknown> | undefined)?.website;
  if (typeof honeypot === 'string' && honeypot.length > 0) {
    log('warn', 'honeypot triggered');
    throw new AppError(400, 'SUBMISSION_REJECTED', 'This form could not be accepted. Please try again.');
  }
  const input = inquiryCreateSchema.parse(req.body);
  const receipt = await createInquiry(input);
  res.setHeader('Cache-Control', 'no-store');
  res.status(201).json(receipt);
});
