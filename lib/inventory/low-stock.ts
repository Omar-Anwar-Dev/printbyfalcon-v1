/**
 * Low-stock query helpers (Sprint 6 S6-D2-T3 + S6-D3-T1).
 *
 * A "low-stock" product is one where `currentQty <= effective threshold`.
 * The effective threshold is the per-SKU override (`Inventory.lowStockThreshold`)
 * when non-null, else the global default (`Setting` key
 * `inventory.lowStockGlobalDefault`, default 5 per Sprint 6 kickoff).
 *
 * We use a single raw-SQL query so Postgres applies the COALESCE inline and we
 * avoid over-fetching rows into the app.
 */
import { prisma } from '@/lib/db';
import { getGlobalLowStockThreshold } from '@/lib/settings/inventory';

export type LowStockRow = {
  productId: string;
  sku: string;
  nameAr: string;
  nameEn: string;
  currentQty: number;
  effectiveThreshold: number;
};

export async function listLowStockProducts(limit = 20): Promise<LowStockRow[]> {
  const globalDefault = await getGlobalLowStockThreshold();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      productId: string;
      sku: string;
      nameAr: string;
      nameEn: string;
      currentQty: number;
      effectiveThreshold: number;
    }>
  >(
    `
      SELECT
        p."id"           AS "productId",
        p."sku"          AS "sku",
        p."nameAr"       AS "nameAr",
        p."nameEn"       AS "nameEn",
        i."currentQty"   AS "currentQty",
        COALESCE(i."lowStockThreshold", $1)::int AS "effectiveThreshold"
      FROM "Product" p
      INNER JOIN "Inventory" i ON i."productId" = p."id"
      WHERE p."status" = 'ACTIVE'
        AND i."currentQty" <= COALESCE(i."lowStockThreshold", $1)
      ORDER BY i."currentQty" ASC, p."sku" ASC
      LIMIT $2
    `,
    globalDefault,
    limit,
  );
  return rows.map((r) => ({
    ...r,
    currentQty: Number(r.currentQty),
    effectiveThreshold: Number(r.effectiveThreshold),
  }));
}

export async function countLowStockProducts(): Promise<number> {
  const globalDefault = await getGlobalLowStockThreshold();
  const rows = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
    `
      SELECT COUNT(*)::bigint AS n
      FROM "Product" p
      INNER JOIN "Inventory" i ON i."productId" = p."id"
      WHERE p."status" = 'ACTIVE'
        AND i."currentQty" <= COALESCE(i."lowStockThreshold", $1)
    `,
    globalDefault,
  );
  return Number(rows[0]?.n ?? 0n);
}
