/**
 * Catalog search — FTS-driven product lookup used by both the header
 * autocomplete (top-5 suggestions) and the `/search` results page.
 *
 * Strategy (matches ADR-029):
 *  - Primary: `plainto_tsquery('simple', $q) @@ "searchVector"` ordered by
 *    `ts_rank_cd("searchVector", plainto_tsquery('simple', $q)) DESC`.
 *  - Fallback on short queries (<3 chars) or zero FTS hits: trigram / ILIKE
 *    match against `sku`, `nameAr`, `nameEn`. Trigram GIN indexes are created
 *    by scripts/post-push.ts.
 *
 * Note on raw SQL — Prisma doesn't model tsvector/ts_rank natively, so this
 * module uses `$queryRaw` with `Prisma.sql` template tags to stay injection-safe.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { productImageUrl } from '@/lib/storage/paths';
import type { ProductListItem } from '@/lib/catalog/queries';
import { normalizeSearchTerm } from '@/lib/catalog/search-vector';
import { getStockStatus } from '@/lib/catalog/stock';
import { getGlobalLowStockThreshold } from '@/lib/settings/inventory';

export type SearchSort = 'relevance' | 'newest' | 'price-asc' | 'price-desc';

type RawSuggestRow = {
  id: string;
  slug: string;
  sku: string;
  name_ar: string;
  name_en: string;
  base_price_egp: string;
  image_filename: string | null;
};

export type SearchSuggestion = {
  id: string;
  slug: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  basePriceEgp: string;
  primaryImageUrl: string | null;
};

/** Short queries bypass tsvector (tokenizer won't split single chars usefully) and go straight to trigram/ILIKE. */
const TRIGRAM_FALLBACK_THRESHOLD = 3;

/** Max header-dropdown suggestions. */
const DEFAULT_SUGGEST_LIMIT = 5;

/** Cap the result-page query size so a degenerate query can't crater the DB. */
const MAX_SEARCH_LIMIT = 100;

/**
 * Header-autocomplete suggestions. Returns up to `limit` active products
 * with their primary image URL. Short/empty queries return []; callers
 * short-circuit before showing the dropdown.
 */
export async function searchProductSuggestions(
  rawQ: string | null | undefined,
  limit: number = DEFAULT_SUGGEST_LIMIT,
): Promise<SearchSuggestion[]> {
  const q = normalizeSearchTerm(rawQ);
  if (!q) return [];
  const take = Math.max(1, Math.min(limit, DEFAULT_SUGGEST_LIMIT * 2));
  const rows = await runSuggestQuery(q, take);
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    sku: r.sku,
    nameAr: r.name_ar,
    nameEn: r.name_en,
    basePriceEgp: r.base_price_egp,
    primaryImageUrl: r.image_filename
      ? productImageUrl(r.id, 'thumb', r.image_filename)
      : null,
  }));
}

async function runSuggestQuery(
  q: string,
  limit: number,
): Promise<RawSuggestRow[]> {
  // For very short queries, trigram / ILIKE is more forgiving than tsvector
  // (which drops single-char tokens). For 3+ chars, rank by ts_rank_cd then
  // fall back to ILIKE only if the FTS query returned 0 rows.
  if (q.length < TRIGRAM_FALLBACK_THRESHOLD) {
    return suggestByIlike(q, limit);
  }
  const ranked = await suggestByFts(q, limit);
  if (ranked.length > 0) return ranked;
  return suggestByIlike(q, limit);
}

async function suggestByFts(
  q: string,
  limit: number,
): Promise<RawSuggestRow[]> {
  return prisma.$queryRaw<RawSuggestRow[]>`
    SELECT
      p.id,
      p.slug,
      p.sku,
      p."nameAr" AS name_ar,
      p."nameEn" AS name_en,
      p."basePriceEgp"::text AS base_price_egp,
      (
        SELECT img.filename FROM "ProductImage" img
        WHERE img."productId" = p.id
        ORDER BY img.position ASC
        LIMIT 1
      ) AS image_filename
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE p.status = 'ACTIVE'
      AND b.status = 'ACTIVE'
      AND c.status = 'ACTIVE'
      AND p."searchVector" @@ plainto_tsquery('simple', ${q})
    ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('simple', ${q})) DESC,
             p."createdAt" DESC
    LIMIT ${limit}
  `;
}

