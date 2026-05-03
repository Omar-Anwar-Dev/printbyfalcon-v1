/**
 * Sitemap — product + category + static URLs for both locales.
 *
 * Next.js serves this at `/sitemap.xml` automatically (App Router convention).
 * Results are ISR-cached with a 5-min revalidate to match the rest of the
 * storefront.
 *
 * Sprint 13 enhancements:
 *   - hreflang alternates on every entry (Google pairs AR + EN URLs).
 *   - /faq + /privacy + /terms + /cookies + /contact + /feedback included.
 *   - Static pages get explicit lastModified = now (helps freshness signal).
 */
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { listPublishedPosts } from '@/lib/blog/posts';

// Sitemap reads the DB — don't attempt static generation at build time
// (build env has no DATABASE_URL). First request populates the ISR cache.
export const dynamic = 'force-dynamic';
export const revalidate = 300;

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

const LOCALES = ['ar', 'en'] as const;

/** Build a {ar, en} alternates map for a path that's the same in both locales. */
function bilingualAlternates(path: string): Record<string, string> {
  return {
    ar: `${BASE_URL}/ar${path}`,
    en: `${BASE_URL}/en${path}`,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
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

  const entries: MetadataRoute.Sitemap = [];

  // Homepage — highest priority.
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
      alternates: { languages: bilingualAlternates('') },
    });
  }

  // Products list page — second-highest (catalog hub).
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/products`,
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 0.9,
      alternates: { languages: bilingualAlternates('/products') },
    });
  }

  // Static content pages (Sprint 13: includes /faq + /feedback).
  const staticPages = [
    { path: '/faq', priority: 0.7, freq: 'monthly' as const },
    { path: '/feedback', priority: 0.5, freq: 'monthly' as const },
    { path: '/contact', priority: 0.5, freq: 'monthly' as const },
    { path: '/shipping', priority: 0.5, freq: 'monthly' as const },
    { path: '/returns', priority: 0.5, freq: 'monthly' as const },
    { path: '/privacy', priority: 0.3, freq: 'yearly' as const },
    { path: '/terms', priority: 0.3, freq: 'yearly' as const },
    { path: '/cookies', priority: 0.3, freq: 'yearly' as const },
  ];
  for (const sp of staticPages) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${sp.path}`,
        lastModified: now,
        changeFrequency: sp.freq,
        priority: sp.priority,
        alternates: { languages: bilingualAlternates(sp.path) },
      });
    }
  }

  // Categories — daily change, priority 0.7.
  for (const c of categories) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/categories/${c.slug}`,
        lastModified: c.updatedAt,
        changeFrequency: 'daily',
        priority: 0.7,
        alternates: {
          languages: bilingualAlternates(`/categories/${c.slug}`),
        },
      });
    }
  }

  // Products — weekly change, priority 0.8 (these are the conversion pages).
  for (const p of products) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: bilingualAlternates(`/products/${p.slug}`),
        },
      });
    }
  }

  // Blog — index + each published post (Sprint 13 content marketing).
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.6,
      alternates: { languages: bilingualAlternates('/blog') },
    });
  }
  for (const post of listPublishedPosts()) {
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/blog/${post.slug}`,
        lastModified: new Date(post.updatedAt),
        changeFrequency: 'monthly',
        priority: 0.6,
        alternates: {
          languages: bilingualAlternates(`/blog/${post.slug}`),
        },
      });
    }
  }

  return entries;
}
