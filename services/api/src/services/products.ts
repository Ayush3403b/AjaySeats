import type { QueryFilter, Types } from 'mongoose';
import {
  MATERIAL_META,
  MATERIALS,
  CURRENCY,
  type AdminProduct,
  type Paginated,
  type ProductCreateInput,
  type ProductListQuery,
  type ProductUpdateInput,
  type PublicCategory,
  type PublicProduct,
  type LocalizedText,
} from '@pcs/shared';
import { Product, type ProductAttrs } from '../models/Product.js';
import { Category, type CategoryAttrs } from '../models/Category.js';
import { Inquiry } from '../models/Inquiry.js';
import { AppError, errors } from '../lib/errors.js';
import { escapeRegex } from '../lib/crypto.js';

type PopulatedProduct = Omit<ProductAttrs, 'categoryId'> & {
  _id: Types.ObjectId;
  categoryId: CategoryAttrs & { _id: Types.ObjectId };
  createdAt: Date;
  updatedAt: Date;
};

const text = (t: { en: string; hi?: string | null }): LocalizedText => ({ en: t.en, hi: t.hi ?? '' });

export function toPublicProduct(p: PopulatedProduct): PublicProduct {
  const description = text(p.description);
  return {
    id: String(p._id),
    slug: p.slug,
    sku: p.sku,
    name: text(p.name),
    description,
    category: { id: String(p.categoryId._id), slug: p.categoryId.slug, name: text(p.categoryId.name) },
    material: p.material,
    colours: p.colours.map((c) => ({ name: text(c.name), code: c.code })),
    compatibleVehicles: p.compatibleVehicles.map((v) => ({
      make: v.make,
      model: v.model,
      yearFrom: v.yearFrom,
      ...(v.yearTo !== undefined && v.yearTo !== null ? { yearTo: v.yearTo } : {}),
    })),
    stitching: p.stitching.map(text),
    priceMinor: p.priceMinor,
    salePriceMinor: p.salePriceMinor ?? null,
    currency: CURRENCY,
    availability: p.availability,
    featured: p.featured,
    images: [...p.images]
      .sort((a, b) => a.order - b.order)
      .map((img) => ({ url: img.url, alt: text(img.alt), order: img.order })),
    seo: {
      title: p.seo?.title ? text(p.seo.title) : text(p.name),
      description: p.seo?.description ? text(p.seo.description) : { en: description.en.slice(0, 160), hi: description.hi.slice(0, 160) },
    },
    updatedAt: new Date(p.updatedAt).toISOString(),
  };
}

export function toAdminProduct(p: PopulatedProduct): AdminProduct {
  return {
    ...toPublicProduct(p),
    // publicId is needed by the editor to keep images attached on save. It is not shown publicly.
    images: [...p.images]
      .sort((a, b) => a.order - b.order)
      .map((img) => ({ url: img.url, publicId: img.publicId, alt: text(img.alt), order: img.order })),
    published: p.published,
    archived: p.archived,
    createdAt: new Date(p.createdAt).toISOString(),
  };
}

const POPULATE_CATEGORY = 'slug name description sortOrder active';

/** Public catalogue query. Drafts and archived products are never returned. */
export async function listPublicProducts(query: ProductListQuery): Promise<Paginated<PublicProduct>> {
  const filter: QueryFilter<ProductAttrs> = { published: true, archived: false };

  if (query.q) {
    const rx = { $regex: escapeRegex(query.q), $options: 'i' };
    filter.$or = [{ 'name.en': rx }, { 'name.hi': rx }, { sku: rx }];
  }
  if (query.category) {
    const category = await Category.findOne({ slug: query.category, active: true }).lean();
    if (!category) return emptyPage(query.page, query.pageSize);
    filter.categoryId = category._id;
  }
  if (query.material) filter.material = query.material;
  if (query.colour) filter['colours.code'] = query.colour.toLowerCase();
  if (query.make) filter['compatibleVehicles.make'] = { $regex: `^${escapeRegex(query.make)}$`, $options: 'i' };
  if (query.model) filter['compatibleVehicles.model'] = { $regex: `^${escapeRegex(query.model)}$`, $options: 'i' };
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    filter.effectivePriceMinor = {
      ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
      ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
    };
  }
  if (query.featured) filter.featured = true;

  const sort: Record<string, 1 | -1> =
    query.sort === 'price_asc'
      ? { effectivePriceMinor: 1, _id: 1 }
      : query.sort === 'price_desc'
        ? { effectivePriceMinor: -1, _id: -1 }
        : { createdAt: -1, _id: -1 };

  const skip = (query.page - 1) * query.pageSize;
  const [docs, total] = await Promise.all([
    Product.find(filter).sort(sort).skip(skip).limit(query.pageSize).populate('categoryId', POPULATE_CATEGORY).lean(),
    Product.countDocuments(filter),
  ]);
  return {
    items: (docs as unknown as PopulatedProduct[]).map(toPublicProduct),
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
  };
}

