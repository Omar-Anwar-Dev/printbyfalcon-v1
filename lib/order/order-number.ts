/**
 * Order-number generator — `ORD-YY-DDMM-NNNNN` with per-day serial reset per
 * ADR-019. Implemented via the `OrderDailySequence` table with an UPSERT +
 * RETURNING so the increment is atomic under concurrent order placement.
 *
 * Typical call site is inside the `createOrder` transaction; this function
 * takes an optional Prisma client/tx so the serial allocation and the order
 * insert live in the same SQL transaction (rolling back the sequence bump
 * along with a failed order).
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type Client = Pick<typeof prisma, '$queryRaw'>;

export async function generateOrderNumber(
  client: Client = prisma,
  now: Date = new Date(),
): Promise<string> {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const dateKey = Number.parseInt(`${now.getUTCFullYear()}${mm}${dd}`, 10); // YYYYMMDD

  // INSERT ... ON CONFLICT UPDATE ... RETURNING "lastSerial" atomically
  // allocates the next serial for the day.
  const rows = await client.$queryRaw<{ lastSerial: number }[]>(Prisma.sql`
    INSERT INTO "OrderDailySequence" ("id", "lastSerial", "updatedAt")
    VALUES (${dateKey}, 1, NOW())
    ON CONFLICT ("id") DO UPDATE
      SET "lastSerial" = "OrderDailySequence"."lastSerial" + 1,
          "updatedAt"  = NOW()
    RETURNING "lastSerial"
  `);
  const serial = rows[0]?.lastSerial ?? 1;
  return `ORD-${yy}-${dd}${mm}-${String(serial).padStart(5, '0')}`;
}
