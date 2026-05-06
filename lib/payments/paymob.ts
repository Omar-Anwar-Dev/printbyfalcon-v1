/**
 * Paymob Accept client — minimal surface for Sprint 4 (card flow only).
 * Fawry sub-integration support lands in Sprint 9 per ADR-025 by switching
 * `integration_id` in the payment-key request.
 *
 * Flow (hosted-iframe, 3 API calls):
 *  1. POST /api/auth/tokens                           → auth_token
 *  2. POST /api/ecommerce/orders (with auth_token)    → paymob order id
 *  3. POST /api/acceptance/payment_keys (with auth)   → payment_key
 *  4. Redirect the user to the iframe URL with payment_key
 *     https://accept.paymob.com/api/acceptance/iframes/{IFRAME_ID}?payment_token={payment_key}
 *
 * Dev mode: if PAYMOB_API_KEY is not set, returns a stub that points at a
 * local confirmation page so developers can exercise the full flow without
 * Paymob sandbox credentials.
 */
import { logger } from '@/lib/logger';
import { getPaymentMode } from '@/lib/settings/payment';

const BASE = 'https://accept.paymob.com/api';

export type PaymobItem = {
  name: string;
  amount_cents: number;
  description: string;
  quantity: number;
};

export type CreatePaymentKeyInput = {
  /// Our Order.id — used as `merchant_order_id` for idempotency on the Paymob side.
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
  /// 'card' (Visa/Mastercard/Meeza) / 'fawry' (pay-at-outlet) / 'wallet'
  /// (mobile wallets). Each maps to a distinct PAYMOB_INTEGRATION_ID env var.
  integrationKind?: 'card' | 'fawry' | 'wallet';
};

export type CreatePaymentKeyOutput = {
  paymentKey: string;
  paymobOrderId: string;
  iframeUrl: string;
};

function env(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim().length > 0 ? v.trim() : undefined;
}

/**
 * Sprint 11.5 — mode-aware env reader. When `payment.mode = TEST` we look
 * for `<NAME>_TEST` first (e.g. `PAYMOB_API_KEY_TEST`); if it's not set, we
 * fall back to the regular var. This lets owners keep TEST + LIVE keys side
 * by side in `.env.production` and flip between them from the admin UI
 * without redeploying.
 */
function envForMode(name: string, mode: 'LIVE' | 'TEST'): string | undefined {
  if (mode === 'TEST') {
    const test = env(`${name}_TEST`);
    if (test) return test;
  }
  return env(name);
}

function integrationIdFor(
  kind: 'card' | 'fawry' | 'wallet',
  mode: 'LIVE' | 'TEST',
): string | undefined {
  if (kind === 'fawry') return envForMode('PAYMOB_INTEGRATION_ID_FAWRY', mode);
  if (kind === 'wallet')
    return envForMode('PAYMOB_INTEGRATION_ID_WALLET', mode);
  return envForMode('PAYMOB_INTEGRATION_ID_CARD', mode);
}

export function isPaymobConfigured(
  kind: 'card' | 'fawry' | 'wallet' = 'card',
): boolean {
  // Synchronous variant — checks the current LIVE keys only. Used by Sprint 4
  // checks that don't have an async context. Mode-aware version lives in
  // `createPaymentKey` itself.
  return Boolean(
    env('PAYMOB_API_KEY') &&
    integrationIdFor(kind, 'LIVE') &&
    env('PAYMOB_IFRAME_ID') &&
    env('PAYMOB_HMAC_SECRET'),
  );
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as T & { message?: string; detail?: string };
  if (!res.ok) {
    throw new Error(
      `Paymob ${path} HTTP ${res.status}: ${json.message ?? json.detail ?? 'unknown error'}`,
    );
  }
  return json;
}

export async function createPaymentKey(
  input: CreatePaymentKeyInput,
): Promise<CreatePaymentKeyOutput> {
  const kind = input.integrationKind ?? 'card';
  // Sprint 11.5 — read the admin-controlled mode from DB. TEST mode prefers
  // `<NAME>_TEST` env vars, falling back to the regular set if not present.
  const mode = await getPaymentMode();
  const apiKey = envForMode('PAYMOB_API_KEY', mode);
  const integrationId = integrationIdFor(kind, mode);
  const iframeId = envForMode('PAYMOB_IFRAME_ID', mode);

  if (!apiKey || !integrationId || !iframeId) {
    // Dev-mode stub — points at our own confirmation page with a fake
    // transaction id so the rest of the flow can be developed/tested.
    // `/ar/` locale prefix is required because next-intl's middleware rewrites
    // all non-prefixed URLs. Arabic is the default locale; on the stub page
    // itself the language switcher still works.
    logger.warn(
      { merchantOrderId: input.merchantOrderId, kind, mode },
      'paymob.dev_mode.stub',
    );
    const fakeKey = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    return {
      paymentKey: fakeKey,
      paymobOrderId: `dev-${input.merchantOrderId}`,
      iframeUrl: `/ar/payments/paymob/dev-stub?key=${fakeKey}&order=${encodeURIComponent(input.merchantOrderId)}`,
    };
  }

  // Step 1 — auth token
  const auth = await postJson<{ token: string }>(`/auth/tokens`, {
    api_key: apiKey,
  });

  // Step 2 — paymob order
  const order = await postJson<{ id: number | string }>(`/ecommerce/orders`, {
    auth_token: auth.token,
    delivery_needed: 'false',
    amount_cents: String(input.amountCents),
    currency: 'EGP',
    merchant_order_id: input.merchantOrderId,
    items: input.items,
  });

  // Step 3 — payment key
  const key = await postJson<{ token: string }>(`/acceptance/payment_keys`, {
    auth_token: auth.token,
    amount_cents: String(input.amountCents),
    expiration: 3600, // 1 hour
    order_id: String(order.id),
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
    currency: 'EGP',
    integration_id: integrationId,
  });

  return {
    paymentKey: key.token,
    paymobOrderId: String(order.id),
    iframeUrl: `${BASE}/acceptance/iframes/${iframeId}?payment_token=${encodeURIComponent(key.token)}`,
  };
}

/**
 * Verify a Paymob callback HMAC per their documented concatenation:
 * https://docs.paymob.com/v1/docs/hmac-calculation
 * The fields in the concatenation (order matters) are the shared set of keys
 * emitted on both processed-payment and delivery-confirmation webhooks.
 */
export function verifyPaymobHmac(
  payload: Record<string, unknown>,
  providedHmac: string,
): boolean {
  // Sprint 11.5 — try LIVE secret first, then TEST. Late-arriving webhooks
  // for orders placed before a mode flip should still verify correctly.
  // Both secrets are unique per merchant account so the chance of an
  // accidental cross-mode match is negligible.
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
