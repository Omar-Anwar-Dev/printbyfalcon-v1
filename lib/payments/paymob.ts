/**
 * Paymob Unified Checkout client (Sprint 11.6 — replaces the legacy iframe
 * Payment Keys flow).
 *
 * Old flow (3 API calls, embedded iframe):
 *   POST /api/auth/tokens
 *   POST /api/ecommerce/orders
 *   POST /api/acceptance/payment_keys
 *   redirect → accept.paymob.com/api/acceptance/iframes/<IFRAME_ID>?payment_token=...
 *
 * New flow (1 API call, hosted Unified Checkout page at accept.paymob.com):
 *   POST /v1/intention/  (Authorization: Token <SECRET_KEY>)
 *     → returns { client_secret, intention_order_id, id }
 *   redirect → accept.paymob.com/unifiedcheckout/?publicKey=<PK>&clientSecret=<CS>
 *
 * Why we migrated:
 *   - The customer picks card / wallet / Fawry on Paymob's branded hosted
 *     page instead of in our /checkout UI — fewer screens, mobile-friendly.
 *   - One integration ID per merchant covers all card schemes; wallet/fawry
 *     can be enabled later by adding their integration IDs to env.
 *   - Removes the iframe embed (hostname mismatch + 3DS popup hassles).
 *   - Single Secret Key auth (`Authorization: Token <SK>`) — no separate
 *     auth/tokens round trip.
 *
 * Webhook semantics are unchanged — Paymob still POSTs the same TRANSACTION
 * event with the same 20-field SHA512 HMAC, so `verifyPaymobHmac` below is
 * carried over without modification. The webhook handler at
 * `app/api/webhooks/paymob/route.ts` looks up our Order by
 * `obj.order.merchant_order_id`, which we set via `special_reference` in the
 * intention payload.
 *
 * Dev mode: if PAYMOB_PUBLIC_KEY / PAYMOB_SECRET_KEY are not set, returns a
 * stub that points at our own confirmation page so developers can exercise
 * the full flow without sandbox credentials.
 */
import { logger } from '@/lib/logger';
import { getPaymentMode } from '@/lib/settings/payment';

const BASE = 'https://accept.paymob.com';
const INTENTION_PATH = '/v1/intention/';
const UNIFIED_CHECKOUT_PATH = '/unifiedcheckout/';

export type PaymobItem = {
  name: string;
  amount_cents: number;
  description: string;
  quantity: number;
};

export type CreatePaymentIntentionInput = {
  /// Our Order.id — used as `special_reference` (mirrors onto the webhook's
  /// `obj.order.merchant_order_id` field) and stashed in `extras` for audit.
  merchantOrderId: string;
  /// Total in piastres (EGP × 100).
  amountCents: number;
  items: PaymobItem[];
  billing: {
    firstName: string;
    lastName: string;
    phoneNumber: string; // E.164 with leading +
    email: string;
    country: string; // ISO-2 ('EG')
    city: string;
    street: string;
    apartment?: string;
    building?: string;
    floor?: string;
    postalCode?: string;
    state?: string;
  };
  /// Optional per-request webhook URL. When set, sent as `notification_url`
  /// in the intention payload and **overrides** the integration-level
  /// "Transaction Processed Callback" configured in the Paymob dashboard.
  /// Use this to:
  ///   1. Avoid relying on Paymob's dashboard caching (we hit a case where
  ///      the dashboard saved the URL but the notification engine kept the
  ///      old value — historical issue from the legacy flow).
  ///   2. Point staging traffic at staging URL even when the LIVE merchant
  ///      account is shared (single source of truth lives in our env).
  notificationUrl?: string;
  /// Optional per-request browser-redirect URL. Sent as `redirection_url`
  /// in the intention payload — overrides the integration-level
  /// "Transaction Response Callback". Customer lands here after Paymob
  /// completes the transaction (success or failure). Typically points at
  /// our /order/confirmed/[id] page so the customer sees their own order.
  redirectionUrl?: string;
};

