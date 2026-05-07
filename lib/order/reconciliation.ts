/**
 * Paymob order reconciliation — finds orders stuck at paymentStatus=PENDING
 * (paymentMethod=PAYMOB_CARD, older than 1 hour) and queries Paymob for the
 * actual status. Catches the "webhook never arrived" failure mode.
 *
 * Sprint 11.6 — switched from the legacy `/api/auth/tokens` +
 * `/api/ecommerce/orders/<id>/transactions` flow (which required the old
 * PAYMOB_API_KEY) to the Intention API GET endpoint authenticated with the
 * Secret Key. The intention's `id` (UUID) is what we stored in
 * `Order.paymobOrderId` at intention-creation time; that's the handle we
 * query here.
 *
 * Called by the worker cron (hourly) — see worker entrypoint.
 */
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const STALE_THRESHOLD_MS = 60 * 60 * 1000; // 1 hour
const BASE = 'https://accept.paymob.com';

type IntentionResponse = {
  id?: string;
  // The intention status surface — Paymob has shipped a few different shapes
  // over time. We probe several fields defensively so a doc tweak doesn't
  // silently break reconciliation.
  status?: string;
  payment_status?: string;
  intention_order_id?: number | string;
  // Transactions array — present on processed intentions.
  transactions?: { id?: number | string; success?: boolean }[];
  intention_detail?: {
    transactions?: { id?: number | string; success?: boolean }[];
  };
};

/**
 * Inspect an intention response and decide outcome:
 *   - { paid: true, txnId } if any transaction has success=true
 *   - { failed: true } if all transactions exist and none succeeded
 *   - { pending: true } otherwise (still waiting / no transactions yet)
 */
function classify(body: IntentionResponse): {
  paid?: { txnId: string };
  failed?: boolean;
  pending?: boolean;
} {
  const txns = [
    ...(body.transactions ?? []),
    ...(body.intention_detail?.transactions ?? []),
  ];
  const successful = txns.find((t) => t.success === true);
  if (successful?.id != null) {
    return { paid: { txnId: String(successful.id) } };
  }
  const allFailed = txns.length > 0 && txns.every((t) => t.success === false);
  if (allFailed) return { failed: true };
  // Status-string fallback (some intentions are returned without an explicit
  // transactions array — rely on the canonical status field instead).
  const status = (body.status ?? body.payment_status ?? '').toUpperCase();
  if (status === 'PROCESSED' || status === 'PAID' || status === 'SUCCESS') {
    // Processed but no transaction surfaced — recoverable, will retry next
    // tick. Don't mark FAILED, just leave PENDING.
    return { pending: true };
  }
  if (status === 'FAILED' || status === 'DECLINED' || status === 'EXPIRED') {
    return { failed: true };
  }
  return { pending: true };
}

export async function reconcileStalePaymobOrders(): Promise<{
  checked: number;
  updated: number;
}> {
  const secretKey = process.env.PAYMOB_SECRET_KEY;
  if (!secretKey || secretKey.trim().length === 0) {
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

  let updated = 0;
  for (const order of stale) {
    try {
      const res = await fetch(
        `${BASE}/v1/intention/${encodeURIComponent(order.paymobOrderId!)}/`,
        {
          headers: { Authorization: `Token ${secretKey.trim()}` },
        },
      );
      if (!res.ok) {
        logger.warn(
          { orderId: order.id, status: res.status },
          'reconcile.paymob.intention_get_failed',
        );
        continue;
      }
      const body = (await res.json()) as IntentionResponse;
      const outcome = classify(body);

      if (outcome.paid) {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'PAID',
            paymobTransactionId: outcome.paid.txnId,
          },
        });
        await prisma.orderStatusEvent.create({
          data: {
            orderId: order.id,
            status: 'CONFIRMED',
            note: `Reconciliation: payment captured (txn ${outcome.paid.txnId})`,
          },
        });
        updated += 1;
      } else if (outcome.failed) {
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
      // pending → leave the order alone, retry next tick
    } catch (err) {
      logger.warn(
        { orderId: order.id, err: (err as Error).message },
        'reconcile.paymob.order_failed',
      );
    }
  }

  return { checked: stale.length, updated };
}
