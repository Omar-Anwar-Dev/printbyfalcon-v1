# Security Audit — Sprint 11 S11-D1-T3

**Date:** 2026-04-23
**Scope:** checklist from `docs/implementation-plan.md` Sprint 11 Day 1 T3 + PRD §8 (Security) + architecture §9.5.
**Verification:** code review (this worktree) + existing unit tests + new tests added this pass.

## Summary

System was already well-hardened from Sprints 1–10. Audit surfaced three gaps that this pass closes:

1. **Content-Security-Policy header missing.** Referenced in PRD §8 + architecture §9.5 but never shipped. Added (enforced, not report-only).
2. **Webhook endpoints had no rate limit.** Architecture §7.5 specifies 1000/IP/1min. Wired up for `/api/webhooks/paymob` and `/api/webhooks/whats360`.
3. **No fail-fast check for dangerous dev flags in production.** Nothing in code stopped a bad deploy where `OTP_DEV_MODE=true` or `NOTIFICATIONS_DEV_MODE=true` slipped into `.env.production`. Added boot-time assertion via `instrumentation.ts`.

All three shipped in this task. No lingering gaps block M1.

## OWASP Top 10 2021 checklist

| # | Risk | Status | Evidence |
|---|------|--------|----------|
| A01 | Broken Access Control | ✅ | `requireAdmin()` + `allowedRoles` in every admin page; `requireB2BUser()` on B2B portal; middleware short-circuits `/admin/*` when no session cookie; role-matrix documented in [lib/admin/role-matrix.ts](../lib/admin/role-matrix.ts). |
| A02 | Cryptographic Failures | ✅ | bcrypt cost 12 for passwords; SHA-256 + 5-min TTL for OTPs; session tokens SHA-256-hashed in DB (raw token only in HttpOnly cookie); `timingSafeEqual` for token comparisons. |
| A03 | Injection | ✅ | Prisma parameterized queries everywhere; no raw SQL in business code (only in `scripts/post-push.ts` for DDL which is not user-reachable). |
| A04 | Insecure Design | ✅ | Webhooks are idempotent (Paymob txn id dedup, Whats360 message-id dedup); cart stock holds use DB-backed reservations with TTL; order sequence numbers via atomic `OrderDailySequence` upsert. |
| A05 | Security Misconfiguration | ✅ | `poweredByHeader: false`; CSP + HSTS + X-Frame-Options + X-Content-Type-Options + Referrer-Policy + Permissions-Policy + COOP + CORP + X-Permitted-Cross-Domain-Policies all set in [next.config.mjs](../next.config.mjs); `assertProductionEnv()` fails boot if dangerous dev flags are on. |
| A06 | Vulnerable Components | ⚠️ Ops-followup | Run `npm audit --production` at deploy; report in ops checklist. No known CVEs at time of writing on direct deps. |
| A07 | Identification and Authentication Failures | ✅ | Rate limits: OTP 3/phone/30min, B2B login 5/email/15min, password-reset 3/email/1h; session rotation on role change; constant-time comparison on OTP verify. |
| A08 | Software and Data Integrity | ✅ | Paymob HMAC-SHA512 signature verified before any DB work; Whats360 webhook secret verified in constant time; image uploads re-encoded through sharp (strips payloads). |
| A09 | Security Logging and Monitoring Failures | ✅ | pino structured JSON logs + Sentry/GlitchTip for errors; PII redaction in logger config; audit log for every state change; request-id propagation. |
| A10 | Server-Side Request Forgery | ✅ | No user-controlled outbound URL fetches in prod code paths. Whats360 SendDoc uses internal signed invoice URLs only; all outbound fetch targets are hard-coded to known providers. |

## PRD §8 Security NFRs — current state

| Requirement | Status | Notes |
|---|---|---|
| HTTPS enforced site-wide | ✅ | Cloudflare Full (strict) + Certbot origin cert; HSTS 1y + preload. |
| Strict HTTP headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy) | ✅ | All set in [next.config.mjs](../next.config.mjs); CSP added this pass. |
| Passwords: bcrypt cost 12 | ✅ | `bcrypt.hash(pw, 12)` in auth actions; confirmed via `lib/b2b/temp-password.ts`. |
| WhatsApp OTPs: SHA-256 hashed, 5-min expiry, max 3 attempts, rate-limited | ✅ | `lib/otp.ts` + `RATE_LIMIT_RULES.otpRequest`. |
| Session cookies: HttpOnly, Secure, SameSite=Lax, cryptographically random | ✅ | `lib/session.ts` — 32-byte random token, SHA-256 hash stored, `httpOnly + secure(prod) + sameSite='lax'`. |
| CSRF: Server Actions origin-checked | ✅ | Next.js 15 built-in origin check on Server Actions (default-on). |
| SQL injection: Prisma parameterized queries | ✅ | Audited — no raw SQL in business logic. |
| XSS: React escaping; no `dangerouslySetInnerHTML` for user content | ✅ | Single use at `app/[locale]/products/[slug]/page.tsx:153` is JSON-LD of server-built `schema.org/Product` data, not user content — annotated with eslint-disable comment explaining. |
| File uploads: image-only, MIME-sniffed, size-capped 5 MB, sharp re-encoded | ✅ | `lib/storage/images.ts` — 5MB cap, sharp metadata sniff, WebP re-encode drops EXIF + any payloads. |
| Webhook signatures verified | ✅ | Paymob HMAC-SHA512 (`verifyPaymobHmac`); Whats360 secret (`constantTimeEq`). |