export type CreatePaymentIntentionOutput = {
  /// Paymob's `client_secret` — paired with the Public Key in the URL fragment
  /// of the Unified Checkout page. Single-use, expires after the intention
  /// completes or times out.
  clientSecret: string;
  /// Paymob's `intention_order_id` — stored on Order.paymobOrderId for the
  /// reconciliation worker to query later.
  paymobOrderId: string;
  /// Fully-built Unified Checkout URL. Customer redirects to this; the page
  /// itself is hosted by Paymob and shows whichever payment_methods we
  /// included in the intention.
  checkoutUrl: string;
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Mode-aware env reader. When `payment.mode = TEST` we look for `<NAME>_TEST`
 * first (e.g. `PAYMOB_SECRET_KEY_TEST`); if it's not set, we fall back to the
 * regular var. This lets owners keep TEST + LIVE keys side by side in
 * `.env.production` and flip between them from the admin UI without
 * redeploying.
 */
function envForMode(name: string, mode: 'LIVE' | 'TEST'): string | undefined {
  if (mode === 'TEST') {
    const test = env(`${name}_TEST`);
    if (test) return test;
  }
  return env(name);
}

/**
 * Synchronous configured-check used by callers that don't have an async
 * context (notably the dev-stub page guard). Checks the LIVE keyset only —
 * the runtime path in `createPaymentIntention` is mode-aware.
 */
export function isPaymobConfigured(): boolean {
  return Boolean(
    env('PAYMOB_PUBLIC_KEY') &&
    env('PAYMOB_SECRET_KEY') &&
    env('PAYMOB_INTEGRATION_ID_CARD') &&
    env('PAYMOB_HMAC_SECRET'),
  );
}

/**
 * Build the array of Paymob integration IDs to expose on the Unified Checkout
 * page for this intention. CARD is the canonical / always-on integration in
 * Sprint 11.6; WALLET + FAWRY are opt-in via env (only included when their
 * env var pair is set in the active mode).
 */
function buildPaymentMethods(mode: 'LIVE' | 'TEST'): number[] {
  const ids: number[] = [];
  const card = envForMode('PAYMOB_INTEGRATION_ID_CARD', mode);
  const wallet = envForMode('PAYMOB_INTEGRATION_ID_WALLET', mode);
  const fawry = envForMode('PAYMOB_INTEGRATION_ID_FAWRY', mode);
  for (const v of [card, wallet, fawry]) {
    if (!v) continue;
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) ids.push(n);
  }
  return ids;
}

