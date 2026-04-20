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
 *   headers: { "X-Webhook-Token": <WHATS360_WEBHOOK_SECRET> }
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
 * Auth: constant-time compare against WHATS360_WEBHOOK_SECRET. Bad/absent
 * header → 401 (not 403/404, so the failure mode is obvious in logs). No
 * secret set in env → we reject everything (fail-closed). Like the Paymob
 * webhook we always return 200 on logical errors (bad state, unknown event)
 * so Whats360 doesn't retry-storm — anything unusual is in the logs.
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

  const supplied = request.headers.get('x-webhook-token') ?? '';
  if (!constantTimeEq(expected, supplied)) {
    logger.warn(
      { suppliedLength: supplied.length },
      'whats360.webhook.auth_failed',
    );
    return NextResponse.json(
      { status: 'error', message: 'invalid webhook token' },
      { status: 401 },
    );
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    logger.warn({}, 'whats360.webhook.invalid_json');
    return NextResponse.json(
      { status: 'error', message: 'invalid json' },
      { status: 400 },
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
