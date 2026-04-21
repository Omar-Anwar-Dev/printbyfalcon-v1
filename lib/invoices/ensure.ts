/**
 * Ensure an Invoice row exists for an order (Sprint 6 S6-D4-T2).
 *
 * Triggered on every CONFIRMED transition (all order types — B2C COD at
 * checkout, B2C Paymob on webhook PAID, B2B Pay-Now on confirm, B2B
 * Submit-for-Review on sales-rep confirm). Idempotent — if a v1 Invoice
 * already exists for the order, returns that row. Amendments go through a
 * dedicated path that takes an explicit reason and bumps version.
 *
 * Per ADR-034 no PDF file is written. The Invoice row is the durable record;
 * bytes are regenerated on demand.
 */
import { prisma } from '@/lib/db';
import { generateInvoiceNumber } from './number';

export async function ensureInvoiceForOrder(
  orderId: string,
  generatedByUserId: string | null = null,
): Promise<{ invoiceId: string; invoiceNumber: string; created: boolean }> {
  const existing = await prisma.invoice.findFirst({
    where: { orderId, isAmended: false },
    orderBy: { version: 'desc' },
  });
  if (existing) {
    return {
      invoiceId: existing.id,
      invoiceNumber: existing.invoiceNumber,
      created: false,
    };
  }

  // Allocate number + insert Invoice row in a single transaction so a
  // crashed transaction rolls back the sequence bump along with the row.
  const invoice = await prisma.$transaction(async (tx) => {
    const number = await generateInvoiceNumber(tx, new Date());
    return tx.invoice.create({
      data: {
        invoiceNumber: number,
        orderId,
        version: 1,
        generatedById: generatedByUserId,
      },
    });
  });

  await prisma.auditLog.create({
    data: {
      actorId: generatedByUserId,
      action: 'invoice.generated',
      entityType: 'Invoice',
      entityId: invoice.id,
      after: {
        invoiceNumber: invoice.invoiceNumber,
        orderId,
        version: invoice.version,
      } as never,
    },
  });

  return {
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    created: true,
  };
}

/**
 * Amend an invoice: mark the prior as `isAmended=true` and create a new
 * version row with a fresh invoice number (ADR-020 — numbering is gapless,
 * each amendment consumes a new serial; the prior one is retained for audit).
 */
export async function amendInvoice(
  priorInvoiceId: string,
  reason: string,
  actorId: string,
): Promise<{ invoiceId: string; invoiceNumber: string; version: number }> {
  return prisma.$transaction(async (tx) => {
    const prior = await tx.invoice.findUnique({
      where: { id: priorInvoiceId },
    });
    if (!prior) throw new Error('invoice.not_found');

    await tx.invoice.update({
      where: { id: prior.id },
      data: { isAmended: true },
    });

    const number = await generateInvoiceNumber(tx, new Date());
    const next = await tx.invoice.create({
      data: {
        invoiceNumber: number,
        orderId: prior.orderId,
        version: prior.version + 1,
        amendedFromId: prior.id,
        amendmentReason: reason,
        generatedById: actorId,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId,
        action: 'invoice.amended',
        entityType: 'Invoice',
        entityId: next.id,
        before: { invoiceNumber: prior.invoiceNumber } as never,
        after: {
          invoiceNumber: next.invoiceNumber,
          reason,
          version: next.version,
        } as never,
      },
    });

    return {
      invoiceId: next.id,
      invoiceNumber: next.invoiceNumber,
      version: next.version,
    };
  });
}