export async function createPaymentIntention(
  input: CreatePaymentIntentionInput,
): Promise<CreatePaymentIntentionOutput> {
  const mode = await getPaymentMode();
  const publicKey = envForMode('PAYMOB_PUBLIC_KEY', mode);
  const secretKey = envForMode('PAYMOB_SECRET_KEY', mode);
  const paymentMethods = buildPaymentMethods(mode);

  if (!publicKey || !secretKey || paymentMethods.length === 0) {
    // Dev-mode stub — points at our own confirmation page with a fake
    // client secret so the rest of the flow can be developed/tested. The
    // `/ar/` locale prefix is required because next-intl's middleware rewrites
    // all non-prefixed URLs.
    logger.warn(
      { merchantOrderId: input.merchantOrderId, mode },
      'paymob.intention.dev_stub',
    );
    const fakeKey = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return {
      clientSecret: fakeKey,
      paymobOrderId: `dev-${input.merchantOrderId}`,
      checkoutUrl: `/ar/payments/paymob/dev-stub?key=${fakeKey}&order=${encodeURIComponent(input.merchantOrderId)}`,
    };
  }

  // Body shape per Paymob Intention API docs:
  //   - `amount` (integer cents, smallest unit)
  //   - `payment_methods` array of integration IDs
  //   - `items[].amount` mirrors the same cents convention
  //   - `billing_data` keys mostly mirror the legacy payment_keys body
  //   - `special_reference` becomes `obj.order.merchant_order_id` on the
  //     webhook side (our handler uses this to find the Order)
  //   - `extras.merchant_order_id` is preserved through to the webhook for
  //     our own audit / debugging — duplicates `special_reference`
  //   - `notification_url` + `redirection_url` override dashboard defaults
  const body: Record<string, unknown> = {
    amount: input.amountCents,
    currency: 'EGP',
    payment_methods: paymentMethods,
    items: input.items.map((i) => ({
      name: i.name,
      amount: i.amount_cents,
      description: i.description,
      quantity: i.quantity,
    })),
    billing_data: {
      apartment: input.billing.apartment ?? 'NA',
      email: input.billing.email,
      floor: input.billing.floor ?? 'NA',
      first_name: input.billing.firstName,
      street: input.billing.street,
      building: input.billing.building ?? 'NA',
      phone_number: input.billing.phoneNumber,
      shipping_method: 'NA',
      postal_code: input.billing.postalCode ?? 'NA',
      city: input.billing.city,
      country: input.billing.country,
      last_name: input.billing.lastName,
      state: input.billing.state ?? 'NA',
    },
    customer: {
      first_name: input.billing.firstName,
      last_name: input.billing.lastName,
      email: input.billing.email,
      extras: { merchant_order_id: input.merchantOrderId },
    },
    extras: { merchant_order_id: input.merchantOrderId },
    special_reference: input.merchantOrderId,
  };
  if (input.notificationUrl) body.notification_url = input.notificationUrl;
  if (input.redirectionUrl) body.redirection_url = input.redirectionUrl;

  const res = await fetch(`${BASE}${INTENTION_PATH}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Paymob Intention API uses the "Token <SK>" scheme (NOT Bearer).
      Authorization: `Token ${secretKey}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as {
    id?: string;
    client_secret?: string;
    intention_order_id?: number | string;
    detail?: string;
    message?: string;
    errors?: unknown;
  };
  if (!res.ok || !json.client_secret) {
    const detail =
      json.detail ??
      json.message ??
      (json.errors ? JSON.stringify(json.errors) : 'unknown');
    throw new Error(`Paymob intention HTTP ${res.status}: ${detail}`);
  }

  // The intention `id` (UUID) is what the reconciliation worker uses to
  // query intention status via GET /v1/intention/<id>/ with the Secret Key.
  // Fall back to `intention_order_id` (numeric) if Paymob ever drops the
  // UUID field. The webhook later overwrites this with `obj.order.id`
  // (numeric) once payment processes — that's a harmless rotation since
  // reconciliation only runs while paymentStatus = PENDING (pre-webhook).
  const paymobOrderId = String(json.id ?? json.intention_order_id ?? '');
  const checkoutUrl =
    `${BASE}${UNIFIED_CHECKOUT_PATH}` +
    `?publicKey=${encodeURIComponent(publicKey)}` +
    `&clientSecret=${encodeURIComponent(json.client_secret)}`;

  return {
    clientSecret: json.client_secret,
    paymobOrderId,
    checkoutUrl,
  };
}

/**
 * Verify a Paymob callback HMAC per their documented concatenation:
 * https://docs.paymob.com/v1/docs/hmac-calculation
 *
 * The 20-field SHA512 recipe is unchanged across the legacy iframe flow and
 * the new Unified Checkout flow — Paymob still emits the same TRANSACTION
 * event payload to webhooks regardless of which checkout surface produced
 * the transaction. This means Sprint 11.6 carries the verifier forward
 * without alteration.
 */
export function verifyPaymobHmac(
  payload: Record<string, unknown>,
  providedHmac: string,
): boolean {
  // Try LIVE secret first, then TEST. Late-arriving webhooks for orders
  // placed before a mode flip should still verify correctly. Both secrets
  // are unique per merchant account so the chance of an accidental
  // cross-mode match is negligible.
  const liveSecret = env('PAYMOB_HMAC_SECRET');
  const testSecret = env('PAYMOB_HMAC_SECRET_TEST');
  const secrets = [liveSecret, testSecret].filter((s): s is string =>
    Boolean(s),
  );
  if (secrets.length === 0) {
    logger.warn({}, 'paymob.hmac.no_secret_configured');
    return false;
  }
  const obj = payload as Record<string, unknown>;

  // Flatten: Paymob nests `obj` under `obj` inside the outer payload.
  // Webhook ships `{ type, obj: { ... } }`; the HMAC uses the inner object.
  const inner =
    (obj as { obj?: Record<string, unknown> }).obj ??
    (obj as Record<string, unknown>);
  const source = inner as Record<string, unknown>;
  const orderObj = (source.order as Record<string, unknown>) ?? {};
  const sourceData = (source.source_data as Record<string, unknown>) ?? {};

  const concat = [
    source.amount_cents,
    source.created_at,
    source.currency,
    source.error_occured,
    source.has_parent_transaction,
    source.id,
    source.integration_id,
    source.is_3d_secure,
    source.is_auth,
    source.is_capture,
    source.is_refunded,
    source.is_standalone_payment,
    source.is_voided,
    orderObj.id,
    source.owner,
    source.pending,
    sourceData.pan,
    sourceData.sub_type,
    sourceData.type,
    source.success,
  ]
    .map((v) => (v == null ? '' : String(v)))
    .join('');

  // HMAC-SHA512, hex — try each candidate secret. Constant-time compare
  // against each so a TEST secret that doesn't match doesn't leak timing
  // info about the LIVE secret (or vice versa).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('node:crypto') as typeof import('node:crypto');
  let providedBuf: Buffer;
  try {
    providedBuf = Buffer.from(providedHmac, 'hex');
  } catch {
    return false;
  }
  for (const secret of secrets) {
    const computed = crypto
      .createHmac('sha512', secret)
      .update(concat)
      .digest('hex');
    if (providedHmac.length !== computed.length) continue;
    let computedBuf: Buffer;
    try {
      computedBuf = Buffer.from(computed, 'hex');
    } catch {
      continue;
    }
    if (computedBuf.length !== providedBuf.length) continue;
    if (crypto.timingSafeEqual(computedBuf, providedBuf)) return true;
  }
  return false;
}
