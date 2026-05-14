/**
 * HTML sitemap — plain anchor-tag listing of every active product + category
 * + static page. Indexable; linked from the footer. Its job is to give
 * Googlebot a single high-internal-link-density page from which the entire
 * catalog is one hop away.
 *
 * Created 2026-05-14 as part of the GSC indexing fixes (397 URLs discovered
 * but not indexed). Internal links from a single authoritative URL are one
 * of the strongest crawl-budget signals available.
 */
import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 1800;

const BASE_URL =
  process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const isAr = locale === 'ar';
  const title = isAr
    ? 'خريطة الموقع — كل المنتجات والتصنيفات'
    : 'Sitemap — All products and categories';
  const description = isAr
    ? 'فهرس كامل لكل منتجات وتصنيفات برينت باي فالكون: الطابعات، أحبار، تونر، خراطيش.'
    : 'Complete index of every product and category on Print By Falcon: printers, ink, toner, cartridges.';
  return {
    title,
    description,
    alternates: {
      canonical: `${BASE_URL}/${locale}/sitemap`,
      languages: {
        ar: `${BASE_URL}/ar/sitemap`,
        en: `${BASE_URL}/en/sitemap`,
        'x-default': `${BASE_URL}/ar/sitemap`,
      },
    },
  };
}

export default async function HtmlSitemapPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isAr = locale === 'ar';

  const [categories, products, brands] = await Promise.all([
    prisma.category.findMany({
      where: { status: 'ACTIVE' },
      orderBy: [{ parentId: 'asc' }, { position: 'asc' }, { nameEn: 'asc' }],
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        parentId: true,
        _count: { select: { products: { where: { status: 'ACTIVE' } } } },
      },
    }),
    prisma.product.findMany({
      where: {
        status: 'ACTIVE',
        brand: { status: 'ACTIVE' },
        category: { status: 'ACTIVE' },
      },
      orderBy: [{ brand: { nameEn: 'asc' } }, { nameEn: 'asc' }],
      select: {
        id: true,
        slug: true,
        nameAr: true,
        nameEn: true,
        brand: { select: { id: true, nameAr: true, nameEn: true } },
      },
    }),
    prisma.brand.findMany({
      where: { status: 'ACTIVE', products: { some: { status: 'ACTIVE' } } },
      orderBy: { nameEn: 'asc' },
      select: { id: true, slug: true, nameAr: true, nameEn: true },
    }),
  ]);

  // Group products by brand for a tidier listing — same anchor density,
  // human-readable structure.
  const productsByBrand = new Map<string, Array<(typeof products)[number]>>();
  for (const p of products) {
    const arr = productsByBrand.get(p.brand.id) ?? [];
    arr.push(p);
    productsByBrand.set(p.brand.id, arr);
  }

  const staticPages = [
    { path: '/products', labelAr: 'الكتالوج', labelEn: 'Catalog' },
    { path: '/search', labelAr: 'البحث', labelEn: 'Search' },
    { path: '/blog', labelAr: 'المدونة', labelEn: 'Blog' },
    { path: '/faq', labelAr: 'الأسئلة الشائعة', labelEn: 'FAQ' },
    { path: '/shipping', labelAr: 'الشحن والتوصيل', labelEn: 'Shipping' },
    { path: '/returns', labelAr: 'الإرجاع', labelEn: 'Returns' },
    { path: '/contact', labelAr: 'تواصل معنا', labelEn: 'Contact' },
    { path: '/feedback', labelAr: 'ملاحظاتك', labelEn: 'Feedback' },
    {
      path: '/privacy',
      labelAr: 'سياسة الخصوصية',
      labelEn: 'Privacy Policy',
    },
    { path: '/terms', labelAr: 'شروط الخدمة', labelEn: 'Terms of Service' },
    {
      path: '/cookies',
      labelAr: 'سياسة الكوكيز',
      labelEn: 'Cookies Policy',
    },
  ];

  return (
    <main className="container-page py-10 md:py-14">
      <header className="mb-10 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {isAr ? 'فهرس' : 'Index'}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          {isAr ? 'خريطة الموقع' : 'Site Map'}
        </h1>
        <p className="mt-3 text-base text-muted-foreground">
          {isAr
            ? 'كل صفحات الموقع في مكان واحد — التصنيفات، البراندات، المنتجات، والصفحات الثابتة.'
            : 'Every page of the site in one place — categories, brands, products, and static pages.'}
        </p>
      </header>

      {/* Static pages */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {isAr ? 'الصفحات الرئيسية' : 'Main pages'}
        </h2>
        <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
          {staticPages.map((sp) => (
            <li key={sp.path}>
              <Link
                href={sp.path}
                className="text-accent-strong hover:underline"
              >
                {isAr ? sp.labelAr : sp.labelEn}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Categories — tree-flat */}
      <section className="mb-12">
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {isAr ? 'التصنيفات' : 'Categories'}
        </h2>
        <ul className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li
              key={c.id}
              className={c.parentId ? 'ps-4 text-muted-foreground' : ''}
            >
              <Link
                href={`/categories/${c.slug}`}
                className="hover:text-accent-strong hover:underline"
              >
                {isAr ? c.nameAr : c.nameEn}
              </Link>
              <span className="ms-1.5 text-xs text-muted-foreground">
                ({c._count.products})
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* Brands */}
      {brands.length > 0 ? (
        <section className="mb-12">
          <h2 className="mb-4 text-lg font-bold text-foreground">
            {isAr ? 'البراندات' : 'Brands'}
          </h2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {brands.map((b) => (
              <li key={b.id}>
                <Link
                  href={`/products?brand=${b.slug}`}
                  className="inline-flex items-center rounded-md border border-border bg-paper px-3 py-1.5 text-foreground transition-colors hover:border-accent hover:text-accent-strong"
                >
                  {isAr ? b.nameAr : b.nameEn}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Products grouped by brand */}
      <section>
        <h2 className="mb-4 text-lg font-bold text-foreground">
          {isAr ? 'كل المنتجات' : 'All products'}
        </h2>
        <p className="mb-6 text-sm text-muted-foreground">
          <span className="num">{products.length}</span>{' '}
          {isAr ? 'منتج' : products.length === 1 ? 'product' : 'products'}
        </p>
        <div className="space-y-8">
          {brands.map((b) => {
            const list = productsByBrand.get(b.id) ?? [];
            if (list.length === 0) return null;
            return (
              <div key={b.id}>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                  {isAr ? b.nameAr : b.nameEn}
                </h3>
                <ul className="grid grid-cols-1 gap-y-1.5 text-sm sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/products/${p.slug}`}
                        className="text-foreground hover:text-accent-strong hover:underline"
                      >
                        {isAr ? p.nameAr : p.nameEn}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
