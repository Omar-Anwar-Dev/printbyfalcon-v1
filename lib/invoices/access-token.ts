/**
 * Signed access token for public invoice-download URLs (Sprint 6 S6-D5-T1).
 *
 * The URL is `/invoices/[invoiceId].pdf?t=<token>`. Token is an HMAC-SHA256 of
 * the invoice id keyed with `INVOICE_URL_SECRET`. Anyone with a valid token
 * can download the PDF — this is the surface we hand to Whats360 so the
 * middleware can fetch it without authenticating against our session cookie.
 *
 * No expiry for MVP: invoices are shared with customers (email attach +
 * WhatsApp URL) and with accountants; rotating the secret per-invoice would
 * make re-sends awkward. If needed later, we can add an `exp` timestamp and
 * rotate the secret at release boundaries.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

function getSecret(): string {
  return (
    process.env.INVOICE_URL_SECRET ||
    process.env.SESSION_SECRET ||
    'dev-invoice-secret'
  );
}

export function signInvoiceToken(invoiceId: string): string {
  return createHmac('sha256', getSecret())
    .update(invoiceId)
    .digest('hex')
    .slice(0, 32);
}

export function verifyInvoiceToken(invoiceId: string, token: string): boolean {
  const expected = signInvoiceToken(invoiceId);
  if (expected.length !== token.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(token));
  } catch {
    return false;
  }
}

export function buildInvoicePublicUrl(
  baseUrl: string,
  invoiceId: string,
): string {
  const clean = baseUrl.replace(/\/+$/, '');
  return `${clean}/invoices/${invoiceId}.pdf?t=${signInvoiceToken(invoiceId)}`;
}