function emptyPage<T>(page: number, pageSize: number): Paginated<T> {
  return { items: [], page, pageSize, total: 0, totalPages: 1 };
}

export async function getPublicProductBySlug(slug: string): Promise<PublicProduct> {
  const doc = await Product.findOne({ slug, published: true, archived: false })
    .populate('categoryId', POPULATE_CATEGORY)
    .lean();
  if (!doc) throw errors.notFound('Product');
  return toPublicProduct(doc as unknown as PopulatedProduct);
}

export async function listPublicCategories(): Promise<PublicCategory[]> {
  const docs = await Category.find({ active: true }).sort({ sortOrder: 1, slug: 1 }).lean();
  return docs.map((c) => ({
    id: String(c._id),
    slug: c.slug,
    name: text(c.name),
    description: text(c.description),
    sortOrder: c.sortOrder,
  }));
}

export function listMaterials() {
  return MATERIALS.map((key) => ({ key, label: MATERIAL_META[key].label, token: MATERIAL_META[key].token }));
}

// ---------- Admin ----------

async function assertCategoryExists(categoryId: string): Promise<void> {
  const exists = await Category.exists({ _id: categoryId });
  if (!exists) throw errors.invalid('Category does not exist', [{ path: 'categoryId', message: 'Unknown category' }]);
}

async function assertUniqueSlugAndSku(slug: string | undefined, sku: string | undefined, excludeId?: string) {
  const or: QueryFilter<ProductAttrs>[] = [];
  if (slug) or.push({ slug });
  if (sku) or.push({ sku: sku.toUpperCase() });
  if (!or.length) return;
  const clash = await Product.findOne({ $or: or, ...(excludeId ? { _id: { $ne: excludeId } } : {}) })
    .select('slug sku')
    .lean();
  if (!clash) return;
  if (slug && clash.slug === slug) throw errors.conflict('SLUG_TAKEN', 'That URL slug is already used by another product');
  throw errors.conflict('SKU_TAKEN', 'That SKU is already used by another product');
}

function normaliseColours<T extends { code: string }>(colours: T[]): T[] {
  return colours.map((c) => ({ ...c, code: c.code.toLowerCase() }));
}

export async function createProduct(input: ProductCreateInput): Promise<AdminProduct> {
  await assertCategoryExists(input.categoryId);
  await assertUniqueSlugAndSku(input.slug, input.sku);
  // Defaults live here (not in the schema) so PATCH can never overwrite stored values with defaults.
  const doc = new Product({
    ...input,
    sku: input.sku.toUpperCase(),
    colours: normaliseColours(input.colours ?? []),
    compatibleVehicles: input.compatibleVehicles ?? [],
    stitching: input.stitching ?? [],
    availability: input.availability ?? 'made_to_order',
    published: input.published ?? false,
    featured: input.featured ?? false,
    salePriceMinor: input.salePriceMinor ?? null,
    seo: input.seo ?? {
      title: input.name,
      description: { en: input.description.en.slice(0, 160), hi: input.description.hi.slice(0, 160) },
    },
  });
  await doc.save();
  return toAdminProduct(await loadPopulated(doc.id));
}

