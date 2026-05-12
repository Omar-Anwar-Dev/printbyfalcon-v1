/**
 * SHA-256 hashing for Meta CAPI user-data fields, with the normalization
 * Meta documents (lower-case, trim, digit-only phone in E.164 minus the
 * leading `+`).
 *
 * Meta's docs:
 *   https://developers.facebook.com/docs/marketing-api/conversions-api/parameters/customer-information-parameters
 *
 * Server-only. Never call from client code — raw email/phone should never
 * reach the browser bundle.
 */
import { sha256Hex } from '@/lib/crypto';

/** Normalize then SHA-256. Empty/whitespace input → null. */
function normHash(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return sha256Hex(trimmed);
}

export function hashEmail(email: string | null | undefined): string | null {
  if (!email) return null;
  // Meta wants lower-case + trimmed. RFC-allowed quirks (plus-aliases, dots
  // in local-part) are kept as-is — Meta doesn't normalize those, and we
  // don't either.
  return normHash(email);
}

/**
 * Normalize an Egyptian phone number to digits-only E.164 *without* the
 * leading `+` (Meta's expected format), then SHA-256.
 *
 * Inputs we see in the wild:
 *   "+201116527773"       → "201116527773"
 *   "201116527773"        → "201116527773"
 *   "01116527773"         → "201116527773" (assume EG, prepend country code)
 *   "0020 111 652 7773"   → "201116527773"
 *
 * Anything else: best-effort digit-strip. Bad input returns null (Meta
 * ignores empty hashes; better than sending garbage that lowers EMQ).
 */
export function hashPhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  // Strip "00" international prefix (some DBs store "+20" as "0020")
  if (digits.startsWith('00')) digits = digits.slice(2);
  // Egyptian local format: "01XXXXXXXXX" (11 digits, leading 0) →
  // prepend country code "20" and drop the leading 0.
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = '20' + digits.slice(1);
  }
  // Anything not starting with the EG country code is left alone — Meta
  // can match against international formats if the user is travelling.
  if (digits.length < 8 || digits.length > 15) return null; // sanity
  return sha256Hex(digits);
}
