/**
 * Sprint 15 — Purchase event server-side fire helper.
 *
 * Used in two places:
 *   1. `app/actions/checkout.ts` (COD path) — runs in the customer's
 *      request context; passes through real client IP / UA / fbp / fbc.
 *   2. `app/api/webhooks/paymob/route.ts` — runs in Paymob's request
 *      context. Paymob's IP/UA are NOT the customer's, so we pass nulls
 *      and let Meta match on hashed email + phone alone (still gives an
 *      EMQ score of 5–7 / 10, which is acceptable).
 *
 * Centralizing here means both fires send byte-identical `custom_data`
 * payloads — important because they share the same `event_id` (stored as
 * `Order.fbEventId`) and Meta's dedup logic is happier when fields match.
 */
import type { CapiResult } from './capi';
import { sendCapiEvent } from './capi';
import type { FbCustomData } from './events';

type PurchaseItem = {
  productId: string | null;
  qty: number;
  unitPriceEgp: number;
};

/** Pure builder — exported for unit tests. */
export function buildPurchaseCustomData(opts: {
  orderNumber: string;
  totalEgp: number;
  items: PurchaseItem[];
}): FbCustomData {
  const validItems = opts.items.filter(
    (i): i is PurchaseItem & { productId: string } => i.productId !== null,
  );
  return {
    content_type: 'product',
    content_ids: validItems.map((i) => i.productId),
    contents: validItems.map((i) => ({
      id: i.productId,
      quantity: i.qty,
      item_price: i.unitPriceEgp,
    })),
    num_items: opts.items.reduce((acc, i) => acc + i.qty, 0),
    value: opts.totalEgp,
    currency: 'EGP',
    order_id: opts.orderNumber,
  };
}

/**
 * Fire `Purchase` to Meta CAPI. `fbEventId` MUST be the same value the
 * confirmation page will use for the Pixel `Purchase` fire — that's the
 * dedupe key.
 */
export async function sendPurchaseCapi(opts: {
  fbEventId: string;
  eventTime: Date;
  orderNumber: string;
  totalEgp: number;
  items: PurchaseItem[];
  contactEmail: string | null;
  contactPhone: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  sourceUrl?: string;
}): Promise<CapiResult> {
  return sendCapiEvent({
    eventName: 'Purchase',
    eventId: opts.fbEventId,
    eventTime: Math.floor(opts.eventTime.getTime() / 1000),
    customData: buildPurchaseCustomData({
      orderNumber: opts.orderNumber,
      totalEgp: opts.totalEgp,
      items: opts.items,
    }),
    userData: {
      email: opts.contactEmail,
      phone: opts.contactPhone,
      clientIp: opts.clientIp ?? null,
      userAgent: opts.userAgent ?? null,
      fbp: opts.fbp ?? null,
      fbc: opts.fbc ?? null,
    },
    sourceUrl: opts.sourceUrl,
  });
}
