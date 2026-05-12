/**
 * Server-side Meta Conversions API client.
 *
 * Meta CAPI docs: https://developers.facebook.com/docs/marketing-api/conversions-api/
 * Graph API base: https://graph.facebook.com/{version}/{pixel_id}/events
 *
 * Used by:
 *   - `app/api/tracking/capi/route.ts` (relay for client-driven events:
 *     PageView, ViewContent, AddToCart, InitiateCheckout)
 *   - `app/api/webhooks/paymob/route.ts` (server-direct Purchase fire on
 *     `paymentStatus = PAID` transition for card orders)
 *   - `app/actions/checkout.ts` (server-direct Purchase fire on COD order
 *     creation, where there's no later webhook moment)
 *
 * Hard rules:
 *   - Failures NEVER throw. Caller gets `{ ok: false, error }` and decides
 *     to swallow. Tracking failure must not block payments / orders / UX.
 *   - 5-second hard timeout. Meta outage can't stack up requests.
 *   - PII (email, phone) is hashed via `hash.ts` before send. Never log raw.
 *   - `event_id` is the dedupe key — must match the Pixel fire's `eventID`.
 */
import { logger } from '@/lib/logger';
import { hashEmail, hashPhone } from './hash';
import type { FbCustomData, FbEventName } from './events';

const GRAPH_API_VERSION = 'v19.0';
const TIMEOUT_MS = 5000;

type SendCapiInput = {
  eventName: FbEventName;
  eventId: string;
  /** Unix seconds. Defaults to "now". */
  eventTime?: number;
  customData?: FbCustomData;
  userData: {
    email?: string | null;
    phone?: string | null;
    /** Real client IP (use `getClientIp` from `lib/request-ip.ts`). */
    clientIp?: string | null;
    userAgent?: string | null;
    /** `_fbp` cookie value the browser sets via fbevents.js. */
    fbp?: string | null;
    /** `_fbc` cookie value (last-click attribution). */
    fbc?: string | null;
  };
  /** `event_source_url` — page the event was triggered from. */
  sourceUrl?: string;
};

export type CapiResult = { ok: true } | { ok: false; error: string };

/**
 * Returns `{ ok: true }` immediately if Pixel ID or access token aren't
 * configured (dev / staging without secrets) — silently no-ops so callers
 * don't need to guard. Production deploys MUST set both env vars.
 */
export async function sendCapiEvent(input: SendCapiInput): Promise<CapiResult> {
  const pixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID;
  const accessToken = process.env.META_CAPI_ACCESS_TOKEN;
  if (!pixelId || !accessToken) {
    return { ok: true };
  }

  // Build user_data block. Meta expects array values for hashed fields
  // even when there's only one entry (their format, not ours).
  const userData: Record<string, string | string[]> = {};
  const emHash = hashEmail(input.userData.email);
  if (emHash) userData.em = [emHash];
  const phHash = hashPhone(input.userData.phone);
  if (phHash) userData.ph = [phHash];
  if (input.userData.clientIp)
    userData.client_ip_address = input.userData.clientIp;
  if (input.userData.userAgent)
    userData.client_user_agent = input.userData.userAgent;
  if (input.userData.fbp) userData.fbp = input.userData.fbp;
  if (input.userData.fbc) userData.fbc = input.userData.fbc;

  const eventBody: Record<string, unknown> = {
    event_name: input.eventName,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: 'website',
    user_data: userData,
  };
  if (input.customData) eventBody.custom_data = input.customData;
  if (input.sourceUrl) eventBody.event_source_url = input.sourceUrl;

  const payload: Record<string, unknown> = { data: [eventBody] };
  if (process.env.META_CAPI_TEST_EVENT_CODE) {
    payload.test_event_code = process.env.META_CAPI_TEST_EVENT_CODE;
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      logger.warn(
        {
          status: res.status,
          eventName: input.eventName,
          eventId: input.eventId,
          // First 500 chars of Meta's error response — usually has a
          // helpful `error.message` JSON.
          errText: errText.slice(0, 500),
        },
        'capi.send.non_2xx',
      );
      return {
        ok: false,
        error: `${res.status}: ${errText.slice(0, 200)}`,
      };
    }
    logger.info(
      { eventName: input.eventName, eventId: input.eventId },
      'capi.send.ok',
    );
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // AbortError (timeout) shows up here too.
    logger.warn(
      { err: msg, eventName: input.eventName, eventId: input.eventId },
      'capi.send.failed',
    );
    return { ok: false, error: msg };
  } finally {
    clearTimeout(timer);
  }
}
