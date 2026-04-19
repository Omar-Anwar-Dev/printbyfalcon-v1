/**
 * Stock-availability helpers for cart / checkout. Respects both active
 * cart soft reservations (15-min TTL) and firm order reservations.
 *
 * Sprint 4 keeps this minimal — `availableQty = Inventory.currentQty - SUM(unexpired reservations)`.
 * Sprint 6 will layer on low-stock thresholds + admin receive/adjust flow.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

export const CART_RESERVATION_TTL_MINUTES = 15;

type Client = Omit<
  typeof prisma,
  '$on' | '$connect' | '$disconnect' | '$use' | '$extends'
>;

/**
 * Compute available qty for a product, excluding reservations held by
 * the caller's own cart item (`excludeRefId`) so a user updating their
 * cart qty from 2→3 doesn't double-count their own 2-unit hold.
 */
export async function getAvailableQty(
  productId: string,
  excludeRefId: string | null = null,
  client: Client = prisma,
): Promise<number> {
  const rows = await client.$queryRaw<{ available: number }[]>(Prisma.sql`
    SELECT
      COALESCE(inv."currentQty", 0)
      - COALESCE((
          SELECT SUM(r.qty)::int FROM "InventoryReservation" r
          WHERE r."productId" = ${productId}
            AND (r."expiresAt" IS NULL OR r."expiresAt" > NOW())
            ${excludeRefId ? Prisma.sql`AND r."refId" <> ${excludeRefId}` : Prisma.empty}
        ), 0) AS available
    FROM "Inventory" inv
    WHERE inv."productId" = ${productId}
  `);
  return rows[0]?.available ?? 0;
}

/**
 * Batch version — returns a map of productId → availableQty. Avoids N queries
 * when validating a full cart at checkout submit.
 */
export async function getAvailableQtyMap(
  productIds: string[],
  excludeRefIds: string[] = [],
): Promise<Map<string, number>> {
  if (productIds.length === 0) return new Map();
  const rows = await prisma.$queryRaw<
    { product_id: string; available: number }[]
  >(Prisma.sql`
    SELECT
      inv."productId" AS product_id,
      COALESCE(inv."currentQty", 0)
      - COALESCE((
          SELECT SUM(r.qty)::int FROM "InventoryReservation" r
          WHERE r."productId" = inv."productId"
            AND (r."expiresAt" IS NULL OR r."expiresAt" > NOW())
            ${
              excludeRefIds.length
                ? Prisma.sql`AND r."refId" NOT IN (${Prisma.join(excludeRefIds)})`
                : Prisma.empty
            }
        ), 0) AS available
    FROM "Inventory" inv
    WHERE inv."productId" IN (${Prisma.join(productIds)})
  `);
  return new Map(rows.map((r) => [r.product_id, r.available]));
}

/**
 * Release all CART-type reservations whose TTL has passed. Called from the
 * pg-boss cron job `cleanup-expired-cart-reservations` every 5 minutes.
 */
export async function releaseExpiredCartReservations(): Promise<number> {
  const { count } = await prisma.inventoryReservation.deleteMany({
    where: {
      type: 'CART',
      expiresAt: { lt: new Date() },
    },
  });
  return count;
}
