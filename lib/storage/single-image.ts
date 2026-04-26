/**
 * Single-image upload pipeline — one file per entity (no thumb/medium/original
 * variants like product images get). Used for catalog Brand logos and Category
 * hero images, and is the same shape as `lib/storage/brand.ts` but parametrized
 * over the target directory + max dimension.
 *
 * Behaviour:
 *   - Validates buffer size (default 2 MB, override per-call)
 *   - Sniffs the format with sharp.metadata() and rejects non-image bytes
 *   - SVG is passed through unchanged (sharp can rasterize it but we want to
 *     keep the vector for crisp brand wordmarks at any zoom level)
 *   - Raster formats (jpeg/png/webp/avif/gif) are re-encoded to WebP at the
 *     given max dimension with EXIF stripped — matches the security posture
 *     used elsewhere in lib/storage/.
 *   - Returns the generated filename (caller persists it on the entity row)
 */
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const RASTER_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif', 'gif']);
const SVG_FORMAT = 'svg';
const ALLOWED_FORMATS = new Set([...RASTER_FORMATS, SVG_FORMAT]);

export class SingleImageUploadError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'SingleImageUploadError';
  }
}

export type SingleImageOptions = {
  /** Absolute directory to write the file into. Created if missing. */
  targetDir: string;
  /** Stem prefix for the generated filename (e.g. "logo" → "logo-<uuid>.webp"). */
  filenameStem: string;
  /** Longest-edge target in pixels for raster re-encoding (default 400). */
  maxDimensionPx?: number;
  /** Upload size cap in bytes (default 2 MB). */
  maxBytes?: number;
};

/**
 * Process a buffer into a single image written under `targetDir`. Returns the
 * filename (basename, no leading slash). Throws SingleImageUploadError on any
 * validation failure.
 */
export async function processSingleImage(
  input: Buffer,
  opts: SingleImageOptions,
): Promise<string> {
  const maxBytes = opts.maxBytes ?? 2 * 1024 * 1024;
  const maxDim = opts.maxDimensionPx ?? 400;

  if (input.length === 0) {
    throw new SingleImageUploadError('empty', 'Uploaded file is empty.');
  }
  if (input.length > maxBytes) {
    throw new SingleImageUploadError(
      'too_large',
      `Uploaded file exceeds ${maxBytes} bytes.`,
    );
  }

  const meta = await sharp(input, { failOn: 'error' })
    .metadata()
    .catch((err: unknown) => {
      throw new SingleImageUploadError(
        'unreadable',
        `Unreadable image: ${(err as Error).message}`,
      );
    });
  if (!meta.format || !ALLOWED_FORMATS.has(meta.format)) {
    throw new SingleImageUploadError(
      'unsupported_format',
      `Unsupported image format: ${meta.format ?? 'unknown'}`,
    );
  }

  await mkdir(opts.targetDir, { recursive: true });
  const stem = `${opts.filenameStem}-${randomUUID().replace(/-/g, '')}`;

  // SVG: persist as-is so wordmarks render crisply at any size. Re-encoding
  // would rasterize and lose that property.
  if (meta.format === SVG_FORMAT) {
    const filename = `${stem}.svg`;
    await writeFile(path.join(opts.targetDir, filename), input);
    return filename;
  }

  // Raster: resize fit-inside (no upscaling), strip EXIF, encode to WebP.
  const filename = `${stem}.webp`;
  const buf = await sharp(input, { failOn: 'error' })
    .rotate()
    .resize({
      width: maxDim,
      height: maxDim,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 90 })
    .toBuffer();
  await writeFile(path.join(opts.targetDir, filename), buf);
  return filename;
}

/** Tolerantly remove a single file. Missing file is a no-op. */
export async function deleteSingleImage(diskPath: string): Promise<void> {
  if (!diskPath) return;
  await unlink(diskPath).catch((err: NodeJS.ErrnoException) => {
    if (err.code !== 'ENOENT') throw err;
  });
}
