'use client';

/**
 * Sprint 15 — fires Meta `ViewContent` (Pixel + CAPI relay) when a product
 * detail page mounts. The parent (server component
 * `app/[locale]/products/[slug]/page.tsx`) passes the resolved product data
 * including the viewer-specific price; we don't re-fetch.
 *
 * Dedupe key (`event_id`) is generated client-side with `newFbEventId()`.
 * The same id flows to both `fbq('track', 'ViewContent', ..., {eventID})`
 * and the relay POST body, so Meta merges the browser- and server-sent
 * copies of this event.
 */
import { useEffect } from 'react';
import { newFbEventId } from '@/lib/tracking/event-id';
import { trackEvent } from '@/lib/tracking/pixel';

type Props = {
  productId: string;
  productName: string;
  productCategory: string;
  /** Final price the viewer sees, in EGP (post tier / promo). */
  priceEgp: number;
};

export function PixelViewContent({
  productId,
  productName,
  productCategory,
  priceEgp,
}: Props) {
  useEffect(() => {
    const eventId = newFbEventId();
    trackEvent('ViewContent', eventId, {
      content_ids: [productId],
      content_type: 'product',
      content_name: productName,
      content_category: productCategory,
      value: priceEgp,
      currency: 'EGP',
    });
    // We re-fire when the productId changes — covers SPA-style navigation
    // between two products (where the same component instance gets new
    // props) without firing on incidental re-renders.
  }, [productId, productName, productCategory, priceEgp]);
  return null;
}
