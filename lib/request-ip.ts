/**
 * Resolves the real client IP from a Server Action / Route Handler header bag.
 *
 * Priority order (per ADR-024):
 *   1. CF-Connecting-IP — set by Cloudflare on every proxied request.
 *   2. X-Forwarded-For (first hop) — fallback if Cloudflare is grey-clouded
 *      or we're hit directly via Nginx during emergency direct-origin access.
 *   3. null — couldn't determine.
 *
 * Note: Nginx is also configured (`set_real_ip_from <CF range>` +
 * `real_ip_header CF-Connecting-IP`) so $remote_addr at the proxy layer
 * — used by the auth_limit nginx zone — sees the real client IP too.
 */
import type { ReadonlyHeaders } from 'next/dist/server/web/spec-extension/adapters/headers';

export function getClientIp(
  headers: ReadonlyHeaders | Headers,
): string | null {
  const cfIp = headers.get('cf-connecting-ip');
  if (cfIp && cfIp.length <= 64) return cfIp;

  const fwd = headers.get('x-forwarded-for');
  if (fwd) {
    // x-forwarded-for can be a comma list; the first entry is the original client.
    const first = fwd.split(',')[0]?.trim();
    if (first && first.length <= 64) return first;
  }

  return null;
}
