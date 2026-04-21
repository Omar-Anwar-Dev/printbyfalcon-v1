import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import {
  getActiveCategoryBySlug,
  listActiveProducts,
  type ProductSort,
} from '@/lib/catalog/queries';
import { ProductCard } from '@/components/catalog/product-card';
import { resolveViewerPrices } from '@/lib/pricing/storefront';

// Dynamic rendering so B2B viewers see tier prices (Sprint 7 ADR-037).
export const dynamic = 'force-dynamic';

const SORTS: ProductSort[] = ['newest', 'price-asc', 'price-desc'];

function parseSort(raw: unknown): ProductSort {
  return typeof raw === 'string' && (SORTS as string[]).includes(raw)
    ? (raw as ProductSort)
    : 'newest';
}
function parsePage(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; locale: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { slug, locale } = await params;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const sort = parseSort(sp.sort);

  const category = await getActiveCategoryBySlug(slug);
  if (!category) notFound();

  const isAr = locale === 'ar';
  const t = await getTranslations();
  const name = isAr ? category.nameAr : category.nameEn;

  const { items, total, totalPages } = await listActiveProducts({
    categoryId: category.id,
    page,
    sort,
  });
  const { priceById } = await resolveViewerPrices(items);

  return (
    <div className="container py-8">
      <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href="/" className="hover:underline">
          {t('nav.home')}
        </Link>
        <span>/</span>
        <Link href="/products" className="hover:underline">
          {t('nav.catalog')}
        </Link>
        <span>/</span>
        {category.parent ? (
          <>
            <Link
              href={`/categories/${category.parent.slug}`}
              className="hover:underline"
            >
              {isAr ? category.parent.nameAr : category.parent.nameEn}
            </Link>
            <span>/</span>
          </>
        ) : null}
        <span className="text-foreground">{name}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{name}</h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? `${total} منتج` : `${total} products`}
          </p>
        </div>
      </div>

      {category.children.length > 0 ? (
        <nav className="mb-6 flex flex-wrap gap-2 text-sm">
          {category.children.map((c) => (
            <Link
              key={c.id}
              href={`/categories/${c.slug}`}
              className="rounded border bg-background px-3 py-1 hover:bg-muted"
            >
              {isAr ? c.nameAr : c.nameEn}
            </Link>
          ))}
        </nav>
      ) : null}

      {items.length === 0 ? (
        <p className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          {isAr
            ? 'لا توجد منتجات في هذا التصنيف بعد.'
            : 'No products in this category yet.'}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <li key={p.id}>
              <ProductCard
                product={p}
                locale={isAr ? 'ar' : 'en'}
                finalPriceEgp={priceById.get(p.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 ? (
        <nav className="mt-8 flex items-center justify-center gap-2 text-sm">
          {page > 1 ? (
            <Link
              href={{
                pathname: `/categories/${slug}`,
                query: { sort, page: String(page - 1) },
              }}
              className="rounded border bg-background px-3 py-1 hover:bg-muted"
            >
              {isAr ? '→ السابق' : '← Prev'}
            </Link>
          ) : null}
          <span className="text-muted-foreground">
            {isAr
              ? `صفحة ${page} من ${totalPages}`
              : `Page ${page} of ${totalPages}`}
          </span>
          {page < totalPages ? (
            <Link
              href={{
                pathname: `/categories/${slug}`,
                query: { sort, page: String(page + 1) },
              }}
              className="rounded border bg-background px-3 py-1 hover:bg-muted"
            >
              {isAr ? 'التالي ←' : 'Next →'}
            </Link>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
