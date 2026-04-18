/**
 * Product image processing pipeline.
 *
 * Input: a Buffer of an uploaded image (jpeg/png/webp/avif/gif).
 * Output: three WebP variants on disk (thumb 200px, medium 800px, original ≤1600px),
 * each fit-within (no upscaling), stripped of EXIF metadata, re-encoded by sharp.
 *
 * Security: sharp re-encoding neutralises image-borne payloads. We still sniff
 * the input bytes via sharp's metadata() call and reject anything that isn't
 * a raster image of a supported format.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink, readdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import {
  IMAGE_SIZE_PX,
  productImageDir,
  productImageDiskPath,
  type ImageSize,
} from '@/lib/storage/paths';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif']);
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB — matches NFR §Security

export type ProcessedImage = {
  filename: string; // cuid-style stem; no extension, no "size-" prefix
  width: number;
  height: number;
};

export class ImageUploadError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'ImageUploadError';
  }
}

export async function processProductImage(
  productId: string,
  input: Buffer,
): Promise<ProcessedImage> {
  if (input.length === 0) {
    throw new ImageUploadError('empty', 'Uploaded file is empty.');
  }
  if (input.length > MAX_UPLOAD_BYTES) {
    throw new ImageUploadError(
      'too_large',
      `Uploaded file exceeds ${MAX_UPLOAD_BYTES} bytes.`,
    );
  }

  // sharp probes the input and throws on unreadable bytes — giving us
  // format validation + early rejection of non-images in one call.
  const pipeline = sharp(input, { failOn: 'error' });
  const meta = await pipeline.metadata().catch((err: unknown) => {
    throw new ImageUploadError(
      'unreadable',
      `Unreadable image: ${(err as Error).message}`,
    );
  });
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new ImageUploadError(
      'unsupported_format',
      `Unsupported image format: ${meta.format ?? 'unknown'}`,
    );
  }

  const dir = productImageDir(productId);
  await mkdir(dir, { recursive: true });

  // 32-char hex stem derived from UUID; stable URL contribution without hyphens.
  const filename = randomUUID().replace(/-/g, '');

  // Resize + WebP-encode each variant. `withoutEnlargement: true` keeps small
  // originals at their native size; `fit: 'inside'` preserves aspect ratio.
  for (const size of Object.keys(IMAGE_SIZE_PX) as ImageSize[]) {
    const px = IMAGE_SIZE_PX[size];
    const out = productImageDiskPath(productId, size, filename);
    const buf = await sharp(input, { failOn: 'error' })
      .rotate() // honour EXIF orientation before stripping metadata
      .resize({ width: px, height: px, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: size === 'thumb' ? 75 : 82 })
      .toBuffer();
    await writeFile(out, buf);
  }

  return {
    filename,
    width: meta.width ?? 0,
    height: meta.height ?? 0,
  };
}

/**
 * Delete all three size variants of a product image. Tolerant of missing
 * files (admin may have manually removed one).
 */
export async function deleteProductImageFiles(
  productId: string,
  filename: string,
): Promise<void> {
  for (const size of Object.keys(IMAGE_SIZE_PX) as ImageSize[]) {
    const p = productImageDiskPath(productId, size, filename);
    await unlink(p).catch((err: NodeJS.ErrnoException) => {
      if (err.code !== 'ENOENT') throw err;
    });
  }
}

/**
 * Remove an entire product's image directory. Called from hard-delete flows
 * (not archive). Cascade via prisma handles the ProductImage rows; this
 * cleans the bytes on disk.
 */
export async function deleteProductImageDir(productId: string): Promise<void> {
  const dir = productImageDir(productId);
  const entries = await readdir(dir).catch((err: NodeJS.ErrnoException) => {
    if (err.code === 'ENOENT') return [] as string[];
    throw err;
  });
  await Promise.all(
    entries.map((entry) =>
      unlink(path.join(dir, entry)).catch((err: NodeJS.ErrnoException) => {
        if (err.code !== 'ENOENT') throw err;
      }),
    ),
  );
}

export { MAX_UPLOAD_BYTES };