async function suggestByIlike(
  q: string,
  limit: number,
): Promise<RawSuggestRow[]> {
  const pattern = `%${q.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`;
  return prisma.$queryRaw<RawSuggestRow[]>`
    SELECT
      p.id,
      p.slug,
      p.sku,
      p."nameAr" AS name_ar,
      p."nameEn" AS name_en,
      p."basePriceEgp"::text AS base_price_egp,
      (
        SELECT img.filename FROM "ProductImage" img
        WHERE img."productId" = p.id
        ORDER BY img.position ASC
        LIMIT 1
      ) AS image_filename
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE p.status = 'ACTIVE'
      AND b.status = 'ACTIVE'
      AND c.status = 'ACTIVE'
      AND (
        p.sku ILIKE ${pattern}
        OR p."nameAr" ILIKE ${pattern}
        OR p."nameEn" ILIKE ${pattern}
      )
    ORDER BY p."createdAt" DESC
    LIMIT ${limit}
  `;
}

/** Filters accepted by `searchProducts`. Each field is optional. */
export type SearchFilters = {
  brandIds?: string[];
  categoryIds?: string[];
  authenticity?: 'GENUINE' | 'COMPATIBLE';
  priceMin?: number;
  priceMax?: number;
  inStockOnly?: boolean;
  printerModelId?: string;
};

export type PrinterMatch = {
  id: string;
  slug: string;
  modelName: string;
  brandId: string;
  brandNameAr: string;
  brandNameEn: string;
};

/**
 * Fuzzy-match a free-text term against PrinterModel. Used to promote
 * "consumables for this printer" suggestions on top of product hits.
 * Matching: trigram similarity against "brand.nameEn + ' ' + modelName" and
 * against modelName alone. Empty/short queries return null.
 */
