/**
 * Sitemap — product + category + static URLs for both locales.
 *
 * Next.js serves this at `/sitemap.xml` automatically (App Router convention).
 *
 * SEO indexing fixes (2026-05-14, GSC sprint):
 *   - `x-default` hreflang on every entry — Google needed the default fallback
 *     to disambiguate the AR + EN alternates, otherwise it sometimes flagged
 *     them as duplicates with no canonical chosen.
 *   - `lastModified` for static pages uses a deploy-stamp (BUILD_TIME env or
 *     module-load time), NOT `new Date()` per request. Returning "everything
 *     just changed" on every sitemap fetch made the freshness signal useless.
 *   - `images` arrays on product entries surface the product photos to Google
 *     Images (App Router supports `images: string[]` on each sitemap entry).
 *   - Revalidate window bumped 5min → 30min — sitemap content rarely changes
 *     intra-hour and the ISR cache stability is its own freshness signal.
 */
import type { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { listPublishedPosts } from '@/lib/blog/posts';
import { productImageUrl } from '@/lib/storage/paths';

// Sitemap reads the DB — don't attempt static generation at build time
// (build env has no DATABASE_URL). First request populates the ISR cache.
export const dynamic = 'force-dynamic';
export const revalidate = 1800;

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

const LOCALES = ['ar', 'en'] as const;

// Static-page lastModified anchors to module-load time (effectively the
// container start / deploy timestamp). Stays stable across sitemap requests
// within the same deploy, which is what Google wants for freshness signals.
const STATIC_LAST_MODIFIED = new Date();

/** Build a {ar, en, 'x-default'} alternates map. x-default points at AR
 * (the default locale) so Google has a deterministic fallback when picking
 * which language version to canonicalize. */
function bilingualAlternates(path: string): Record<string, string> {
  return {
    ar: `${BASE_URL}/ar${path}`,
    en: `${BASE_URL}/en${path}`,
    'x-default': `${BASE_URL}/ar${path}`,
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, categories] = await Promise.all([
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        brand: { status: 'ACTIVE' },
        category: { status: 'ACTIVE' },
      },
      select: {
        id: true,
        slug: true,
        updatedAt: true,
        images: {
          orderBy: { position: 'asc' },
          take: 4,
          select: { filename: true },
        },
      },
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
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 1,
      alternates: { languages: bilingualAlternates('') },
    });
  }

  // Products list page — second-highest (catalog hub).
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/products`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.9,
      alternates: { languages: bilingualAlternates('/products') },
    });
  }

  // HTML sitemap landing — important crawl-helper page. Indexable so Google
  // discovers all products + categories via plain anchor tags.
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/sitemap`,
      lastModified: STATIC_LAST_MODIFIED,
      changeFrequency: 'daily',
      priority: 0.6,
      alternates: { languages: bilingualAlternates('/sitemap') },
    });
  }

  // Static content pages.
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
        lastModified: STATIC_LAST_MODIFIED,
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
  // Image entries help Google Images discover product photos.
  for (const p of products) {
    const imageUrls = p.images.map(
      (img) => `${BASE_URL}${productImageUrl(p.id, 'medium', img.filename)}`,
    );
    for (const locale of LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}/products/${p.slug}`,
        lastModified: p.updatedAt,
        changeFrequency: 'weekly',
        priority: 0.8,
        alternates: {
          languages: bilingualAlternates(`/products/${p.slug}`),
        },
        images: imageUrls.length > 0 ? imageUrls : undefined,
      });
    }
  }

  // Blog index + each published post.
  for (const locale of LOCALES) {
    entries.push({
      url: `${BASE_URL}/${locale}/blog`,
      lastModified: STATIC_LAST_MODIFIED,
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
