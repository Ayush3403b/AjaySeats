import { Router } from 'express';
import { z } from 'zod';
import {
  adminProductListQuerySchema,
  campaignCreateSchema,
  campaignListQuerySchema,
  campaignUpdateSchema,
  customerListQuerySchema,
  customerOptOutSchema,
  inquiryListQuerySchema,
  inquiryNoteSchema,
  inquiryStatusSchema,
  paginationQuerySchema,
  productCreateSchema,
  productUpdateSchema,
} from '@pcs/shared';
import { requireAuth, requireCsrf } from '../middleware/auth.js';
import { errors } from '../lib/errors.js';
import { assertOwnImages, signProductImageUpload } from '../services/uploads.js';
import { getCustomer, listCustomers, setCustomerOptOut } from '../services/customers.js';
import {
  buildRecipientLink,
  createCampaign,
  getCampaign,
  listCampaigns,
  listRecipients,
  markLinkOpened,
  markSentConfirmed,
  prepareCampaign,
  updateCampaign,
} from '../services/campaigns.js';
import {
  createProduct,
  deleteProduct,
  getAdminProduct,
  listAdminProducts,
  setArchived,
  setPublished,
  updateProduct,
} from '../services/products.js';
import {
  appendInquiryNote,
  buildFollowUpLink,
  getInquiry,
  listInquiries,
  updateInquiryStatus,
} from '../services/inquiries.js';
import { idParam } from '../lib/params.js';

/**
 * Every admin route: session required (server-side), CSRF token required for unsafe methods,
 * and responses are never cached. Role checks are added per route where needed.
 */
export const adminRouter = Router();

// Set first so even 401/403 responses are never cached.
adminRouter.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});
adminRouter.use(requireAuth, requireCsrf);

// ---- Products ----
adminRouter.get('/products', async (req, res) => {
  const q = adminProductListQuerySchema.parse(req.query);
  res.json(await listAdminProducts(q));
});

adminRouter.post('/products', async (req, res) => {
  const input = productCreateSchema.parse(req.body);
  assertOwnImages(req.app.locals.env, (input.images ?? []).map((i) => i.url));
  res.status(201).json(await createProduct(input));
});

adminRouter.get('/products/:id', async (req, res) => {
  res.json(await getAdminProduct(idParam(req.params.id)));
});

adminRouter.patch('/products/:id', async (req, res) => {
  const input = productUpdateSchema.parse(req.body);
  if (input.images) assertOwnImages(req.app.locals.env, input.images.map((i) => i.url));
  res.json(await updateProduct(idParam(req.params.id), input));
});

adminRouter.delete('/products/:id', async (req, res) => {
  await deleteProduct(idParam(req.params.id));
  res.status(204).end();
});

adminRouter.patch('/products/:id/publish', async (req, res) => {
  const { published } = z.strictObject({ published: z.boolean() }).parse(req.body);
  res.json(await setPublished(idParam(req.params.id), published));
});

adminRouter.patch('/products/:id/archive', async (req, res) => {
  const { archived } = z.strictObject({ archived: z.boolean() }).parse(req.body);
  res.json(await setArchived(idParam(req.params.id), archived));
});

// ---- Inquiries ----
adminRouter.get('/inquiries', async (req, res) => {
  const query = inquiryListQuerySchema.parse(req.query);
  res.json(await listInquiries(query));
});

adminRouter.get('/inquiries/:id', async (req, res) => {
  res.json(await getInquiry(idParam(req.params.id)));
});

adminRouter.patch('/inquiries/:id/status', async (req, res) => {
  const input = inquiryStatusSchema.parse(req.body);
  res.json(await updateInquiryStatus(idParam(req.params.id), input));
});

adminRouter.patch('/inquiries/:id/notes', async (req, res) => {
  const input = inquiryNoteSchema.parse(req.body);
  const notes = await appendInquiryNote(idParam(req.params.id), input.text, req.auth!.name);
  res.json({ notes });
});

adminRouter.post('/inquiries/:id/whatsapp-link', async (req, res) => {
  res.json(await buildFollowUpLink(idParam(req.params.id)));
});

// ---- Uploads ----
/** Signed parameters for a direct browser upload. Responds 501 when Cloudinary is not configured. */
adminRouter.post('/uploads/signature', (req, res) => {
  res.json(signProductImageUpload(req.app.locals.env));
});

// ---- Customers ----
adminRouter.get('/customers', async (req, res) => {
  res.json(await listCustomers(customerListQuerySchema.parse(req.query)));
});

adminRouter.get('/customers/:id', async (req, res) => {
  res.json(await getCustomer(idParam(req.params.id)));
});

/** Opting out is open to staff. Opting back in is owner-only, because it reverses a customer's request. */
adminRouter.patch('/customers/:id/opt-out', async (req, res) => {
  const input = customerOptOutSchema.parse(req.body);
  if (!input.optedOut && req.auth?.role !== 'owner') throw errors.forbidden();
  res.json(await setCustomerOptOut(idParam(req.params.id), input));
});

// ---- Campaigns ----
adminRouter.get('/campaigns', async (req, res) => {
  res.json(await listCampaigns(campaignListQuerySchema.parse(req.query)));
});

adminRouter.post('/campaigns', async (req, res) => {
  const input = campaignCreateSchema.parse(req.body);
  res.status(201).json(await createCampaign(input, req.auth!.name));
});

adminRouter.get('/campaigns/:id', async (req, res) => {
  res.json(await getCampaign(idParam(req.params.id)));
});

adminRouter.patch('/campaigns/:id', async (req, res) => {
  const input = campaignUpdateSchema.parse(req.body);
  res.json(await updateCampaign(idParam(req.params.id), input));
});

adminRouter.post('/campaigns/:id/prepare', async (req, res) => {
  res.json(await prepareCampaign(idParam(req.params.id)));
});

adminRouter.get('/campaigns/:id/recipients', async (req, res) => {
  const query = paginationQuerySchema.parse(req.query);
  res.json(await listRecipients(idParam(req.params.id), query.page, query.pageSize));
});

adminRouter.post('/campaigns/:id/recipients/:recipientId/link', async (req, res) => {
  res.json(await buildRecipientLink(idParam(req.params.id), idParam(req.params.recipientId)));
});

adminRouter.post('/campaigns/:id/recipients/:recipientId/link-opened', async (req, res) => {
  res.json(await markLinkOpened(idParam(req.params.id), idParam(req.params.recipientId)));
});

adminRouter.post('/campaigns/:id/recipients/:recipientId/sent-confirmed', async (req, res) => {
  res.json(await markSentConfirmed(idParam(req.params.id), idParam(req.params.recipientId), req.auth!.name));
});