export async function listAdminProducts(params: { page: number; pageSize: number; q?: string; status?: 'published' | 'draft' | 'archived' }) {
  const filter: QueryFilter<ProductAttrs> = {};
  if (params.status === 'archived') filter.archived = true;
  if (params.status === 'published') Object.assign(filter, { published: true, archived: false });
  if (params.status === 'draft') Object.assign(filter, { published: false, archived: false });
  if (params.q) {
    const rx = { $regex: escapeRegex(params.q), $options: 'i' };
    filter.$or = [{ 'name.en': rx }, { 'name.hi': rx }, { sku: rx }, { slug: rx }];
  }
  const [docs, total] = await Promise.all([
    Product.find(filter)
      .sort({ updatedAt: -1, _id: -1 })
      .skip((params.page - 1) * params.pageSize)
      .limit(params.pageSize)
      .populate('categoryId', POPULATE_CATEGORY)
      .lean(),
    Product.countDocuments(filter),
  ]);
  return {
    items: (docs as unknown as PopulatedProduct[]).map(toAdminProduct),
    page: params.page,
    pageSize: params.pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
  };
}

export async function getAdminProduct(id: string): Promise<AdminProduct> {
  return toAdminProduct(await loadPopulated(id));
}

async function loadPopulated(id: string): Promise<PopulatedProduct> {
  const doc = await Product.findById(id).populate('categoryId', POPULATE_CATEGORY).lean();
  if (!doc) throw errors.notFound('Product');
  return doc as unknown as PopulatedProduct;
}

/** Whitelisted update. Re-checks sale < regular against the stored document. */
export async function updateProduct(id: string, input: ProductUpdateInput): Promise<AdminProduct> {
  const doc = await Product.findById(id);
  if (!doc) throw errors.notFound('Product');
  if (input.categoryId) await assertCategoryExists(input.categoryId);
  await assertUniqueSlugAndSku(input.slug, input.sku, id);

  const nextPrice = input.priceMinor ?? doc.priceMinor;
  const nextSale = input.salePriceMinor !== undefined ? input.salePriceMinor : doc.salePriceMinor;
  if (nextSale !== null && nextSale !== undefined && nextSale >= nextPrice) {
    throw errors.invalid('Sale price must be lower than the regular price', [
      { path: 'salePriceMinor', message: 'Sale price must be lower than the regular price' },
    ]);
  }

  const patch = { ...input } as Partial<ProductAttrs> & Record<string, unknown>;
  if (input.sku) patch.sku = input.sku.toUpperCase();
  if (input.colours) patch.colours = normaliseColours(input.colours);
  for (const key of Object.keys(patch)) {
    if (patch[key] === undefined) delete patch[key];
  }
  doc.set(patch);
  await doc.save();
  return toAdminProduct(await loadPopulated(id));
}

export async function setPublished(id: string, published: boolean): Promise<AdminProduct> {
  const doc = await Product.findById(id);
  if (!doc) throw errors.notFound('Product');
  if (published && doc.archived) throw errors.conflict('PRODUCT_ARCHIVED', 'Restore the product before publishing it');
  doc.published = published;
  await doc.save();
  return toAdminProduct(await loadPopulated(id));
}

/** Archive hides a product from the public site and keeps it for inquiry history. */
export async function setArchived(id: string, archived: boolean): Promise<AdminProduct> {
  const doc = await Product.findById(id);
  if (!doc) throw errors.notFound('Product');
  doc.archived = archived;
  if (archived) doc.published = false;
  await doc.save();
  return toAdminProduct(await loadPopulated(id));
}

/** Hard delete only when no inquiry references the product; otherwise the caller must archive. */
export async function deleteProduct(id: string): Promise<void> {
  const doc = await Product.findById(id);
  if (!doc) throw errors.notFound('Product');
  const referenced = await Inquiry.exists({ 'items.product': doc._id });
  if (referenced) {
    throw new AppError(409, 'PRODUCT_REFERENCED', 'This product is referenced by inquiries. Archive it instead.');
  }
  await doc.deleteOne();
}

