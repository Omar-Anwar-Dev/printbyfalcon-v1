/**
 * Browser-side Meta Pixel helpers.
 *
 * Each call does TWO things in parallel:
 *   1. Fires Pixel via `window.fbq('track', name, data, { eventID })`
 *   2. POSTs to `/api/tracking/capi` with the same `eventId` so the server
 *      mirrors the event to Meta CAPI. Same `eventId` on both = Meta dedupes.
 *
 * Server-direct CAPI events (Purchase from Paymob webhook / COD checkout
 * action) skip this module entirely — they call `sendCapiEvent` from
 * `capi.ts` directly and pass `event_id` through to the confirmation page
 * so the Pixel fire there reuses it.
 *
 * Tracking failures must NEVER break the page. Every fbq call and fetch
 * call is wrapped in try/catch with no rethrow.
 */
import type { FbCustomData, FbEventName, RelayPayload } from './events';

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Fire a Pixel event in the browser AND send the same event to the CAPI
 * relay endpoint for server-side mirroring. Both fires use `eventId` so
 * Meta dedupes them.
 *
 * Safe to call even if the Pixel script hasn't loaded — the fbq part
 * silently no-ops; the relay POST still happens (and the relay itself
 * no-ops if CAPI env vars aren't set, e.g. dev).
 */
export function trackEvent(
  eventName: FbEventName,
  eventId: string,
  customData?: FbCustomData,
): void {
  // Belt-and-braces SSR guard. Components calling this should already be
  // 'use client', but useEffect-deferred renders can briefly be SSR'd.
  if (typeof window === 'undefined') return;

  // Browser Pixel fire — never throw.
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, customData ?? {}, { eventID: eventId });
    }
  } catch {
    /* tracking errors must not break the page */
  }

  // CAPI relay — fire-and-forget. `keepalive: true` lets the request
  // survive page navigation (e.g. AddToCart → cart page transition).
  try {
    const payload: RelayPayload = {
      eventName,
      eventId,
      eventTime: Math.floor(Date.now() / 1000),
      customData,
      sourceUrl: window.location.href,
    };
    void fetch('/api/tracking/capi', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {
      /* relay endpoint unreachable — accepted; Pixel fire still happened */
    });
  } catch {
    /* swallow */
  }
}

/**
 * Fire a Pixel event in the browser WITHOUT mirroring to CAPI relay.
 *
 * Used by `Purchase` only: the server already fires CAPI directly (from
 * the Paymob webhook for card orders, from the checkout action for COD)
 * with the same `eventId`, so the browser-side relay POST would be wasted
 * work. The relay endpoint rejects `Purchase` anyway as a hardening step
 * against hostile clients faking conversions.
 */
export function trackPixelOnly(
  eventName: FbEventName,
  eventId: string,
  customData?: FbCustomData,
): void {
  if (typeof window === 'undefined') return;
  try {
    if (typeof window.fbq === 'function') {
      window.fbq('track', eventName, customData ?? {}, { eventID: eventId });
    }
  } catch {
    /* tracking errors must not break the page */
  }
}
