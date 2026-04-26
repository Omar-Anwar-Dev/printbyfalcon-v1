/**
 * Storage layout:
 *
 *   {STORAGE_ROOT}/products/{productId}/thumb-{filename}.webp      (200 px)
 *   {STORAGE_ROOT}/products/{productId}/medium-{filename}.webp     (800 px)
 *   {STORAGE_ROOT}/products/{productId}/original-{filename}.webp   (≤1600 px)
 *
 * Public URL: /storage/products/{productId}/{size}-{filename}.webp
 *
 * - Dev: served by `app/api/storage/[...path]/route.ts` (Next.js).
 * - Prod/staging: served by Nginx `location /storage/ { alias /var/pbf/storage/; ... }`
 *   (see `docker/nginx/printbyfalcon.com.conf`). The docker volume is a bind mount
 *   onto the host's `/var/pbf/storage/`, so the app's `/storage` and Nginx's
 *   `/var/pbf/storage` point at the same bytes.
 */
import path from 'node:path';

// Resolved per-call so tests can override STORAGE_ROOT via `process.env`
// after module load, and so a runtime env change (unusual but possible) is
// respected without a restart.
export function storageRoot(): string {
  return process.env.STORAGE_ROOT ?? path.resolve(process.cwd(), 'storage');
}

export const STORAGE_URL_PREFIX = '/storage';

export type ImageSize = 'thumb' | 'medium' | 'original';

export const IMAGE_SIZE_PX: Record<ImageSize, number> = {
  thumb: 200,
  medium: 800,
  original: 1600,
};

function productDir(productId: string): string {
  return path.join(storageRoot(), 'products', productId);
}

export function productImageDiskPath(
  productId: string,
  size: ImageSize,
  filename: string,
): string {
  return path.join(productDir(productId), `${size}-${filename}.webp`);
}

export function productImageUrl(
  productId: string,
  size: ImageSize,
  filename: string,
): string {
  return `${STORAGE_URL_PREFIX}/products/${productId}/${size}-${filename}.webp`;
}

export function productImageDir(productId: string): string {
  return productDir(productId);
}

/**
 * Brand assets (Sprint 9 S9-D6-T1) — store logo for invoice header + future
 * favicon. Flat directory, single filename per asset, served by Nginx at
 * `/storage/brand/<filename>.webp`.
 */
export function brandAssetDir(): string {
  return path.join(storageRoot(), 'brand');
}

export function brandAssetDiskPath(filename: string): string {
  return path.join(brandAssetDir(), filename);
}

export function brandAssetUrl(filename: string): string {
  return `${STORAGE_URL_PREFIX}/brand/${filename}`;
}

/**
 * Catalog brand logos — one file per Brand entity, shown on the storefront
 * brand rail. Distinct from `brand/` (which is the *store's own* logo).
 */
export function brandLogoDir(): string {
  return path.join(storageRoot(), 'brand-logos');
}

export function brandLogoDiskPath(filename: string): string {
  return path.join(brandLogoDir(), filename);
}

export function brandLogoUrl(filename: string): string {
  return `${STORAGE_URL_PREFIX}/brand-logos/${filename}`;
}

/**
 * Category images — one file per Category, shown on the storefront category
 * rail and the category landing header.
 */
export function categoryImageDir(): string {
  return path.join(storageRoot(), 'category-images');
}

export function categoryImageDiskPath(filename: string): string {
  return path.join(categoryImageDir(), filename);
}

export function categoryImageUrl(filename: string): string {
  return `${STORAGE_URL_PREFIX}/category-images/${filename}`;
}

/**
 * Resolve a public URL path (e.g. "products/abc/thumb-xyz.webp") to an absolute
 * disk path, with traversal protection. Returns null if the requested path
 * escapes STORAGE_ROOT or isn't in one of the publicly-served subtrees.
 */
const PUBLIC_STORAGE_SUBTREES = [
  'products/',
  'brand/',
  'brand-logos/',
  'category-images/',
];

export function safeResolveStoragePath(publicPath: string): string | null {
  const normalized = path.posix.normalize(publicPath).replace(/^\/+/, '');
  if (normalized.startsWith('..') || normalized.includes('\0')) return null;

  // Only expose the allowlisted subtrees publicly. Invoices (future) get a
  // separate gate with auth checks.
  if (!PUBLIC_STORAGE_SUBTREES.some((p) => normalized.startsWith(p))) {
    return null;
  }

  const root = storageRoot();
  const abs = path.resolve(root, normalized);
  const rootAbs = path.resolve(root);
  if (!abs.startsWith(rootAbs + path.sep) && abs !== rootAbs) return null;
  return abs;
}
