import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mkdir, rm, stat } from 'node:fs/promises';
import sharp from 'sharp';
import {
  ImageUploadError,
  processProductImage,
} from './images';
import { productImageDiskPath, storageRoot } from './paths';

// STORAGE_ROOT is set in vitest.config.ts to a tmp/ subdir so runs are hermetic.
const TEST_STORAGE_ROOT = storageRoot();

async function makeSamplePng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1000,
      height: 750,
      channels: 3,
      background: { r: 200, g: 50, b: 50 },
    },
  })
    .png()
    .toBuffer();
}

describe('processProductImage', () => {
  const productId = 'test-product-id';

  beforeAll(async () => {
    await rm(TEST_STORAGE_ROOT, { recursive: true, force: true }).catch(
      () => {},
    );
    await mkdir(TEST_STORAGE_ROOT, { recursive: true });
  });

  afterAll(async () => {
    // Best-effort cleanup. Windows AV can hold freshly-written files briefly;
    // we don't block the test run on it — the next `beforeAll` wipes anyway.
    void rm(TEST_STORAGE_ROOT, { recursive: true, force: true }).catch(
      () => {},
    );
  });

  it('produces thumb + medium + original WebP variants', async () => {
    const input = await makeSamplePng();
    const result = await processProductImage(productId, input);

    expect(result.filename).toMatch(/^[a-f0-9]{32}$/);
    expect(result.width).toBe(1000);
    expect(result.height).toBe(750);

    for (const size of ['thumb', 'medium', 'original'] as const) {
      const diskPath = productImageDiskPath(productId, size, result.filename);
      const info = await stat(diskPath);
      expect(info.isFile()).toBe(true);
      expect(info.size).toBeGreaterThan(0);

      // Verify each output is actually WebP and the long edge caps at the
      // expected limit (within ±1 px for rounding).
      const outMeta = await sharp(diskPath).metadata();
      expect(outMeta.format).toBe('webp');
      const maxEdge = Math.max(outMeta.width ?? 0, outMeta.height ?? 0);
      const expected = size === 'thumb' ? 200 : size === 'medium' ? 800 : 1000;
      expect(maxEdge).toBeLessThanOrEqual(expected);
    }
  });

  it('rejects empty input', async () => {
    await expect(
      processProductImage(productId, Buffer.alloc(0)),
    ).rejects.toBeInstanceOf(ImageUploadError);
  });

  it('rejects non-image bytes', async () => {
    await expect(
      processProductImage(productId, Buffer.from('not an image')),
    ).rejects.toBeInstanceOf(ImageUploadError);
  });
});
