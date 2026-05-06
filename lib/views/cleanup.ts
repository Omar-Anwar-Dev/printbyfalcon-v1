/**
 * Daily prune of view-tracking rows older than the popularity recompute
 * window (90 days). Keeps both ProductView and CategoryView tables from
 * growing unbounded and matches the time horizon used by
 * `lib/catalog/popularity.ts` — anything older has no effect on the
 * score and is safe to drop.
 *
 * Triggered by the `cleanup-expired-views` cron in `worker/index.ts`.
 */
import { prisma } from '@/lib/db';

const RETENTION_DAYS = 90;

export type ViewCleanupResult = {
  productViewsDeleted: number;
  categoryViewsDeleted: number;
};

export async function cleanupExpiredViews(): Promise<ViewCleanupResult> {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const [productViewsDeleted, categoryViewsDeleted] = await Promise.all([
    prisma.productView
      .deleteMany({ where: { viewedAt: { lt: cutoff } } })
      .then((r) => r.count),
    prisma.categoryView
      .deleteMany({ where: { viewedAt: { lt: cutoff } } })
      .then((r) => r.count),
  ]);
  return { productViewsDeleted, categoryViewsDeleted };
}
