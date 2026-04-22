/**
 * Customer-initiated WhatsApp opt-out (Sprint 11 S11-D6-T3).
 *
 * Policy:
 *   - Recipient messages `STOP` / `إلغاء` / `UNSUBSCRIBE` / `ايقاف` to the store
 *     WhatsApp number → Whats360 inbound webhook → `recordOptOut(phone,
 *     'WHATSAPP_KEYWORD')`.
 *   - `send-whatsapp` worker checks `isCustomerOptedOut(phone)` before
 *     dispatching a Notification row; if opted out, flips the row to FAILED
 *     with errorMessage='opted_out' and does NOT call Whats360.
 *   - OTP sends bypass the worker entirely — opt-out does NOT block
 *     authentication.
 *   - Admin can also record opt-outs on behalf of a customer via the settings
 *     panel (planned Sprint 11 D7 — for now, DB-level insert only).
 *
 * Storage format: E.164 without the '+'. E.g. `+201012345678` → `201012345678`.
 * This matches the JID prefix used by Whats360 so inbound webhooks can look up
 * the sender without re-normalising.
 */
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

const OPT_OUT_KEYWORDS = [
  'STOP',
  'UNSUBSCRIBE',
  'إلغاء',
  'الغاء',
  'ايقاف',
  'إيقاف',
  'الغاء الاشتراك',
];

/**
 * Normalise an arbitrary Egyptian phone input to the canonical opt-out key
 * (E.164 without '+': `201012345678`). Returns null on inputs we can't
 * interpret — the caller should treat that as "cannot opt out this recipient"
 * and skip the check rather than fail-closed.
 */
export function normalizeEgyptianPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;

  let national = digits;
  if (national.startsWith('20')) national = national.slice(2);
  national = national.replace(/^0+/, '');
  if (national.length < 9 || national.length > 11) return null;
  return `20${national}`;
}

/**
 * Returns true if the provided message body is a customer opt-out request.
 * Case-insensitive, trims surrounding whitespace, and matches on equality
 * against a small allowlist — we deliberately do NOT match "stop" inside a
 * longer sentence (e.g. "please don't stop my order") to avoid false opt-outs.
 */
export function detectOptOutMessage(body: string | null | undefined): boolean {
  if (!body) return false;
  const trimmed = body.trim().toUpperCase();
  return OPT_OUT_KEYWORDS.some((kw) => trimmed === kw.toUpperCase());
}

/**
 * True when the customer at `phone` has opted out of automated notifications.
 * Accepts any Egyptian phone format; returns false when the phone can't be
 * normalised (fail-open — otherwise a bad phone string would silently hide the
 * customer from all notifications).
 */
export async function isCustomerOptedOut(phone: string): Promise<boolean> {
  const canonical = normalizeEgyptianPhone(phone);
  if (!canonical) return false;
  const row = await prisma.notificationOptOut.findUnique({
    where: { phone: canonical },
    select: { id: true },
  });
  return row != null;
}

export type RecordOptOutSource = 'WHATSAPP_KEYWORD' | 'ADMIN' | 'SUPPORT';

/**
 * Idempotently records an opt-out. Second calls for the same phone are no-ops
 * (the first record wins on source/reason/createdAt).
 */
export async function recordOptOut(args: {
  phone: string;
  source: RecordOptOutSource;
  reason?: string;
  createdBy?: string;
}): Promise<{ recorded: boolean; phone: string | null }> {
  const canonical = normalizeEgyptianPhone(args.phone);
  if (!canonical) {
    logger.warn(
      { phonePreview: args.phone.slice(0, 4) + '****' },
      'opt_out.invalid_phone',
    );
    return { recorded: false, phone: null };
  }

  const existing = await prisma.notificationOptOut.findUnique({
    where: { phone: canonical },
    select: { id: true },
  });
  if (existing) return { recorded: false, phone: canonical };

  await prisma.notificationOptOut.create({
    data: {
      phone: canonical,
      source: args.source,
      reason: args.reason ?? null,
      createdBy: args.createdBy ?? null,
    },
  });

  logger.info(
    { phone: canonical.slice(0, 4) + '****', source: args.source },
    'opt_out.recorded',
  );
  return { recorded: true, phone: canonical };
}

/**
 * Remove an opt-out — admin-only path (e.g. customer re-subscribes via
 * support). Returns whether a row was actually deleted.
 */
export async function clearOptOut(
  phone: string,
): Promise<{ cleared: boolean }> {
  const canonical = normalizeEgyptianPhone(phone);
  if (!canonical) return { cleared: false };
  const { count } = await prisma.notificationOptOut.deleteMany({
    where: { phone: canonical },
  });
  return { cleared: count > 0 };
}
