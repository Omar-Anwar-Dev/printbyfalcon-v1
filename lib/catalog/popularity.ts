/**
 * Popularity recompute (PR 3).
 *
 * Owner ask: stop ranking listings by `createdAt DESC`. Surface what
 * customers actually buy first.
 *
 * Score formula per product (single batch UPDATE, no per-product loop):
 *   score = sum(order_item.qty) over the last 90 days for non-cancelled,
 *           non-returned orders containing this product
 *         + round(category_total_qty / max_category_total_qty * 10)
 *
 * The category term is a small boost (0–10 points) so a brand-new SKU
 * inside a hot category outranks a brand-new SKU inside a quiet one.
 *
 * Products with zero orders end up with score = 0 and the listing falls
 * back to `createdAt DESC` via the compound `(popularityScore DESC,
 * createdAt DESC)` index — so the recommended sort is always at least as
 * good as the old "newest" sort, even on a cold dataset.
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
const CATEGORY_BOOST_MAX = 10;

export async function recomputePopularityScores(): Promise<RecomputeResult> {
  const updated = await prisma.$executeRawUnsafe(`
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
    co AS (
      SELECT
        p."categoryId",
        SUM(po.qty)::int AS qty
      FROM po
      JOIN "Product" p ON p.id = po."productId"
      GROUP BY p."categoryId"
    ),
    mx AS (
      -- GREATEST + COALESCE keeps mx non-empty even if no orders exist in
      -- the window, so the CROSS JOIN below still yields one row per
      -- Product (otherwise UPDATE would touch zero rows).
      SELECT GREATEST(COALESCE(MAX(qty), 0), 1) AS m FROM co
    ),
    scores AS (
      SELECT
        p.id AS pid,
        COALESCE(po.qty, 0)
          + COALESCE(ROUND(co.qty::numeric / mx.m * ${CATEGORY_BOOST_MAX}), 0)::int
          AS score
      FROM "Product" p
      CROSS JOIN mx
      LEFT JOIN po ON po."productId" = p.id
      LEFT JOIN co ON co."categoryId" = p."categoryId"
    )
    UPDATE "Product" p
    SET
      "popularityScore" = scores.score,
      "popularityScoredAt" = NOW()
    FROM scores
    WHERE scores.pid = p.id
  `);
  return { updated };
}
