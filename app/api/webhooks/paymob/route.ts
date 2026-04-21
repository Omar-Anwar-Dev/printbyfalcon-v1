import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyPaymobHmac } from '@/lib/payments/paymob';
import { ensureInvoiceForOrder } from '@/lib/invoices/ensure';
import { sendInvoiceToCustomer } from '@/lib/invoices/delivery';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Paymob transaction webhook — idempotent payment-status flipper.
 *
 *   POST /api/webhooks/paymob?hmac=<hex>
 *   body: { type: "TRANSACTION", obj: { id, success, order: { id, merchant_order_id }, ... } }
 *
 * Defensive on the HMAC location — Paymob has been observed emitting it as a
 * URL query param, an `hmac` field inside the JSON body, and occasionally a
 * header. We accept all three.
 *
 * Every incoming request is logged at `paymob.webhook.received` BEFORE any
 * decision branch, so the absence of logs in prod = the POST genuinely did
 * not arrive (Cloudflare/DNS/firewall), not a silent short-circuit.
 *
 * Rules:
 *   - HMAC verified before any DB work. Bad signature → 401.
 *   - Idempotency by `paymob_transaction_id` (unique column on Order).
 *   - Always return 200 on logical errors (bad state, already processed)
 *     so Paymob doesn't retry-storm us; we log instead.
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const bodyText = await request.text();

  let payload: Record<string, unknown> | null = null;
  try {
    payload = JSON.parse(bodyText) as Record<string, unknown>;
  } catch {
    // leave payload null
  }

  const hmacFromQuery = url.searchParams.get('hmac') ?? '';
  const hmacFromHeader =
    request.headers.get('x-paymob-hmac') ?? request.headers.get('hmac') ?? '';
  const hmacFromBody =
    (payload && typeof payload.hmac === 'string' ? payload.hmac : '') || '';
  const hmac = hmacFromQuery || hmacFromHeader || hmacFromBody;

  logger.warn(
    {
      method: 'POST',
      path: url.pathname,
      hmacSource: hmacFromQuery
        ? 'query'
        : hmacFromHeader
          ? 'header'
          : hmacFromBody
            ? 'body'
            : 'none',
      hmacLen: hmac.length,
      bodyLen: bodyText.length,
      payloadType: payload?.type ?? null,
      hasObj: Boolean(payload?.obj),
      userAgent: request.headers.get('user-agent') ?? null,
      cfRay: request.headers.get('cf-ray') ?? null,
    },
    'paymob.webhook.received',
  );

  if (!hmac) {
    logger.warn({}, 'paymob.webhook.missing_hmac');
    return NextResponse.json(
      { ok: false, error: 'missing-hmac' },
      { status: 401 },
    );
  }

  if (!payload) {
    logger.warn({ bodyLen: bodyText.length }, 'paymob.webhook.bad_json');
    return NextResponse.json({ ok: false, error: 'bad-json' }, { status: 400 });
  }

  if (!verifyPaymobHmac(payload, hmac)) {
    logger.warn(
      { hmacPrefix: hmac.slice(0, 12) },
      'paymob.webhook.hmac_mismatch',
    );
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
    logger.warn({ type, txnId }, 'paymob.webhook.ignored_event_type');
    return NextResponse.json({ ok: true, ignored: true });
  }

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

  if (order.paymobTransactionId === txnId) {
    logger.info({ orderId: order.id, txnId }, 'paymob.webhook.duplicate');
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
    logger.info({ orderId: order.id, txnId }, 'paymob.webhook.order_paid');

    // Sprint 6 — fire invoice delivery on PAID. Best-effort; failure here
    // doesn't block the webhook's 200 response so Paymob never retries.
    try {
      const { invoiceId } = await ensureInvoiceForOrder(order.id, null);
      if (invoiceId) await sendInvoiceToCustomer(invoiceId);
    } catch (err) {
      logger.error(
        { err: (err as Error).message, orderId: order.id },
        'paymob.webhook.invoice_delivery_failed',
      );
    }
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
    logger.info({ orderId: order.id, txnId }, 'paymob.webhook.order_failed');
  }

  return NextResponse.json({ ok: true });
}

/**
 * GET handler — only exists so ops can curl the URL to confirm the route is
 * mounted and reachable. Returns a tiny JSON so a 200 proves our infra
 * (DNS/Cloudflare/Nginx/Next) routes to this handler correctly.
 */
export async function GET() {
  return NextResponse.json({ ok: true, route: 'paymob-webhook' });
}
