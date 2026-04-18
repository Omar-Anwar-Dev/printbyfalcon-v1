/**
 * Sitemap — product + category URLs for both locales.
 *
 * Next.js serves this at `/sitemap.xml` automatically (App Router convention).
 * Results are ISR-cached with a 5-min revalidate to match the rest of the
 * storefront (see `revalidate` export on catalog pages).
 */
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';

// Sitemap reads the DB — don't attempt static generation at build time
// (build env has no DATABASE_URL). First request populates the ISR cache.
export const dynamic = 'force-dynamic';
export const revalidate = 300;

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        brand: { status: 'ACTIVE' },
        category: { status: 'ACTIVE' },
      },
      select: { slug: true, updatedAt: true },
    }),
    prisma.category.findMany({
      where: { status: 'ACTIVE' },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const staticPaths: MetadataRoute.Sitemap = [];
  for (const locale of ['ar', 'en'] as const) {
    staticPaths.push({
      url: `${BASE_URL}/${locale}`,
      changeFrequency: 'daily',
      priority: 1,
    });
    staticPaths.push({
      url: `${BASE_URL}/${locale}/products`,
      changeFrequency: 'hourly',
      priority: 0.9,
    });
  }

  const productPaths: MetadataRoute.Sitemap = [];
  for (const p of products) {
    for (const locale of ['ar', 'en'] as const) {
      productPaths.push({
        url: `${BASE_URL}/${locale}/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
      });
    }
  }

  const categoryPaths: MetadataRoute.Sitemap = [];
  for (const c of categories) {
    for (const locale of ['ar', 'en'] as const) {
      categoryPaths.push({
        url: `${BASE_URL}/${locale}/categories/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'daily',
        priority: 0.7,
      });
    }
  }

  return [...staticPaths, ...categoryPaths, ...productPaths];
}
