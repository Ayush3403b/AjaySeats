import { describe, expect, it } from 'vitest';
import { imageFileProblem, isImageHostUrl, MAX_IMAGE_BYTES } from './imageUpload.js';

describe('imageFileProblem', () => {
  it('accepts JPEG, PNG and WebP up to the size limit', () => {
    expect(imageFileProblem({ type: 'image/jpeg', size: 1000 })).toBeNull();
    expect(imageFileProblem({ type: 'image/png', size: MAX_IMAGE_BYTES })).toBeNull();
    expect(imageFileProblem({ type: 'image/webp', size: 10 })).toBeNull();
  });

  it('rejects other types, including SVG which can carry scripts', () => {
    expect(imageFileProblem({ type: 'image/svg+xml', size: 10 })).toBe('typeError');
    expect(imageFileProblem({ type: 'application/pdf', size: 10 })).toBe('typeError');
    expect(imageFileProblem({ type: '', size: 10 })).toBe('typeError');
  });

  it('rejects files over 5 MB', () => {
    expect(imageFileProblem({ type: 'image/jpeg', size: MAX_IMAGE_BYTES + 1 })).toBe('sizeError');
  });
});

describe('isImageHostUrl', () => {
  it('only trusts the image host', () => {
    expect(isImageHostUrl('https://res.cloudinary.com/demo/image/upload/a.jpg')).toBe(true);
    expect(isImageHostUrl('https://evil.example/a.jpg')).toBe(false);
    expect(isImageHostUrl('http://res.cloudinary.com/demo/a.jpg')).toBe(false);
  });
});
