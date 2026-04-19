import type { Metadata } from 'next';
import { Link } from '@/lib/i18n/routing';
import {
  detectPrinterModel,
  searchProducts,
  type SearchSort,
} from '@/lib/catalog/search';
import { ProductCard } from '@/components/catalog/product-card';
import { prisma } from '@/lib/db';
import { SearchFiltersSidebar } from '@/components/catalog/search-filters-sidebar';
import { MobileFiltersButton } from '@/components/catalog/mobile-filters-button';

export const dynamic = 'force-dynamic';

const SORTS: SearchSort[] = ['relevance', 'newest', 'price-asc', 'price-desc'];

function parseSort(raw: unknown, hasQuery: boolean): SearchSort {
  if (typeof raw === 'string' && (SORTS as string[]).includes(raw)) {
    return raw as SearchSort;
  }
  return hasQuery ? 'relevance' : 'newest';
}

function parsePage(raw: unknown): number {
  const n = typeof raw === 'string' ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : 1;
}

function parseCsv(raw: unknown): string[] {
  if (!raw) return [];
  const s = Array.isArray(raw) ? raw.join(',') : String(raw);
  return s
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseFloat(raw: unknown): number | undefined {
  const n = typeof raw === 'string' ? Number.parseFloat(raw) : Number.NaN;
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

function parseAuth(raw: unknown): 'GENUINE' | 'COMPATIBLE' | undefined {
  if (raw === 'GENUINE' || raw === 'COMPATIBLE') return raw;
  return undefined;
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';
  const q = typeof sp.q === 'string' ? sp.q : '';
  const title = q
    ? isAr
      ? `نتائج البحث عن "${q}" — برينت باي فالكون`
      : `Search results for "${q}" — Print By Falcon`
    : isAr
      ? 'بحث — برينت باي فالكون'
      : 'Search — Print By Falcon';
  return {
    title,
    robots: { index: false, follow: true }, // noindex on search result pages
  };
}

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;
  const isAr = locale === 'ar';

  const q = typeof sp.q === 'string' ? sp.q : '';
  const hasQuery = q.trim().length > 0;
  const sort = parseSort(sp.sort, hasQuery);
  const page = parsePage(sp.page);
  const brandIds = parseCsv(sp.brand);
  const categoryIds = parseCsv(sp.category);
  const authenticity = parseAuth(sp.auth);
  const priceMin = parseFloat(sp.priceMin);
  const priceMax = parseFloat(sp.priceMax);
  const inStockOnly = sp.inStock === '1';
  const printerSlug = typeof sp.printer === 'string' ? sp.printer : undefined;

  // Resolve printer slug (from URL) OR detect it from free-text query.
  const pinnedPrinter = printerSlug
    ? await prisma.printerModel.findFirst({
        where: { slug: printerSlug, status: 'ACTIVE' },
        include: {
          brand: { select: { id: true, nameAr: true, nameEn: true } },
        },
      })
    : null;
  const detectedPrinter =
    !pinnedPrinter && hasQuery ? await detectPrinterModel(q) : null;

  const printerFilterId = pinnedPrinter?.id;

  const [result, brandsOptions, categoriesOptions] = await Promise.all([
    searchProducts({
      // When filtering by pinned printer, drop the free-text q so we show
      // *all* consumables for that printer, not just text-matched ones.
      q: pinnedPrinter ? null : q,
      filters: {
        brandIds,
        categoryIds,
        authenticity,
        priceMin,
        priceMax,
        inStockOnly,
        printerModelId: printerFilterId,
      },
      sort: pinnedPrinter && sort === 'relevance' ? 'newest' : sort,
      page,
    }),
    prisma.brand.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { nameEn: 'asc' },
      select: { id: true, nameAr: true, nameEn: true },
    }),
    prisma.category.findMany({
      where: { status: 'ACTIVE', parentId: null },
      orderBy: { nameEn: 'asc' },
      select: {
        id: true,
        nameAr: true,
        nameEn: true,
        children: {
          where: { status: 'ACTIVE' },
          orderBy: { nameEn: 'asc' },
          select: { id: true, nameAr: true, nameEn: true },
        },
      },
    }),
  ]);

  const { items, total, totalPages, usedFallback } = result;

  const sortLabel = (s: SearchSort) =>
    s === 'relevance'
      ? isAr
        ? 'الأكثر صلة'
        : 'Most Relevant'
      : s === 'newest'
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

  // Preserve current filter+query state on sort/page links
  const baseQuery: Record<string, string> = {
    ...(hasQuery && !pinnedPrinter ? { q } : {}),
    ...(pinnedPrinter ? { printer: pinnedPrinter.slug } : {}),
    ...(brandIds.length ? { brand: brandIds.join(',') } : {}),
    ...(categoryIds.length ? { category: categoryIds.join(',') } : {}),
    ...(authenticity ? { auth: authenticity } : {}),
    ...(priceMin != null ? { priceMin: String(priceMin) } : {}),
    ...(priceMax != null ? { priceMax: String(priceMax) } : {}),
    ...(inStockOnly ? { inStock: '1' } : {}),
  };

  return (
    <div className="container py-8">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">
          {pinnedPrinter
            ? isAr
              ? `مستلزمات لـ ${pinnedPrinter.brand.nameAr} ${pinnedPrinter.modelName}`
              : `Consumables for ${pinnedPrinter.brand.nameEn} ${pinnedPrinter.modelName}`
            : hasQuery
              ? isAr
                ? `نتائج البحث عن "${q}"`
                : `Results for "${q}"`
              : isAr
                ? 'البحث في الكتالوج'
                : 'Search catalog'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {isAr ? `${total} نتيجة` : `${total} results`}
          {usedFallback ? (
            <span className="ms-2 text-xs italic">
              {isAr ? '(تطابق جزئي)' : '(partial match)'}
            </span>
          ) : null}
        </p>
        {detectedPrinter && !pinnedPrinter ? (
          <div className="mt-3 rounded-md border bg-primary/5 p-3 text-sm">
            <p className="mb-1">
              {isAr
                ? `هل كنت تبحث عن مستلزمات ${detectedPrinter.brandNameAr} ${detectedPrinter.modelName}؟`
                : `Looking for consumables for ${detectedPrinter.brandNameEn} ${detectedPrinter.modelName}?`}
            </p>
            <Link
              href={{
                pathname: '/search',
                query: { printer: detectedPrinter.slug },
              }}
              className="inline-block rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
            >
              {isAr ? 'عرض كل المستلزمات' : 'Show all compatible consumables'}
            </Link>
          </div>
        ) : null}
      </header>

      <div className="mb-3 md:hidden">
        <MobileFiltersButton
          locale={isAr ? 'ar' : 'en'}
          baseQuery={baseQuery}
          sort={sort}
          brands={brandsOptions}
          categories={categoriesOptions}
          selected={{
            brandIds,
            categoryIds,
            authenticity,
            priceMin,
            priceMax,
            inStockOnly,
          }}
          activeFilterCount={
            brandIds.length +
            categoryIds.length +
            (authenticity ? 1 : 0) +
            (priceMin != null ? 1 : 0) +
            (priceMax != null ? 1 : 0) +
            (inStockOnly ? 1 : 0)
          }
        />
      </div>

      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <aside className="hidden md:block">
          <SearchFiltersSidebar
            locale={isAr ? 'ar' : 'en'}
            baseQuery={baseQuery}
            sort={sort}
            brands={brandsOptions}
            categories={categoriesOptions}
            selected={{
              brandIds,
              categoryIds,
              authenticity,
              priceMin,
              priceMax,
              inStockOnly,
            }}
          />
        </aside>

        <section>
          <nav
            className="mb-4 flex flex-wrap gap-2 text-sm"
            aria-label={isAr ? 'ترتيب' : 'Sort'}
          >
            {SORTS.map((s) => {
              // Hide "relevance" if there's no query — it's meaningless.
              if (s === 'relevance' && !hasQuery) return null;
              return (
                <Link
                  key={s}
                  href={{
                    pathname: '/search',
                    query: { ...baseQuery, sort: s, page: '1' },
                  }}
                  className={`rounded border px-3 py-1 ${s === sort ? 'border-primary bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}
                >
                  {sortLabel(s)}
                </Link>
              );
            })}
          </nav>

          {items.length === 0 ? (
            <EmptyState q={q} isAr={isAr} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {items.map((p) => (
                <li key={p.id}>
                  <ProductCard product={p} locale={isAr ? 'ar' : 'en'} />
                </li>
              ))}
            </ul>
          )}

          {totalPages > 1 ? (
            <nav
              className="mt-8 flex items-center justify-center gap-2 text-sm"
              aria-label={isAr ? 'الصفحات' : 'Pagination'}
            >
              {page > 1 ? (
                <Link
                  href={{
                    pathname: '/search',
                    query: { ...baseQuery, sort, page: String(page - 1) },
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
                    pathname: '/search',
                    query: { ...baseQuery, sort, page: String(page + 1) },
                  }}
                  className="rounded border bg-background px-3 py-1 hover:bg-muted"
                >
                  {isAr ? 'التالي ←' : 'Next →'}
                </Link>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function EmptyState({ q, isAr }: { q: string; isAr: boolean }) {
  const hasQuery = q.trim().length > 0;
  return (
    <div className="rounded-md border bg-background p-8 text-center">
      <p className="mb-4 text-lg font-medium">
        {hasQuery
          ? isAr
            ? `لم نجد منتجات مطابقة لـ "${q}"`
            : `No products matched "${q}"`
          : isAr
            ? 'أدخل كلمة للبحث في الكتالوج'
            : 'Enter a term to search the catalog'}
      </p>
      {hasQuery ? (
        <ul className="mx-auto max-w-md list-disc text-start text-sm text-muted-foreground">
          <li className="mb-1">
            {isAr
              ? 'جرب كلمات بحث أقل أو أعم'
              : 'Try fewer or more general terms'}
          </li>
          <li className="mb-1">
            {isAr
              ? 'ابحث برقم موديل الطابعة (مثلاً: HP LaserJet M404)'
              : 'Search by printer model (e.g., HP LaserJet M404)'}
          </li>
          <li>
            {isAr
              ? 'امسح الفلاتر وحاول مجدداً'
              : 'Clear active filters and try again'}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
