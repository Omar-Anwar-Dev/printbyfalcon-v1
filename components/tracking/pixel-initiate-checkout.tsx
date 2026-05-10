'use client';

/**
 * Sprint 15 — fires Meta `InitiateCheckout` (Pixel + CAPI relay) when the
 * /checkout page mounts. The parent server component passes the resolved
 * cart items + subtotal; we don't re-fetch.
 *
 * Meta interprets multiple InitiateCheckout fires as separate funnel
 * attempts (a user who abandons + comes back later is two attempts), so
 * we don't dedupe across visits — only across the React mount lifecycle.
 *
 * `value` here is the cart subtotal (item totals only). Shipping, VAT,
 * and COD fees are added in `Purchase` once the user has picked a method;
 * keeping InitiateCheckout subtotal-only matches what Meta expects (some
 * tutorials use grand-total but it makes the funnel value drift around).
 */
import { useEffect } from 'react';
import { newFbEventId } from '@/lib/tracking/event-id';
import { trackEvent } from '@/lib/tracking/pixel';

type Item = {
  productId: string;
  qty: number;
  unitPriceEgp: number;
};

type Props = {
  items: Item[];
  subtotalEgp: number;
};

export function PixelInitiateCheckout({ items, subtotalEgp }: Props) {
  useEffect(() => {
    if (items.length === 0) return;
    const eventId = newFbEventId();
    trackEvent('InitiateCheckout', eventId, {
      content_type: 'product',
      content_ids: items.map((i) => i.productId),
      contents: items.map((i) => ({
        id: i.productId,
        quantity: i.qty,
        item_price: i.unitPriceEgp,
      })),
      num_items: items.reduce((acc, i) => acc + i.qty, 0),
      value: subtotalEgp,
      currency: 'EGP',
    });
    // Re-fire if cart contents change while on the checkout page (rare —
    // user typically locks in items at /cart before navigating here).
    // Stringify deps to avoid array-identity churn re-firing on harmless
    // rerenders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(items), subtotalEgp]);
  return null;
}