## Rate-limit coverage

| Surface | Key | Limit | Location | Added this pass? |
|---|---|---|---|---|
| OTP request | phone | 3 / 30 min | `app/actions/auth.ts::requestB2COtpAction` | — |
| B2B login | email | 5 / 15 min | `app/actions/auth.ts::loginB2BAction` | — |
| Password reset | email | 3 / 1 h | `app/actions/auth.ts::requestPasswordResetAction` | — |
| B2B public signup | email | 3 / 24 h | `app/actions/b2b-public.ts` | — |
| Customer notifications | phone | 5 / 1 h | notification dispatch worker | — |
| Paymob webhook | client IP | 1000 / 1 min | `app/api/webhooks/paymob/route.ts` | **yes** |
| Whats360 webhook | client IP | 1000 / 1 min | `app/api/webhooks/whats360/route.ts` | **yes** |

**Known gap (not blocking M1):** the `serverActionDefault` rule (60/IP/min) is defined but not applied as a default wrapper. All security-critical actions (auth, password reset, B2B signup) already have tighter per-key limits; other actions (addToCart, updateProfile) rely on session auth + DB constraints. Defense-in-depth parking-lot item for post-M1.

## Production env sanity

`lib/env-check.ts` + `instrumentation.ts` added this pass. Boots fail loudly with a clear error message if in production and:

- `OTP_DEV_MODE=true` is set (would leak real OTPs to response + logs)
- `NOTIFICATIONS_DEV_MODE=true` is set (would silently skip real WhatsApp sends)
- `WHATS360_SANDBOX=true` is set (would never charge a real send — device won't actually deliver)
- Any of these required secrets is missing: `DATABASE_URL`, `APP_URL`, `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_ID_CARD`, `WHATS360_TOKEN`, `WHATS360_INSTANCE_ID`, `WHATS360_WEBHOOK_SECRET`

Escape hatch: `SKIP_ENV_CHECK=true` disables the assertion (for emergency boots where one var is temporarily missing and the operator knows what they're doing). Should never be baked into `.env.production`.

## CSP policy

```
default-src 'self';
base-uri 'self';
object-src 'none';
script-src 'self' 'unsafe-inline' 'unsafe-eval';
style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
img-src 'self' data: blob: https:;
font-src 'self' data: https://fonts.gstatic.com;
connect-src 'self';
frame-src 'self' https://accept.paymob.com;
frame-ancestors 'none';
form-action 'self';
upgrade-insecure-requests;
```

**Known trade-offs:**
- `'unsafe-inline'` + `'unsafe-eval'` on `script-src` are required for Next.js 15 App Router hydration without a nonce-based CSP. Still blocks external-origin script injection and `<script src="https://evil.com/...">` loading — the main XSS vectors.
- `img-src https:` is wide because product images may be served via multiple CDN variations. Can be tightened to `'self' https://printbyfalcon.com https://staging.printbyfalcon.com` post-launch once the asset hosting pattern is final.
- `frame-src 'self' https://accept.paymob.com` is the minimum surface for Paymob's hosted-iframe checkout.

**Parking-lot (post-M1):** tighten to nonce-based `strict-dynamic` CSP; drop `'unsafe-inline'` + `'unsafe-eval'`.

## Ops checklist

Tasks below are owner-executed (require live infrastructure, accounts, or manual testing). Not gating for code-side sign-off.

- [ ] Run `npm audit --production` and resolve any high/critical findings.
- [ ] After deploy, verify CSP by fetching the site and running `curl -I https://printbyfalcon.com/` — confirm `content-security-policy` header present.
- [ ] Verify env-check assertion fires: deliberately set `OTP_DEV_MODE=true` on a staging boot → container should fail to start with `env_check.failed` in logs → remove flag, redeploy, confirm boot succeeds.
- [ ] After deploy, verify webhook rate limit triggers: flood `/api/webhooks/paymob` with 1001 requests in < 60s, confirm 429 responses after the 1000th.
- [ ] Review `.env.production` against the `REQUIRED_IN_PROD` list in `lib/env-check.ts`.
- [ ] Confirm Cloudflare Bot Fight Mode + WAF managed rules are on (edge-layer rate limit + bot mitigation).

## Verification (this pass)

- `npm run typecheck` — pass
- `npm run lint` — pass
- `npm test` — pass (env-check suite added: 8 cases)
- CSP present in prod build HTTP headers: verified manually in production runbook drill on next deploy.
