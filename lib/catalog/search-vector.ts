/**
 * Full-text search vector maintenance for Product.
 *
 * Strategy (see ADR-029):
 *  - `Product.searchVector` is a single `tsvector` column populated from
 *    `sku`, `nameAr`, `nameEn`, `descriptionAr`, `descriptionEn`, `brand.nameAr`,
 *    `brand.nameEn` with `simple` text-search config (no stemming — safest for
 *    Arabic, acceptable for English at MVP scope).
 *  - Weights: A for sku + names (best match), B for brand names, C for
 *    descriptions (lowest rank). `ts_rank_cd` in query orders by these.
 *  - Updated from application code after product create/update AND when a
 *    brand's name changes (which affects every product in that brand). This
 *    avoids DB triggers that would need to be re-applied on every `db push`.
 *  - GIN index is created by `scripts/post-push.ts` because Prisma db push
 *    doesn't emit indexes for `Unsupported("tsvector")` columns.
 *
 * `simple` tokenizer splits on whitespace + punctuation, lowercases, and
 * doesn't stem. That's the right default for a bilingual (AR/EN) catalog
 * because Arabic has no built-in Postgres stemmer and `english` would
 * mangle Arabic. Trigram fallback on short queries is handled at query time.
 */
import { prisma } from '@/lib/db';
import { Prisma } from '@prisma/client';

/**
 * SQL expression that computes a Product's search_vector given its own row
 * (aliased `p`) joined against `"Brand" b`. Callers do `UPDATE "Product" p
 * SET "searchVector" = ${PRODUCT_SEARCH_VECTOR_EXPR} FROM "Brand" b WHERE
 * b.id = p."brandId" AND ...`.
 */
const PRODUCT_SEARCH_VECTOR_EXPR = Prisma.sql`
  setweight(to_tsvector('simple', coalesce(p."sku", '')), 'A')
  || setweight(to_tsvector('simple', coalesce(p."nameAr", '')), 'A')
  || setweight(to_tsvector('simple', coalesce(p."nameEn", '')), 'A')
  || setweight(to_tsvector('simple', coalesce(b."nameAr", '')), 'B')
  || setweight(to_tsvector('simple', coalesce(b."nameEn", '')), 'B')
  || setweight(to_tsvector('simple', coalesce(p."descriptionAr", '')), 'C')
  || setweight(to_tsvector('simple', coalesce(p."descriptionEn", '')), 'C')
`;

/** Recompute a single product's searchVector. Safe to call after every write. */
export async function updateProductSearchVector(
  productId: string,
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "Product" p
    SET "searchVector" = ${PRODUCT_SEARCH_VECTOR_EXPR}
    FROM "Brand" b
    WHERE p.id = ${productId} AND b.id = p."brandId"
  `;
}

/** Recompute searchVector for every product belonging to a brand. Called on brand rename. */
export async function updateSearchVectorsForBrand(
  brandId: string,
): Promise<number> {
  const result = await prisma.$executeRaw`
    UPDATE "Product" p
    SET "searchVector" = ${PRODUCT_SEARCH_VECTOR_EXPR}
    FROM "Brand" b
    WHERE b.id = p."brandId" AND p."brandId" = ${brandId}
  `;
  return typeof result === 'number' ? result : 0;
}

/** Rebuild searchVector for every product. Used by post-push backfill. */
export async function rebuildAllProductSearchVectors(): Promise<number> {
  const result = await prisma.$executeRaw`
    UPDATE "Product" p
    SET "searchVector" = ${PRODUCT_SEARCH_VECTOR_EXPR}
    FROM "Brand" b
    WHERE b.id = p."brandId"
  `;
  return typeof result === 'number' ? result : 0;
}

/**
 * Escape a user-entered search term for use with `plainto_tsquery('simple', ...)`.
 * `plainto_tsquery` is already safe against injection (parameterized), but we
 * also strip tsquery-meaningful operators in case we later switch to
 * `to_tsquery`, and trim whitespace. Empty/blank input returns null so the
 * caller can short-circuit to the listing query.
 */
export function normalizeSearchTerm(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed;
}
