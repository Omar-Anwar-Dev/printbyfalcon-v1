/**
 * Paymob order reconciliation — finds orders stuck at paymentStatus=PENDING
 * (paymentMethod=PAYMOB_CARD, older than 1 hour) and queries Paymob for the
 * actual status. Catches the "webhook never arrived" failure mode.
 *
 * Called by the worker cron (hourly) — `lib/order/reconciliation.ts::reconcileStalePaymobOrders`.
 */
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour

export async function reconcileStalePaymobOrders(): Promise<{
  checked: number;
  updated: number;
}> {
  const apiKey = process.env.PAYMOB_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    // Dev / no-paymob env — nothing to reconcile.
    return { checked: 0, updated: 0 };
  }

  const cutoff = new Date(Date.now() - STALE_THRESHOLD_MS);
  const stale = await prisma.order.findMany({
    where: {
      paymentMethod: 'PAYMOB_CARD',
      paymentStatus: 'PENDING',
      paymobOrderId: { not: null },
      createdAt: { lt: cutoff },
    },
    select: {
      id: true,
      paymobOrderId: true,
    },
    take: 50,
  });
  if (stale.length === 0) return { checked: 0, updated: 0 };

  // Get a fresh Paymob auth token once for the batch.
  const authRes = await fetch('https://accept.paymob.com/api/auth/tokens', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!authRes.ok) {
    logger.error({ status: authRes.status }, 'reconcile.paymob.auth_failed');
    return { checked: stale.length, updated: 0 };
  }
  const { token } = (await authRes.json()) as { token: string };

  let updated = 0;
  for (const order of stale) {
    try {
      const res = await fetch(
        `https://accept.paymob.com/api/ecommerce/orders/${order.paymobOrderId}/transactions`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) continue;
      const body = (await res.json()) as
        | { transactions?: { id: number; success: boolean }[] }
        | { id: number; success: boolean }[];
      const list = Array.isArray(body) ? body : (body.transactions ?? []);
      const successful = list.find((t) => t.success);
      if (successful) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            paymobTransactionId: String(successful.id),
          },
        });
        await prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            status: 'CONFIRMED',
            note: `Reconciliation: payment captured (txn ${successful.id})`,
          },
        });
        updated += 1;
      } else if (list.length > 0) {
        // All attempts failed — mark FAILED.
        await prisma.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'FAILED' },
        });
        await prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            status: 'CONFIRMED',
            note: 'Reconciliation: payment failed',
          },
        });
        updated += 1;
      }
    } catch (err) {
      logger.warn(
        { orderId: order.id, err: (err as Error).message },
        'reconcile.paymob.order_failed',
      );
    }
  }

  return { checked: stale.length, updated };
}