export async function detectPrinterModel(
  rawQ: string | null | undefined,
): Promise<PrinterMatch | null> {
  const q = normalizeSearchTerm(rawQ);
  if (!q || q.length < 3) return null;
  const rows = await prisma.$queryRaw<
    {
      id: string;
      slug: string;
      model_name: string;
      brand_id: string;
      brand_name_ar: string;
      brand_name_en: string;
      similarity: number;
    }[]
  >`
    SELECT
      pm.id,
      pm.slug,
      pm."modelName" AS model_name,
      b.id AS brand_id,
      b."nameAr" AS brand_name_ar,
      b."nameEn" AS brand_name_en,
      GREATEST(
        similarity(pm."modelName", ${q}),
        similarity(b."nameEn" || ' ' || pm."modelName", ${q}),
        similarity(b."nameAr" || ' ' || pm."modelName", ${q})
      ) AS similarity
    FROM "PrinterModel" pm
    JOIN "Brand" b ON b.id = pm."brandId"
    WHERE pm.status = 'ACTIVE' AND b.status = 'ACTIVE'
      AND (
        pm."modelName" ILIKE ${'%' + q + '%'}
        OR (b."nameEn" || ' ' || pm."modelName") ILIKE ${'%' + q + '%'}
        OR (b."nameAr" || ' ' || pm."modelName") ILIKE ${'%' + q + '%'}
        OR similarity(pm."modelName", ${q}) > 0.35
      )
    ORDER BY similarity DESC, pm."modelName" ASC
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    modelName: row.model_name,
    brandId: row.brand_id,
    brandNameAr: row.brand_name_ar,
    brandNameEn: row.brand_name_en,
  };
}

type RawSearchRow = RawSuggestRow & {
  rank: number | null;
  current_qty: number;
  low_stock_threshold: number | null;
};

export type SearchResultItem = ProductListItem & { rank: number | null };

export type SearchResult = {
  items: SearchResultItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  sort: SearchSort;
  q: string | null;
  usedFallback: boolean;
};

/**
 * Full search results page query. Handles FTS, filters, sort, and pagination.
 * Returns the same ProductListItem shape as `listActiveProducts` so the
 * existing `ProductCard` renders results unchanged.
 */
export async function searchProducts({
  q: rawQ,
  filters = {},
  sort = 'relevance',
  page = 1,
  pageSize = 20,
}: {
  q?: string | null;
  filters?: SearchFilters;
  sort?: SearchSort;
  page?: number;
  pageSize?: number;
}): Promise<SearchResult> {
  const q = normalizeSearchTerm(rawQ);
  const clampedPageSize = Math.max(1, Math.min(pageSize, MAX_SEARCH_LIMIT));
  const clampedPage = Math.max(1, page);
  const offset = (clampedPage - 1) * clampedPageSize;

  // `inStockOnly` is a no-op until Sprint 6 wires real inventory. We still
  // accept it on the filter payload so UI can ship now and backend can swap
  // in an EXISTS clause against `Inventory` without an API change.
  const filterClauses = buildFilterClauses(filters);

  // Decide matcher: FTS for 3+ chars, ILIKE fallback for 0-2 chars or when
  // the FTS branch returned no rows.
  let matcher: Prisma.Sql | null = null;
  let rankExpr: Prisma.Sql | null = null;
  let usedFallback = false;

  if (q && q.length >= TRIGRAM_FALLBACK_THRESHOLD) {
    matcher = Prisma.sql`p."searchVector" @@ plainto_tsquery('simple', ${q})`;
    rankExpr = Prisma.sql`ts_rank_cd(p."searchVector", plainto_tsquery('simple', ${q}))`;
  } else if (q) {
    matcher = ilikeMatcher(q);
    usedFallback = true;
  }

  const orderBy = orderByFor(sort, rankExpr);

  const [rows, total, fallbackUsed] = await runSearch({
    q,
    matcher,
    rankExpr,
    filterClauses,
    orderBy,
    offset,
    limit: clampedPageSize,
    usedFallback,
  });

  const items: SearchResultItem[] = await hydrateRows(rows);

  return {
    items,
    total,
    page: clampedPage,
    pageSize: clampedPageSize,
    totalPages: Math.max(1, Math.ceil(total / clampedPageSize)),
    sort,
    q,
    usedFallback: fallbackUsed,
  };
}

function ilikeMatcher(q: string): Prisma.Sql {
  const pattern = `%${q.replace(/[%_\\]/g, (ch) => `\\${ch}`)}%`;
  return Prisma.sql`(p.sku ILIKE ${pattern} OR p."nameAr" ILIKE ${pattern} OR p."nameEn" ILIKE ${pattern})`;
}

function buildFilterClauses(filters: SearchFilters): Prisma.Sql[] {
  const clauses: Prisma.Sql[] = [];
  if (filters.brandIds && filters.brandIds.length > 0) {
    clauses.push(Prisma.sql`p."brandId" IN (${Prisma.join(filters.brandIds)})`);
  }
  if (filters.categoryIds && filters.categoryIds.length > 0) {
    clauses.push(
      Prisma.sql`p."categoryId" IN (${Prisma.join(filters.categoryIds)})`,
    );
  }
  if (filters.authenticity) {
    clauses.push(
      Prisma.sql`p.authenticity = ${filters.authenticity}::"Authenticity"`,
    );
  }
  if (filters.priceMin != null) {
    clauses.push(Prisma.sql`p."basePriceEgp" >= ${filters.priceMin}`);
  }
  if (filters.priceMax != null) {
    clauses.push(Prisma.sql`p."basePriceEgp" <= ${filters.priceMax}`);
  }
  if (filters.printerModelId) {
    clauses.push(Prisma.sql`EXISTS (
      SELECT 1 FROM "ProductCompatibility" pc
      WHERE pc."productId" = p.id AND pc."printerModelId" = ${filters.printerModelId}
    )`);
  }
  // inStockOnly is tracked in Sprint 6 — placeholder (always true) for now.
  return clauses;
}

function orderByFor(sort: SearchSort, rankExpr: Prisma.Sql | null): Prisma.Sql {
  switch (sort) {
    case 'price-asc':
      return Prisma.sql`p."basePriceEgp" ASC, p."createdAt" DESC`;
    case 'price-desc':
      return Prisma.sql`p."basePriceEgp" DESC, p."createdAt" DESC`;
    case 'newest':
      return Prisma.sql`p."createdAt" DESC`;
    case 'relevance':
    default:
      return rankExpr
        ? Prisma.sql`${rankExpr} DESC, p."createdAt" DESC`
        : Prisma.sql`p."createdAt" DESC`;
  }
}

async function runSearch({
  q,
  matcher,
  rankExpr,
  filterClauses,
  orderBy,
  offset,
  limit,
  usedFallback,
}: {
  q: string | null;
  matcher: Prisma.Sql | null;
  rankExpr: Prisma.Sql | null;
  filterClauses: Prisma.Sql[];
  orderBy: Prisma.Sql;
  offset: number;
  limit: number;
  usedFallback: boolean;
}): Promise<[RawSearchRow[], number, boolean]> {
  const primary = await execSearch({
    matcher,
    rankExpr,
    filterClauses,
    orderBy,
    offset,
    limit,
  });

  // Zero FTS hits on a 3+ char query → retry with ILIKE fallback so the user
  // doesn't land on an empty page when the tokenizer missed (e.g. partial words).
  if (q && !usedFallback && primary.rows.length === 0 && primary.total === 0) {
    const fallback = await execSearch({
      matcher: ilikeMatcher(q),
      rankExpr: null,
      filterClauses,
      orderBy: Prisma.sql`p."createdAt" DESC`,
      offset,
      limit,
    });
    return [fallback.rows, fallback.total, true];
  }
  return [primary.rows, primary.total, usedFallback];
}

async function execSearch({
  matcher,
  rankExpr,
  filterClauses,
  orderBy,
  offset,
  limit,
}: {
  matcher: Prisma.Sql | null;
  rankExpr: Prisma.Sql | null;
  filterClauses: Prisma.Sql[];
  orderBy: Prisma.Sql;
  offset: number;
  limit: number;
}): Promise<{ rows: RawSearchRow[]; total: number }> {
  const whereParts: Prisma.Sql[] = [
    Prisma.sql`p.status = 'ACTIVE'`,
    Prisma.sql`b.status = 'ACTIVE'`,
    Prisma.sql`c.status = 'ACTIVE'`,
  ];
  if (matcher) whereParts.push(matcher);
  for (const clause of filterClauses) whereParts.push(clause);
  const whereSql = Prisma.join(whereParts, ' AND ');

  const rankSelect = rankExpr
    ? Prisma.sql`${rankExpr}`
    : Prisma.sql`NULL::float`;

  const rowsPromise = prisma.$queryRaw<RawSearchRow[]>`
    SELECT
      p.id,
      p.slug,
      p.sku,
      p."nameAr" AS name_ar,
      p."nameEn" AS name_en,
      p."basePriceEgp"::text AS base_price_egp,
      p.authenticity::text AS authenticity,
      b.id AS brand_id,
      b."nameAr" AS brand_name_ar,
      b."nameEn" AS brand_name_en,
      b.slug AS brand_slug,
      c.id AS category_id,
      c."nameAr" AS category_name_ar,
      c."nameEn" AS category_name_en,
      c.slug AS category_slug,
      (
        SELECT img.filename FROM "ProductImage" img
        WHERE img."productId" = p.id
        ORDER BY img.position ASC
        LIMIT 1
      ) AS image_filename,
      COALESCE(inv."currentQty", 0)::int AS current_qty,
      inv."lowStockThreshold" AS low_stock_threshold,
      ${rankSelect} AS rank
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    JOIN "Category" c ON c.id = p."categoryId"
    LEFT JOIN "Inventory" inv ON inv."productId" = p.id
    WHERE ${whereSql}
    ORDER BY ${orderBy}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const totalPromise = prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*)::bigint AS total
    FROM "Product" p
    JOIN "Brand" b ON b.id = p."brandId"
    JOIN "Category" c ON c.id = p."categoryId"
    WHERE ${whereSql}
  `;

  const [rows, totalRows] = await Promise.all([rowsPromise, totalPromise]);
  const total = totalRows[0] ? Number(totalRows[0].total) : 0;
  return { rows, total };
}

async function hydrateRows(rows: RawSearchRow[]): Promise<SearchResultItem[]> {
  const globalThreshold = await getGlobalLowStockThreshold();
  return rows.map((r) => {
    const row = r as RawSearchRow & {
      authenticity: 'GENUINE' | 'COMPATIBLE';
      brand_name_ar: string;
      brand_name_en: string;
      brand_slug: string;
      category_name_ar: string;
      category_name_en: string;
      category_slug: string;
    };
    return {
      id: row.id,
      slug: row.slug,
      sku: row.sku,
      nameAr: row.name_ar,
      nameEn: row.name_en,
      basePriceEgp: row.base_price_egp,
      authenticity: row.authenticity,
      primaryImageUrl: row.image_filename
        ? productImageUrl(row.id, 'medium', row.image_filename)
        : null,
      brand: {
        nameAr: row.brand_name_ar,
        nameEn: row.brand_name_en,
        slug: row.brand_slug,
      },
      category: {
        nameAr: row.category_name_ar,
        nameEn: row.category_name_en,
        slug: row.category_slug,
      },
      stockStatus: getStockStatus(
        {
          status: 'ACTIVE',
          inventory: {
            currentQty: Number(row.current_qty ?? 0),
            lowStockThreshold: row.low_stock_threshold ?? null,
          },
        },
        globalThreshold,
      ),
      rank: row.rank,
    };
  });
}
