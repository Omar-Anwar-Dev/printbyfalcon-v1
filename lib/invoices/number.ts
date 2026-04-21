/**
 * Invoice-number generator (Sprint 6 S6-D4-T3) — gapless annual serial per
 * ADR-020. Format: `INV-YY-NNNNNN`. Atomic UPSERT+RETURNING against
 * `InvoiceAnnualSequence`, same pattern as `generateOrderNumber` in
 * `lib/order/order-number.ts`.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type Client = Pick<typeof prisma, '$queryRaw'>;

export async function generateInvoiceNumber(
  client: Client = prisma,
  now: Date = new Date(),
): Promise<string> {
  const yy = String(now.getUTCFullYear()).slice(-2);
  const yearKey = Number.parseInt(yy, 10);

  const rows = await client.$queryRaw<{ lastSerial: number }[]>(Prisma.sql`
    INSERT INTO "InvoiceAnnualSequence" ("year", "lastSerial", "updatedAt")
    VALUES (${yearKey}, 1, NOW())
    ON CONFLICT ("year") DO UPDATE
      SET "lastSerial" = "InvoiceAnnualSequence"."lastSerial" + 1,
          "updatedAt"  = NOW()
    RETURNING "lastSerial"
  `);
  const serial = rows[0]?.lastSerial ?? 1;
  return `INV-${yy}-${String(serial).padStart(6, '0')}`;
}
