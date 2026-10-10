import { Router } from 'express';
import mongoose from 'mongoose';
import { productListQuerySchema, LANGUAGES, CURRENCY } from '@pcs/shared';
import { getPublicProductBySlug, listMaterials, listPublicCategories, listPublicProducts } from '../services/products.js';
import { z } from 'zod';

/** Public catalogue responses may be cached briefly by CDNs. Admin and customer data never are. */
const PUBLIC_CACHE = 'public, max-age=30, stale-while-revalidate=120';

export const publicRouter = Router();

publicRouter.get('/health', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.setHeader('Cache-Control', 'no-store');
  res.status(dbUp ? 200 : 503).json({ status: dbUp ? 'ok' : 'degraded', database: dbUp ? 'up' : 'down', time: new Date().toISOString() });
});

publicRouter.get('/products', async (req, res) => {
  const query = productListQuerySchema.parse(req.query);
  const result = await listPublicProducts(query);
  res.setHeader('Cache-Control', PUBLIC_CACHE);
  res.json(result);
});

publicRouter.get('/products/:slug', async (req, res) => {
  const slug = z.string().min(2).max(80).parse(req.params.slug);
  const product = await getPublicProductBySlug(slug);
  res.setHeader('Cache-Control', PUBLIC_CACHE);
  res.json(product);
});

publicRouter.get('/categories', async (_req, res) => {
  res.setHeader('Cache-Control', PUBLIC_CACHE);
  res.json({ items: await listPublicCategories() });
});

publicRouter.get('/materials', (_req, res) => {
  res.setHeader('Cache-Control', PUBLIC_CACHE);
  res.json({ items: listMaterials() });
});

publicRouter.get('/settings/public', (req, res) => {
  res.setHeader('Cache-Control', PUBLIC_CACHE);
  res.json({
    whatsappNumber: req.app.locals.env.WHATSAPP_NUMBER ?? null,
    currency: CURRENCY,
    languages: LANGUAGES,
  });
});
