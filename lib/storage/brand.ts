/**
 * Brand logo processing (Sprint 9 S9-D6-T1). One WebP, max 400px on the long
 * edge, stripped of EXIF, re-encoded by sharp. Single file per upload with a
 * UUID stem so the filename is cache-busting by design — the admin can see
 * the new logo on invoices immediately without forcing a CDN purge.
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import sharp from 'sharp';
import {
  brandAssetDir,
  brandAssetDiskPath,
} from '@/lib/storage/paths';

const ALLOWED = new Set(['jpeg', 'png', 'webp', 'avif', 'gif', 'svg']);
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB — logos are small.

export class LogoUploadError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'LogoUploadError';
  }
}

export async function processBrandLogo(input: Buffer): Promise<string> {
  if (input.length === 0) {
    throw new LogoUploadError('empty', 'Uploaded logo is empty.');
  }
  if (input.length > MAX_BYTES) {
    throw new LogoUploadError(
      'too_large',
      `Uploaded logo exceeds ${MAX_BYTES} bytes.`,
    );
  }

  const pipeline = sharp(input, { failOn: 'error' });
  const meta = await pipeline.metadata().catch((err: unknown) => {
    throw new LogoUploadError(
      'unreadable',
      `Unreadable logo: ${(err as Error).message}`,
    );
  });
  if (!meta.format || !ALLOWED.has(meta.format)) {
    throw new LogoUploadError(
      'unsupported_format',
      `Unsupported logo format: ${meta.format ?? 'unknown'}`,
    );
  }

  await mkdir(brandAssetDir(), { recursive: true });
  const filename = `logo-${randomUUID().replace(/-/g, '')}.webp`;
  const out = brandAssetDiskPath(filename);

  const buf = await sharp(input, { failOn: 'error' })
    .rotate()
    .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 90 })
    .toBuffer();
  await writeFile(out, buf);
  return filename;
}

export async function deleteBrandLogo(filename: string): Promise<void> {
  if (!filename) return;
  await unlink(brandAssetDiskPath(filename)).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== 'ENOENT') throw err;
  });
}
