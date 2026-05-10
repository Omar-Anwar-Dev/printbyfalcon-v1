/**
 * Sprint 15 — Meta Pixel + Conversions API shared types.
 *
 * One source of truth for event names + payload shapes used by both the
 * browser-side Pixel helper (`pixel.ts`) and the server-side CAPI relay
 * (`app/api/tracking/capi/route.ts` + `capi.ts`).
 *
 * `event_id` is the dedupe key. Pixel fire and CAPI fire for the same
 * logical event MUST use the same `event_id` so Meta merges them.
 *
 * Currency for this site is always 'EGP'. Hard-coded as a default in the
 * helpers; never accept user input that overrides it.
 */

export type FbEventName =
  | 'PageView'
  | 'ViewContent'
  | 'AddToCart'
  | 'InitiateCheckout'
  | 'Purchase';

/**
 * Per-item shape for `contents`. Meta's docs accept either a list of
 * `content_ids` (simple) or a list of `contents` (with quantity + price per
 * item). We always send `contents` because it gives Meta richer signal for
 * Catalog Sales attribution if owner enables it later.
 */
export type FbContentItem = {
  id: string;
  quantity: number;
  item_price?: number;
};

/**
 * Standard `custom_data` block Meta expects for e-commerce events. All
 * fields optional at the type level; the helpers populate the right
 * subset for each event name.
 */
export type FbCustomData = {
  /** Total value of the event in EGP. Required for AddToCart / Purchase / InitiateCheckout. */
  value?: number;
  /** Always 'EGP' for this site. */
  currency?: 'EGP';
  /** Array of product IDs the event references. */
  content_ids?: string[];
  content_type?: 'product';
  content_name?: string;
  content_category?: string;
  contents?: FbContentItem[];
  num_items?: number;
  /** Human-readable order number — surfaces in Events Manager for debugging. */
  order_id?: string;
};

/**
 * User-data block sent ONLY to CAPI (Pixel reads its own first-party
 * cookies). Email + phone are RAW here; the server-side helper hashes
 * them with SHA-256 before forwarding to Meta. Never log raw values.
 */
export type FbUserData = {
  email?: string | null;
  phone?: string | null;
};

/**
 * Payload shape the browser POSTs to `/api/tracking/capi`. The relay
 * endpoint adds the bits only the server can see (IP, User-Agent, fbp/fbc
 * cookies) before forwarding to graph.facebook.com.
 */
export type RelayPayload = {
  eventName: FbEventName;
  eventId: string;
  /** Unix seconds. Defaults to "now" if omitted. */
  eventTime?: number;
  customData?: FbCustomData;
  userData?: FbUserData;
  /** `event_source_url` — the page the user was on when the event fired. */
  sourceUrl?: string;
};
