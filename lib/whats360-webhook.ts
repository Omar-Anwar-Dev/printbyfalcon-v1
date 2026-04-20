/**
 * Pure helpers for the Whats360 inbound webhook (Sprint 5 S5-D2-T3).
 *
 * The route handler in app/api/webhooks/whats360/route.ts keeps HTTP + DB
 * concerns; these helpers are extracted so they can be unit-tested without
 * spinning up the Next.js server or the DB.
 */

/** Categorizes a Whats360 event string into one of our four handled buckets. */
export function normalizeWhats360Event(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const v = raw.toLowerCase().replace(/[\s-]+/g, '_');
  if (v.includes('fail')) return 'send_failure';
  if (v.includes('expir') || v.includes('subscription')) {
    return 'subscription_expiry';
  }
  if (v.includes('outgoing') || v === 'sent') return 'outgoing_message';
  if (v.includes('incoming') || v === 'received' || v === 'message') {
    return 'incoming_message';
  }
  return v;
}

/** Grab the first non-empty string field from `body` that matches `keys`. */
export function pickWhats360String(
  body: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const k of keys) {
    const v = body[k];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

/** Constant-time string equality for webhook-token checks. */
export function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
