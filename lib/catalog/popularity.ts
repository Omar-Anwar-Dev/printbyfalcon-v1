/**
 * Popularity recompute (PR 3, expanded in PR 4).
 *
 * Owner ask: stop ranking listings by `createdAt DESC`. Surface what
 * customers actually engage with — orders first (strongest signal),
 * page views second (broader interest), category context third.
 *
 * Score formula per product (single batch UPDATE, no per-product loop):
 *   score = 5 × Σ order_item.qty for non-cancelled, non-returned orders in last 90d
 *         +     Σ product views in last 90d
 *         + round( (category_orders × 5 + category_product_views + category_views)
 *                  / max_combined_category_signal × 10 )
 *
 * Weighting:
 *   - The 5× multiplier on orders keeps the existing PR-3 rank order
 *     stable for products with no view data, and makes a single sale
 *     count five times as much as a single page view (you can browse a
 *     product casually; you don't pay for it casually).
 *   - The category boost is bounded to 0–10 points so a brand-new SKU
 *     in a hot category outranks a brand-new SKU in a quiet category,
 *     without overwhelming the per-product signal.
 *
 * Products with zero engagement still end up with score = 0 and the
 * listing falls back to `createdAt DESC` via the compound
 * `(popularityScore DESC, createdAt DESC)` index — so the recommended
 * sort is always at least as good as the legacy "newest" sort.
 *
 * Called from:
 *   - `worker/index.ts` cron (`recompute-popularity`, daily 03:30 EET)
 *   - `scripts/post-push.ts` (one-off on every deploy so prod has fresh
 *     scores immediately after a release rather than waiting up to 24h
 *     for the next cron tick)
 */
import { prisma } from '@/lib/db';

export type RecomputeResult = {
  updated: number;
};

const POPULARITY_WINDOW_DAYS = 90;
const ORDER_WEIGHT = 5;
const VIEW_WEIGHT = 1;
const CATEGORY_BOOST_MAX = 10;

/**
 * The recompute SQL exported as a string so `scripts/post-push.ts` can
 * run it through its own short-lived PrismaClient instance instead of
 * importing the singleton from `@/lib/db` (which the script context
 * doesn't always like). Single source of truth — update here only.
 */
export const RECOMPUTE_POPULARITY_SQL = `
    WITH po AS (
      SELECT
        oi."productId",
        SUM(oi.qty)::int AS qty
      FROM "OrderItem" oi
      JOIN "Order" o ON o.id = oi."orderId"
      WHERE o."createdAt" >= NOW() - INTERVAL '${POPULARITY_WINDOW_DAYS} days'
        AND o.status NOT IN ('CANCELLED', 'RETURNED')
      GROUP BY oi."productId"
    ),
    pv AS (
      SELECT
        "productId",
        COUNT(*)::int AS views
      FROM "ProductView"
      WHERE "viewedAt" >= NOW() - INTERVAL '${POPULARITY_WINDOW_DAYS} days'
      GROUP BY "productId"
    ),
    co AS (
      SELECT
        p."categoryId",
        SUM(po.qty)::int AS qty
      FROM po
      JOIN "Product" p ON p.id = po."productId"
      GROUP BY p."categoryId"
    ),
    cpv AS (
      SELECT
        p."categoryId",
        SUM(pv.views)::int AS views
      FROM pv
      JOIN "Product" p ON p.id = pv."productId"
      GROUP BY p."categoryId"
    ),
    cv AS (
      SELECT
        "categoryId",
        COUNT(*)::int AS views
      FROM "CategoryView"
      WHERE "viewedAt" >= NOW() - INTERVAL '${POPULARITY_WINDOW_DAYS} days'
      GROUP BY "categoryId"
    ),
    cs AS (
      SELECT
        c.id AS cid,
        COALESCE(co.qty, 0) * ${ORDER_WEIGHT}
          + COALESCE(cpv.views, 0) * ${VIEW_WEIGHT}
          + COALESCE(cv.views, 0) * ${VIEW_WEIGHT}
          AS combined
      FROM "Category" c
      LEFT JOIN co ON co."categoryId" = c.id
      LEFT JOIN cpv ON cpv."categoryId" = c.id
      LEFT JOIN cv ON cv."categoryId" = c.id
    ),
    mx AS (
      SELECT GREATEST(COALESCE(MAX(combined), 0), 1) AS m FROM cs
    ),
    scores AS (
      SELECT
        p.id AS pid,
        COALESCE(po.qty, 0) * ${ORDER_WEIGHT}
          + COALESCE(pv.views, 0) * ${VIEW_WEIGHT}
          + COALESCE(ROUND(cs.combined::numeric / mx.m * ${CATEGORY_BOOST_MAX}), 0)::int
          AS score
      FROM "Product" p
      CROSS JOIN mx
      LEFT JOIN po ON po."productId" = p.id
      LEFT JOIN pv ON pv."productId" = p.id
      LEFT JOIN cs ON cs.cid = p."categoryId"
    )
    UPDATE "Product" p
    SET
      "popularityScore" = scores.score,
      "popularityScoredAt" = NOW()
    FROM scores
    WHERE scores.pid = p.id
`;

export async function recomputePopularityScores(): Promise<RecomputeResult> {
  const updated = await prisma.$executeRawUnsafe(RECOMPUTE_POPULARITY_SQL);
  return { updated };
}
