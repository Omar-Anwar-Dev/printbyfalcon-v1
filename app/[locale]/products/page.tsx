import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/i18n/routing';
import { listActiveProducts, type ProductSort } from '@/lib/catalog/queries';
import { ProductCard } from '@/components/catalog/product-card';
import { Pagination } from '@/components/ui/pagination';
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
    <main className="container-page py-10 md:py-14">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
            {isAr ? 'تصفح' : 'Browse'}
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t('nav.catalog')}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            <span className="num">{total}</span>{' '}
            {isAr
              ? `${total === 1 ? 'منتج' : 'منتج'}`
              : `${total === 1 ? 'product' : 'products'}`}
          </p>
        </div>
        <nav
          aria-label={isAr ? 'ترتيب' : 'Sort'}
          className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-paper p-1 text-sm"
        >
          {SORTS.map((s) => (
            <Link
              key={s}
              href={{
                pathname: '/products',
                query: { sort: s, page: '1' },
              }}
              className={`inline-flex h-8 items-center rounded px-3 font-medium transition-colors ${
                s === sort
                  ? 'bg-background text-foreground shadow-card'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {sortLabel(s)}
            </Link>
          ))}
        </nav>
      </header>

      {items.length === 0 ? (
        <div className="mx-auto max-w-xl rounded-xl border border-border bg-paper p-10 text-center">
          <p className="text-base font-semibold text-foreground">
            {isAr ? 'لا توجد منتجات بعد.' : 'No products yet.'}
          </p>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isAr
              ? 'الكتالوج قيد التحضير. جرّب البحث بموديل طابعتك.'
              : 'The catalog is being populated. Try searching by your printer model.'}
          </p>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5 lg:grid-cols-4">
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

      <Pagination
        page={page}
        totalPages={totalPages}
        locale={isAr ? 'ar' : 'en'}
        hrefForPage={(p) => ({
          pathname: '/products',
          query: { sort, page: String(p) },
        })}
      />
    </main>
  );
}
