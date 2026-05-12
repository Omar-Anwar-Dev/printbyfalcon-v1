/**
 * Generate a UUID v4 for use as Meta `event_id` (dedupe key).
 *
 * Used in two places:
 *   1. `app/actions/checkout.ts` — generates the Purchase event_id at order
 *      creation, persists to `Order.fbEventId`. Both the CAPI fire (server)
 *      and the Pixel fire (confirmation page) read this value, so Meta
 *      dedupes them.
 *   2. Client-side hot-path events (ViewContent, AddToCart,
 *      InitiateCheckout) — generated in the browser; same value used for
 *      both the local `fbq` call and the relay POST body.
 *
 * `crypto.randomUUID()` is Web-Crypto / Node-Crypto standard — works
 * identically in both environments. No `uuid` library dependency needed.
 */
export function newFbEventId(): string {
  return crypto.randomUUID();
}
