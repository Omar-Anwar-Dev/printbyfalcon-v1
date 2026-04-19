import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPaymobHmac } from '@/lib/payments/paymob';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Paymob transaction webhook — idempotent payment-status flipper.
 *
 *   POST /api/webhooks/paymob?hmac=<hex>
 *   body: { type: "TRANSACTION", obj: { id, success, order: { id, merchant_order_id }, ... } }
 *
 * Rules:
 *   - HMAC is verified before any DB work. Bad signature → 401.
 *   - Idempotency by `paymob_transaction_id` (unique column on Order).
 *   - Always return 200 on logical errors (bad state, already processed)
 *     so Paymob doesn't retry-storm us; we log instead.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const hmac = url.searchParams.get('hmac') ?? '';
  if (!hmac) {
    return NextResponse.json(
      { ok: false, error: 'missing-hmac' },
      { status: 401 },
    );
  }

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }

  if (!verifyPaymobHmac(payload, hmac)) {
    logger.warn({}, 'paymob.webhook.hmac_mismatch');
    return NextResponse.json({ ok: false, error: 'bad-hmac' }, { status: 401 });
  }

  const type = payload.type as string | undefined;
  const obj = (payload.obj as Record<string, unknown>) ?? {};
  const txnId = obj.id != null ? String(obj.id) : null;
  const success = obj.success === true;
  const paymobOrder = (obj.order as Record<string, unknown>) ?? {};
  const merchantOrderId =
    (paymobOrder.merchant_order_id as string | null | undefined) ?? null;
  const paymobOrderId = paymobOrder.id != null ? String(paymobOrder.id) : null;

  if (type !== 'TRANSACTION' || !txnId) {
    // Unknown event type → ignore, acknowledge.
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Look up the order. Prefer merchant_order_id (our Order.id) for speed,
  // fall back to paymob_order_id for robustness.
  const order = merchantOrderId
    ? await prisma.order.findUnique({ where: { id: merchantOrderId } })
    : paymobOrderId
      ? await prisma.order.findFirst({ where: { paymobOrderId } })
      : null;
  if (!order) {
    logger.warn(
      { merchantOrderId, paymobOrderId, txnId },
      'paymob.webhook.order_not_found',
    );
    return NextResponse.json({ ok: true, ignored: true });
  }

  // Idempotency: if the same transaction id has already been recorded, no-op.
  if (order.paymobTransactionId === txnId) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  if (success) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'PAID',
          paymobTransactionId: txnId,
          paymobOrderId: paymobOrderId ?? order.paymobOrderId,
        },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: `Payment captured (paymob txn ${txnId})`,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'order.payment.paid',
          entityType: 'Order',
          entityId: order.id,
          after: { paymobTransactionId: txnId } as never,
        },
      });
    });
    // TODO (S4-D5-T3): enqueue `send-order-confirmation` email job here once
    // worker/jobs registry lands; current sprint wires this up in the worker.
  } else {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
          paymobTransactionId: txnId,
          paymobOrderId: paymobOrderId ?? order.paymobOrderId,
        },
      });
      await tx.orderStatusEvent.create({
        data: {
          orderId: order.id,
          status: order.status,
          note: `Payment failed (paymob txn ${txnId})`,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'order.payment.failed',
          entityType: 'Order',
          entityId: order.id,
          after: { paymobTransactionId: txnId } as never,
        },
      });
    });
  }

  return NextResponse.json({ ok: true });
}
