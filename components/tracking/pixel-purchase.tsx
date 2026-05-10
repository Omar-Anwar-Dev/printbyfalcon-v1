'use client';

/**
 * Sprint 15 — fires Meta `Purchase` (Pixel only — CAPI is server-direct)
 * once on confirmation page mount, using the order's pre-generated
 * `fbEventId` so Meta dedupes against the server-side CAPI fire that
 * already happened (Paymob webhook on PAID for cards, checkout action
 * for COD).
 *
 * Note: deliberately NOT calling `trackEvent` here — that would fire the
 * CAPI relay too and create a duplicate. We use `trackPixelOnly` instead.
 *
 * If `fbEventId` is null (legacy order created before Sprint 15 deploy),
 * we skip — no point firing without a dedupe key, and CAPI never fired
 * for legacy orders either.
 */
import { useEffect } from 'react';
import { trackPixelOnly } from '@/lib/tracking/pixel';
import { buildPurchaseCustomData } from '@/lib/tracking/purchase';

type Item = {
  productId: string | null;
  qty: number;
  unitPriceEgp: number;
};

type Props = {
  /** Null for legacy orders — component no-ops in that case. */
  fbEventId: string | null;
  orderNumber: string;
  totalEgp: number;
  items: Item[];
};

export function PixelPurchase({
  fbEventId,
  orderNumber,
  totalEgp,
  items,
}: Props) {
  useEffect(() => {
    if (!fbEventId) return;
    trackPixelOnly(
      'Purchase',
      fbEventId,
      buildPurchaseCustomData({ orderNumber, totalEgp, items }),
    );
    // Fire-once per order: deps include `fbEventId` only because that's the
    // immutable identity of this order's Purchase event. Stringify is
    // unnecessary since `fbEventId` is a stable UUID.
  }, [fbEventId, items, orderNumber, totalEgp]);
  return null;
}
