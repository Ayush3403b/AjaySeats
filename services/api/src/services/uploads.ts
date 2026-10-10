import crypto from 'node:crypto';
import type { UploadSignature } from '@pcs/shared';
import type { Env } from '../config/env.js';
import { AppError, errors } from '../lib/errors.js';

/** Product images always go to this folder, so the account can be audited and cleaned up. */
export const PRODUCT_IMAGE_FOLDER = 'premium-seat-covers/products';

function cloudinaryConfig(env: Env): { cloudName: string; apiKey: string; apiSecret: string } | null {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET) return null;
  return { cloudName: env.CLOUDINARY_CLOUD_NAME, apiKey: env.CLOUDINARY_API_KEY, apiSecret: env.CLOUDINARY_API_SECRET };
}

/**
 * Signs a direct browser upload. The API secret never leaves the server. Parameters are
 * signed in alphabetical order, as Cloudinary requires.
 */
export function signProductImageUpload(env: Env, nowMs: number = Date.now()): UploadSignature {
  const config = cloudinaryConfig(env);
  if (!config) throw new AppError(501, 'NOT_ENABLED', 'Image uploads are not configured on this server');
  const timestamp = Math.floor(nowMs / 1000);
  const toSign = `folder=${PRODUCT_IMAGE_FOLDER}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(`${toSign}${config.apiSecret}`).digest('hex');
  return {
    cloudName: config.cloudName,
    apiKey: config.apiKey,
    timestamp,
    folder: PRODUCT_IMAGE_FOLDER,
    signature,
  };
}

/** True only for images hosted in this site's configured image account. */
export function isOwnImageUrl(env: Env, url: string): boolean {
  const config = cloudinaryConfig(env);
  if (!config) return false;
  return url.startsWith(`https://res.cloudinary.com/${config.cloudName}/`);
}

export function assertOwnImages(env: Env, urls: string[]): void {
  if (urls.length === 0) return;
  if (!cloudinaryConfig(env)) throw errors.notEnabled('Image uploads');
  const bad = urls.findIndex((u) => !isOwnImageUrl(env, u));
  if (bad !== -1) {
    throw errors.invalid('Some images are not from this site’s image account', [
      { path: `images.${bad}.url`, message: 'Upload the image again from the product form' },
    ]);
  }
}
