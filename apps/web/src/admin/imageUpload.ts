/** Client-side checks for product images. The server re-checks the image host, so these are UX only. */

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_PRODUCT_IMAGES = 10;

export type ImageProblem = 'typeError' | 'sizeError';

/** Returns the translation suffix for a problem with the file, or null when it can be uploaded. */
export function imageFileProblem(file: { type: string; size: number }): ImageProblem | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return 'typeError';
  if (file.size > MAX_IMAGE_BYTES) return 'sizeError';
  return null;
}

/** Only images from the configured image host are accepted in the form. */
export function isImageHostUrl(url: string): boolean {
  return url.startsWith('https://res.cloudinary.com/');
}
