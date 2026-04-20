import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  constantTimeEq,
  normalizeWhats360Event,
  pickWhats360String,
} from '@/lib/whats360-webhook';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Whats360 custom-webhook receiver (Sprint 5 S5-D2-T3 · ADR-033).
 *
 *   POST /api/webhooks/whats360
 *   body:    { event, message_id?, phone?, message?, status?, reason?, ... }
 *
 * Whats360 lets us subscribe to 4 event types per their docs:
 *   - outgoing message     — mirror of what we sent (acknowledgement)
 *   - send failure         — WhatsApp refused the send after we dispatched
 *   - incoming message     — customer replied / messaged the device
 *   - subscription expiry  — our Whats360 plan quota / subscription ended
 *
 * The payload field names vary a little between event types; we're defensive
 * about extraction (treat everything as optional). For MVP we only act on
 * `send failure` (flip Notification to FAILED) and `subscription expiry`
 * (critical admin alert via audit log + error log). The other two are logged
 * at info level so traffic is observable without touching state.
 *
 * Auth: the Whats360 dashboard exposes a single "Secret" field but does not
 * document where in the HTTP request that secret arrives. Rather than guess,
 * we accept the secret from ANY of the common locations and verify with
 * constant-time equality:
 *   - Headers: X-Webhook-Token, X-Webhook-Secret, X-Secret, X-Signature,
 *              Authorization (raw or "Bearer <secret>")
 *   - Query params: ?secret, ?token, ?webhook_secret
 *   - JSON body fields: secret, token, webhook_secret, signature
 * After the first successful live webhook we log which location actually
 * carried the value (without the value itself) — if a single convention
 * emerges we can tighten this to one location in a follow-up.
 *
 * No secret set in env → fail-closed (401). Missing secret in request → 401.
 * Like the Paymob webhook we return 200 on logical errors so Whats360 doesn't
 * retry-storm — anything unusual ends up in the logs.
 */
export async function POST(request: Request) {
  const expected = process.env.WHATS360_WEBHOOK_SECRET;
  if (!expected) {
    logger.error({}, 'whats360.webhook.secret_missing');
    return NextResponse.json(
      { status: 'error', message: 'webhook secret not configured' },
      { status: 401 },
    );
  }

  // Parse the body first so we can also check body-level secret candidates.
  // `request.text()` is safe to call before a failed-auth 401 — this handler
  // is only reachable through Cloudflare + our own Nginx proxy; a pre-auth
  // body read adds no new attack surface vs the prior header-only check.
  const rawBody = await request.text();
  let body: Record<string, unknown> = {};
  try {
    body = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : {};
  } catch {
    logger.warn({}, 'whats360.webhook.invalid_json');
    return NextResponse.json(
      { status: 'error', message: 'invalid json' },
      { status: 400 },
    );
  }

  const url = new URL(request.url);
  const authHeader = request.headers.get('authorization') ?? '';
  const authToken = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : authHeader.trim();

  const candidates: { location: string; value: string }[] = [
    {
      location: 'header:x-webhook-token',
      value: request.headers.get('x-webhook-token') ?? '',
    },
    {
      location: 'header:x-webhook-secret',
      value: request.headers.get('x-webhook-secret') ?? '',
    },
    {
      location: 'header:x-secret',
      value: request.headers.get('x-secret') ?? '',
    },
    {
      location: 'header:x-signature',
      value: request.headers.get('x-signature') ?? '',
    },
    { location: 'header:authorization', value: authToken },
    { location: 'query:secret', value: url.searchParams.get('secret') ?? '' },
    { location: 'query:token', value: url.searchParams.get('token') ?? '' },
    {
      location: 'query:webhook_secret',
      value: url.searchParams.get('webhook_secret') ?? '',
    },
    {
      location: 'body:secret',
      value:
        pickWhats360String(body, [
          'secret',
          'token',
          'webhook_secret',
          'signature',
        ]) ?? '',
    },
  ].filter((c) => c.value.length > 0);

  const matchedLocation = candidates.find((c) =>
    constantTimeEq(expected, c.value),
  )?.location;

  // Diagnostic log (presence only, never the value) so we can observe the
  // actual Whats360 convention from real staging traffic.
  logger.info(
    {
      candidatePresence: candidates.map((c) => c.location),
      matchedLocation: matchedLocation ?? null,
    },
    'whats360.webhook.auth_debug',
  );

  if (!matchedLocation) {
    logger.warn(
      { candidateCount: candidates.length },
      'whats360.webhook.auth_failed',
    );
    return NextResponse.json(
      { status: 'error', message: 'invalid webhook token' },
      { status: 401 },
    );
  }

  const event = pickWhats360String(body, [
    'event',
    'type',
    'event_type',
    'eventType',
  ]);
  const messageId = pickWhats360String(body, [
    'message_id',
    'messageId',
    'id',
    'external_message_id',
  ]);
  const phone = pickWhats360String(body, ['phone', 'jid', 'to']);
  const reason = pickWhats360String(body, [
    'error',
    'reason',
    'failure_reason',
    'message',
  ]);

  logger.info({ event, messageId, phone }, 'whats360.webhook.received');

  switch (normalizeWhats360Event(event)) {
    case 'send_failure':
      await handleSendFailure({ messageId, reason });
      break;
    case 'subscription_expiry':
      await handleSubscriptionExpiry({ reason });
      break;
    case 'outgoing_message':
    case 'incoming_message':
      // Observational — no state change.
      break;
    default:
      logger.warn({ event, body }, 'whats360.webhook.unknown_event');
  }

  return NextResponse.json({
    status: 'success',
    message: 'Webhook received successfully',
  });
}

async function handleSendFailure(args: {
  messageId: string | null;
  reason: string | null;
}) {
  if (!args.messageId) {
    logger.warn(
      { reason: args.reason },
      'whats360.webhook.send_failure.no_message_id',
    );
    return;
  }

  const updated = await prisma.notification.updateMany({
    where: {
      externalMessageId: args.messageId,
      // only flip non-terminal rows; once FAILED, stay FAILED
      status: { in: ['PENDING', 'SENT'] },
    },
    data: {
      status: 'FAILED',
      errorMessage: args.reason ?? 'send failure (Whats360)',
    },
  });

  logger.info(
    { messageId: args.messageId, flipped: updated.count },
    'whats360.webhook.send_failure.processed',
  );
}

async function handleSubscriptionExpiry(args: { reason: string | null }) {
  // Critical alert — surface to audit log + error level so it shows up in
  // GlitchTip + the ops dashboard (admin alert widget lands in S5-D6-T3).
  await prisma.auditLog.create({
    data: {
      action: 'whats360.subscription_expired',
      entityType: 'Whats360',
      entityId: 'instance',
      before: null as never,
      after: { reason: args.reason ?? 'unknown' } as never,
      note: 'Whats360 subscription / quota ended — outgoing WhatsApp disabled until renewed.',
    },
  });
  logger.error({ reason: args.reason }, 'whats360.subscription_expired');
}
