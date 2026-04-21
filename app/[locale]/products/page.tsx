import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { listActiveProducts, type ProductSort } from '@/lib/catalog/queries';
import { ProductCard } from '@/components/catalog/product-card';
import { resolveViewerPrices } from '@/lib/pricing/storefront';

// Sprint 7: catalog pages render dynamically so B2B tier prices show
// correctly per-viewer. Guest / B2C renders identically fast either way
// (Postgres hot cache), and B2B is where the per-request rendering earns
// its keep. Sprint 7 ADR-037.
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

export default async function ProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string; sort?: string }>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const page = parsePage(sp.page);
  const sort = parseSort(sp.sort);
  const isAr = locale === 'ar';
  const t = await getTranslations();

  const { items, total, totalPages } = await listActiveProducts({
    page,
    sort,
  });
  const { priceById } = await resolveViewerPrices(items);

  const sortLabel = (s: ProductSort) =>
    s === 'newest'
      ? isAr
        ? 'الأحدث'
        : 'Newest'
      : s === 'price-asc'
        ? isAr
          ? 'السعر: الأقل أولاً'
          : 'Price: Low to High'
        : isAr
          ? 'السعر: الأعلى أولاً'
          : 'Price: High to Low';

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{t('nav.catalog')}</h1>
          <p className="text-sm text-muted-foreground">
            {isAr ? `${total} منتج` : `${total} products`}
          </p>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {SORTS.map((s) => (
            <Link
              key={s}
              href={{
                pathname: '/products',
                query: { sort: s, page: '1' },
              }}
              className={`rounded border px-3 py-1 ${s === sort ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
            >
              {sortLabel(s)}
            </Link>
          ))}
        </nav>
      </div>

      {items.length === 0 ? (
        <p className="rounded-md border bg-background p-8 text-center text-muted-foreground">
          {isAr ? 'لا توجد منتجات بعد.' : 'No products yet.'}
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
                pathname: '/products',
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
                pathname: '/products',
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
