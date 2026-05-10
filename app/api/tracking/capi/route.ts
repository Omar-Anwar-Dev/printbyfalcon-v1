/**
 * Sprint 15 — Meta Conversions API relay.
 *
 *   POST /api/tracking/capi
 *   body: RelayPayload (see lib/tracking/events.ts)
 *
 * Browser-side `fbq('track', ...)` fires the Pixel; this relay is its
 * server-side mirror. Same `eventId` on both = Meta dedupes. Without the
 * mirror, Pixel data drops 25–35% on iOS 14.5+ (ATT) and ~5–10% from
 * desktop ad-blockers.
 *
 * Server-direct events (Purchase from Paymob webhook + COD checkout) call
 * `sendCapiEvent` directly and skip this endpoint — Purchase deserves the
 * extra reliability of bypassing the browser entirely.
 *
 * Defensive rules:
 *   - **Never accept `Purchase`** here. That event must come from the
 *     server-of-truth (paymob webhook / checkout action). Accepting it
 *     here would let a hostile client inject fake conversions.
 *   - Always return 202 quickly — failures are logged but never bubbled to
 *     the client. Tracking 5xx must not break shopping.
 *   - Rate-limit per IP. Reuses the `webhook` rule (1000/min) which is
 *     calibrated for high-volume per-IP machine traffic.
 */
import { NextResponse } from 'next/server';
import { getOptionalUser } from '@/lib/auth';
import { logger } from '@/lib/logger';
import { checkAndIncrement, RATE_LIMIT_RULES } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request-ip';
import { sendCapiEvent } from '@/lib/tracking/capi';
import type { FbEventName, RelayPayload } from '@/lib/tracking/events';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ALLOWED_EVENTS: ReadonlySet<FbEventName> = new Set([
  'PageView',
  'ViewContent',
  'AddToCart',
  'InitiateCheckout',
]);

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

/** Read a single cookie value off the `cookie` header. */
function getCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return rest.join('=') || null;
  }
  return null;
}

export async function POST(request: Request) {
  const ip = getClientIp(request.headers) ?? 'unknown';

  // Rate limit per IP. Returns 202 even on trip — never tell the client
  // about throttling for a tracking endpoint (no behavior change for the
  // user; keeps the API surface minimal).
  const rl = await checkAndIncrement(
    RATE_LIMIT_RULES.webhook,
    `capi-relay:${ip}`,
  );
  if (!rl.allowed) {
    return NextResponse.json({ ok: true, throttled: true }, { status: 202 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: true, badJson: true }, { status: 202 });
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: true, badShape: true }, { status: 202 });
  }
  const payload = body as Partial<RelayPayload>;

  if (!isString(payload.eventName) || !isString(payload.eventId)) {
    return NextResponse.json(
      { ok: true, missingFields: true },
      { status: 202 },
    );
  }
  if (!ALLOWED_EVENTS.has(payload.eventName as FbEventName)) {
    // Most likely culprit: client tried to send `Purchase` through here.
    // Log loudly so we'd notice if a refactor broke the server-direct path.
    logger.warn(
      { eventName: payload.eventName },
      'capi.relay.rejected_event_name',
    );
    return NextResponse.json({ ok: true, rejected: true }, { status: 202 });
  }

  // Hydrate user data from the session if available. B2C users typically
  // have phone (OTP login); B2B and admins have email + sometimes phone.
  // Guests have neither — Meta still matches via fbp/fbc/IP/UA which we
  // always include.
  const user = await getOptionalUser().catch(() => null);

  const cookieHeader = request.headers.get('cookie');
  const fbp = getCookie(cookieHeader, '_fbp');
  const fbc = getCookie(cookieHeader, '_fbc');
  const userAgent = request.headers.get('user-agent');

  // Fire-and-forget from the client's perspective — we still await so any
  // logging happens, but we always return 202. `sendCapiEvent` has its own
  // 5s hard timeout so this can't hang the request.
  await sendCapiEvent({
    eventName: payload.eventName as FbEventName,
    eventId: payload.eventId,
    eventTime: payload.eventTime,
    customData: payload.customData,
    sourceUrl: payload.sourceUrl,
    userData: {
      email: user?.email ?? payload.userData?.email ?? null,
      phone: user?.phone ?? payload.userData?.phone ?? null,
      clientIp: ip,
      userAgent,
      fbp,
      fbc,
    },
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
