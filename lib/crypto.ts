/**
 * Crypto utilities. Keep these in one place so auditing is easy.
 */
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/** Returns a URL-safe random token of the given byte length (default 32 → 43 chars). */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

/** Returns a zero-padded numeric OTP of the given length (default 6). */
export function generateNumericOtp(length = 6): string {
  const max = 10 ** length;
  // rejection sample to avoid modulo bias
  let n: number;
  do {
    n = randomBytes(4).readUInt32BE(0);
  } while (n >= Math.floor(0xffffffff / max) * max);
  return (n % max).toString().padStart(length, '0');
}

/** Constant-time hex string compare. */
export function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  const bufA = Buffer.from(a, 'hex');
  const bufB = Buffer.from(b, 'hex');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
