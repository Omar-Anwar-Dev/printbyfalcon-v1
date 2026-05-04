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
import { Pagination } from '@/components/ui/pagination';
import { resolveViewerPrices } from '@/lib/pricing/storefront';

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

function parseCondition(raw: unknown): 'NEW' | 'USED' | undefined {
  if (raw === 'NEW' || raw === 'USED') return raw;
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
  const condition = parseCondition(sp.condition);
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
        condition,
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
  const { priceById } = await resolveViewerPrices(items);

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
    ...(condition ? { condition } : {}),
    ...(priceMin != null ? { priceMin: String(priceMin) } : {}),
    ...(priceMax != null ? { priceMax: String(priceMax) } : {}),
    ...(inStockOnly ? { inStock: '1' } : {}),
  };

  return (
    <main className="container-page py-10 md:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-accent-strong">
          {pinnedPrinter
            ? isAr
              ? 'طابعة محددة'
              : 'Pinned printer'
            : isAr
              ? 'البحث'
              : 'Search'}
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
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
        <p className="mt-1.5 text-sm text-muted-foreground">
          <span className="num">{total}</span>{' '}
          {isAr ? 'نتيجة' : total === 1 ? 'result' : 'results'}
          {usedFallback ? (
            <span className="ms-2 inline-flex items-center rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning">
              {isAr ? 'تطابق جزئي' : 'Partial match'}
            </span>
          ) : null}
        </p>
        {detectedPrinter && !pinnedPrinter ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent-soft p-4 text-sm">
            <p className="text-foreground">
              {isAr
                ? `هل كنت تبحث عن مستلزمات `
                : `Looking for consumables for `}
              <span className="font-semibold">
                {isAr
                  ? `${detectedPrinter.brandNameAr} ${detectedPrinter.modelName}`
                  : `${detectedPrinter.brandNameEn} ${detectedPrinter.modelName}`}
              </span>
              {isAr ? '؟' : '?'}
            </p>
            <Link
              href={{
                pathname: '/search',
                query: { printer: detectedPrinter.slug },
              }}
              className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent-strong"
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
            condition,
            priceMin,
            priceMax,
            inStockOnly,
          }}
          activeFilterCount={
            brandIds.length +
            categoryIds.length +
            (authenticity ? 1 : 0) +
            (condition ? 1 : 0) +
            (priceMin != null ? 1 : 0) +
            (priceMax != null ? 1 : 0) +
            (inStockOnly ? 1 : 0)
          }
        />
      </div>

      <div className="grid gap-8 md:grid-cols-[260px_1fr]">
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
              condition,
              priceMin,
              priceMax,
              inStockOnly,
            }}
          />
        </aside>

        <section>
          <nav
            className="mb-5 flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-paper p-1 text-sm"
            aria-label={isAr ? 'ترتيب' : 'Sort'}
          >
            {SORTS.map((s) => {
              if (s === 'relevance' && !hasQuery) return null;
              return (
                <Link
                  key={s}
                  href={{
                    pathname: '/search',
                    query: { ...baseQuery, sort: s, page: '1' },
                  }}
                  className={`inline-flex h-8 items-center rounded px-3 font-medium transition-colors ${
                    s === sort
                      ? 'bg-background text-foreground shadow-card'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {sortLabel(s)}
                </Link>
              );
            })}
          </nav>

          {items.length === 0 ? (
            <EmptyState q={q} isAr={isAr} />
          ) : (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-5">
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
              pathname: '/search',
              query: { ...baseQuery, sort, page: String(p) },
            })}
          />
        </section>
      </div>
    </main>
  );
}

function EmptyState({ q, isAr }: { q: string; isAr: boolean }) {
  const hasQuery = q.trim().length > 0;
  return (
    <div className="rounded-xl border border-border bg-paper p-10 text-center">
      <p className="text-base font-semibold text-foreground">
        {hasQuery
          ? isAr
            ? `لم نجد منتجات مطابقة لـ "${q}"`
            : `No products matched "${q}"`
          : isAr
            ? 'أدخل كلمة للبحث في الكتالوج'
            : 'Enter a term to search the catalog'}
      </p>
      {hasQuery ? (
        <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-start text-sm text-muted-foreground">
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            {isAr
              ? 'جرّب كلمات بحث أقل أو أعم.'
              : 'Try fewer or more general terms.'}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            {isAr
              ? 'ابحث بموديل الطابعة (مثلاً: HP LaserJet M404).'
              : 'Search by printer model (e.g., HP LaserJet M404).'}
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
            {isAr
              ? 'امسح الفلاتر وحاول مجدداً.'
              : 'Clear active filters and try again.'}
          </li>
        </ul>
      ) : null}
    </div>
  );
}
