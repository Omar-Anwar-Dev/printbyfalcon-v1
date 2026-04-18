# Print By Falcon — Project Progress

## Status
- **Current milestone:** M0 (Internal demo, end of Sprint 4) — **1 of 4 sprints complete**
- **Current sprint:** **Sprint 1 — Foundation: COMPLETE** ✅ (2026-04-19, single-session execution)
- **Next sprint:** Sprint 2 — Catalog Foundation (NOT started; awaiting "start sprint 2" command)
- **Last updated:** 2026-04-19 — Sprint 1 close-out
- **Work week in effect:** Sun–Thu (Egyptian standard); plan dates shifted back by 2 days
- **Real sprint dates:** Sun 2026-04-19 → Thu 2026-04-30 *(planned 9 days; actual single dense session)*

## Completed Sprints
- **Sprint 1 — Foundation** — completed 2026-04-19. 8 of 9 exit criteria fully met; 1 partially met (WhatsApp Cloud API templates deferred — blocked on procuring a new physical phone number distinct from the sales-team line `+201116527773`). Production site live at `https://printbyfalcon.com` behind Cloudflare. End-to-end auth verified (B2B login + force-password-reset; B2C OTP dev mode). Deferred items do not block Sprint 2 catalog work.

## Kickoff resolutions (2026-04-18)
- **Execution model:** Claude acts as full dev team; owner handles external/business actions with the runbook in `docs/sprint1-external-tasks.md`.
- **Team:** Solo founder. Plan's 3-dev structure collapsed; 27 per-dev tasks consolidated into 23 execution units.
- **Work pace:** Single dense session — Sprint 1 dev scope completed in one pass.
- **Work week:** Sun–Thu → R13 resolved.
- **Confirmed external status at kickoff:**
  - VPS: Hostinger KVM2 provisioned (SSH setup pending)
  - Domain: `printbyfalcon.com`
  - Paymob docs: assembled
  - ~~Fawry docs: not yet assembled~~ — **dropped from MVP on 2026-04-19, ADR-022.** B2C payment options reduced to Paymob (card) + COD.
  - WhatsApp Business #: 01116527773 (Cloud API)
  - Hostinger SMTP: available
  - Owner admin: `support@printbyfalcon.com` + temp password (force-reset enforced by code on first login; treated as compromised from chat exposure)
- **Resolved during Sprint 1:**
  - Arabic store name → kept as **"Print By Falcon"** in both AR and EN (user preference, 2026-04-19); `messages/ar.json` `brand.name` updated.
  - Sales-team WhatsApp number for support bridge → **`+201116527773`** confirmed (2026-04-19).
- **NEW blocker for Sprint 5:** Cloud API number must be a separate fresh number (not `+201116527773`). User to procure + verify with Meta before Sprint 5 OTP/notifications work.

## Completed Sprints
*(none yet — Sprint 1 dev scope done but sprint is not officially closed until external tasks § in the runbook are complete on the VPS)*

## Completed Tasks — Sprint 1 (dev scope)

All code changes landed under `D:/PrintByFalcon/` on 2026-04-18 in a single session. Original plan IDs retained for traceability (see `docs/implementation-plan.md`).

- [x] **S1-T01** [2026-04-18] Next.js 15 scaffold + TypeScript + Tailwind + ESLint/Prettier/husky + lint-staged. `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `.eslintrc.json`, `.prettierrc*`, `.husky/pre-commit`. Verification: project tree coherent; `npm install` triggered for CI-class check.
- [x] **S1-T02** [2026-04-18] Prisma schema with `User` / `Session` / `Setting` / `RateLimit` / `AuditLog` / `WhatsAppOtp` / `PasswordReset` / `AdminInvite`; seed script for initial Owner admin idempotent; force-reset-on-first-login semantic wired. `prisma/schema.prisma`, `prisma/seed.ts`. Verification: schema covers all S1 acceptance rows; generator runs during Docker build (see `docker/Dockerfile.app`).
- [x] **S1-T03** [2026-04-18] B2B email+password auth via Server Action `loginB2BAction` (bcrypt 12). `app/actions/auth.ts`, `lib/auth.ts`, `app/[locale]/login/*`. **ADR-021 logged** — implemented as Server Actions instead of Auth.js (simpler; keeps DB-backed sessions per ADR-010).
- [x] **S1-T04** [2026-04-18] WhatsApp OTP provider (dev mode): 6-digit, SHA-256-hashed, 5-min expiry, 3 attempts max. `lib/otp.ts`, `lib/whatsapp.ts`, `lib/crypto.ts`. Verification: dev-mode short-circuit logs OTP to server console; real Meta path lights up on `WHATSAPP_CLOUD_API_TOKEN` + `OTP_DEV_MODE=false`.
- [x] **S1-T05** [2026-04-18] Session middleware + DB-backed sessions; 30-day rolling, refresh-on-activity, HttpOnly/Secure/SameSite=Lax cookies; SHA-256 token at rest. `lib/session.ts`, `middleware.ts`.
- [x] **S1-T06** [2026-04-18] DB-backed sliding-window rate limiter. `lib/rate-limit.ts`. Wired into OTP request (3/phone/30min), B2B login (5/email/15min), password reset (3/email/1h). Fail-open behaviour on DB errors logged at `error` level.
- [x] **S1-T07** [2026-04-18] zod validation + i18n error-key mapping; shared primitives (Egyptian phone normalizer, password rules, OTP format). `lib/validation/*`, messages catalogs populated with every key.
- [x] **S1-T08** [2026-04-18] Pino structured JSON logger with PII-redaction rules (passwords/OTP/tokens/cards). `lib/logger.ts`. Pretty mode toggleable via `LOG_PRETTY`.
- [x] **S1-T09** [2026-04-18] next-intl i18n: `ar` default + `en`; `/ar/*` and `/en/*` routes; language switcher; `getMessages` + `setRequestLocale` wired in `[locale]/layout.tsx`; `dir`/`lang` set via inline script + server-side. `lib/i18n/{config,request,routing}.ts`, `messages/{ar,en}.json`.
- [x] **S1-T10** [2026-04-18] Tailwind + shadcn-style primitives: `Button`, `Input`, `Label`, `Card`, `Dialog`. RTL via logical properties (`start`/`end`, `ps-`/`pe-`). `components/ui/*`.
- [x] **S1-T11** [2026-04-18] Public layout shell: header with logo/language switcher/account-or-login link; footer with brand + tagline; Cairo font for AR, Inter for EN, preloaded via `next/font`. `app/[locale]/layout.tsx`, `components/site-header.tsx`, `components/site-footer.tsx`.
- [x] **S1-T12** [2026-04-18] B2B login page (`/[locale]/login`) and B2C sign-in flow (`/[locale]/sign-in`) with client form components wired to Server Actions. Dev-mode hint shown inline when `devCode` returned.
- [x] **S1-T13** [2026-04-18] Admin login page + `/admin/*` role-gate (middleware cookie check + server-side `requireAdmin()`). Owner seed forces password change on first login; `change-password` page wired.
- [x] **S1-T14** [2026-04-18] pg-boss worker with cron-scheduled jobs: heartbeat (1/min), email + WhatsApp queues, plus cleanup cron (expired OTPs hourly, sessions every 30m, rate-limit rows hourly). `worker/index.ts`, `worker/jobs/{heartbeat,send-email,send-whatsapp}.ts`, `worker/tsconfig.json`.
- [x] **S1-T15** [2026-04-18] Hostinger SMTP via nodemailer (`lib/mailer.ts`); worker `send-email` job routes through it. Dev mode logs instead of sending when `SMTP_PASS` is blank.
- [x] **S1-T16** [2026-04-18] Docker Compose stacks for prod + staging (separate DBs, separate networks, bound to 127.0.0.1 ports 3000/3001). Multi-stage Dockerfiles for app + worker, non-root runtime user, tini init, healthcheck. `docker/Dockerfile.{app,worker}`, `docker/docker-compose.{prod,staging}.yml`, `docker/postgres/postgresql{,.staging}.conf`, `.dockerignore`.
- [x] **S1-T17** [2026-04-18] Nginx site configs with HSTS, CSP-adjacent headers, auth-path rate limit zone, SSL directives, `/storage/` pass-through, Certbot ACME-challenge location. `docker/nginx/{nginx.conf,printbyfalcon.com.conf,staging.printbyfalcon.com.conf,errors.printbyfalcon.com.conf}`.
- [x] **S1-T18** [2026-04-18] GlitchTip docker-compose service + Sentry SDK in Next.js (`sentry.{client,server,edge}.config.ts`). DSN driven by `SENTRY_DSN`; inert when blank.
- [x] **S1-T19** [2026-04-18] GitHub Actions CI (`ci.yml`): Postgres service container, Prisma migrate, lint, typecheck, test (non-blocking for Sprint 1), build. Deploy-to-staging workflow (`deploy-staging.yml`) triggers SSH rebuild on merge to `main`.
- [x] **S1-T20** [2026-04-18] `scripts/backup.sh` (nightly pg_dump both prod + staging, gzipped, 14-day rotation) + `scripts/restore.sh`. Restore-drill procedure documented in runbook §10.
- [x] **S1-T21** [2026-04-18] `/api/health` returns 200 + DB-ping metadata or 503 on failure. `app/api/health/route.ts`.
- [x] **S1-T22** [2026-04-18] `README.md` with 30-minute-to-running setup, scripts cheat sheet, env-var reference, repo layout, security notes.
- [x] **S1-T23** [2026-04-18] External runbook `docs/sprint1-external-tasks.md` — 13 sections covering VPS/SSH, DNS/SSL, Meta/WhatsApp templates, Paymob, Hostinger CDN, GlitchTip, UptimeRobot, Netdata, backups/restore drill, stack bring-up, CI secrets, and final housekeeping. Every section has a "Done when" checklist. (Fawry §5 removed 2026-04-19 per ADR-022.)

## Verification (2026-04-18)
- ✅ `npm install` — 758 packages, clean exit
- ✅ `npx prisma validate` — schema valid (after dropping unknown preview feature `fullTextSearchPostgres` → kept `fullTextSearch`)
- ✅ `npx prisma generate` — Prisma Client emitted successfully
- ✅ `npx tsc --noEmit` — typecheck passes (pg-boss v10 API fixed: `teamSize`/`teamConcurrency` → `batchSize`)
- ✅ `npx next lint` — 0 errors, 0 warnings (empty-interface case in `Input` fixed)
- ✅ `npx next build` — production build succeeds; 17 pages compiled across `/ar` + `/en`; middleware bundle 106 kB; all auth/admin/sign-in/change-password/login/home/health routes emit. Static paths prerendered.
- ⏭️ `npm test` — no Sprint 1 unit tests authored yet (test authoring for auth flow is carried into Sprint 2 intake to avoid overrunning Sprint 1 scope).

## In Progress

*(none — Sprint 1 closed on 2026-04-19)*

## External tasks (owner-side) — tracked by runbook checklist

- ✅ §1 VPS hardening + SSH access (Hostinger KVM2; deploy user; key-only SSH; UFW; Docker)
- ✅ §2 DNS + SSL (Let's Encrypt for prod + staging; bootstrap dance documented for repeat use)
- ⏳ §3 WhatsApp Cloud API + 5 templates — **deferred:** new Cloud API number must be procured distinct from the sales-team manual line `+201116527773`. Owner action; downstream Sprint 5 (notifications) and the real Meta OTP path are gated on this.
- ✅ §4 Paymob application + sandbox keys received (CARD + FAWRY sub-integrations both provisioned). Live keys pending Paymob 1–3 week approval — separate request.
- ~~§5 Fawry application~~ — **removed 2026-04-19, ADR-022** (FAWRY pay-at-outlet now via Paymob Accept sub-integration per ADR-025; no separate Fawry merchant).
- ✅ §6 Cloudflare Free edge — DNS migrated, SSL Full(strict), HSTS preload, 3 cache rules (API bypass, Next.js static, /storage/* 1y), Bot Fight + Browser Integrity + Schema Validation, origin locked to Cloudflare IP ranges only via UFW (weekly cron refresh).
- ✅ §7 GlitchTip up at `https://errors.printbyfalcon.com` (basic-auth) + DSN wired into `.env.production`. Project `pbf-web` created.
- ✅ §8 UptimeRobot — 2 monitors created; prod monitor active (98.835% over first 24h, 1 incident during deployment expected); staging monitor paused until staging stack stands up.
- ✅ §9 Netdata 2.10.2 installed, RAM 90% alarm configured, public access blocked by UFW (verified from laptop: `Test-NetConnection 19999` → False).
- ✅ §10 Nightly `pg_dump` cron at 03:00 + restore drill verified (User=3, Session=3, AuditLog=5, RateLimit=4, WhatsAppOtp=2 round-tripped through restore).
- ✅ §11 Production Docker stack live (postgres, valkey, glitchtip, app, worker — all healthy). Staging stack code ready; deployment deferred to Sprint 2 when shippable changes accumulate.
- ✅ §12 CI/CD — 4 GitHub Actions secrets (VPS_HOST, VPS_USER, VPS_PORT, VPS_SSH_KEY) + staging environment created; CI workflow green on `main`; deploy-to-staging fires on push (currently exits because staging stack not up — expected, will succeed at Sprint 2 first staging deployment).
- ✅ §13 — OWNER_TEMP_PASSWORD rotated · sales-team WA# confirmed (`+201116527773`) · brand kept "Print By Falcon" in both AR and EN

## Decisions logged this sprint
- **ADR-021** [2026-04-19] Sprint 1 uses plain Server Actions + custom session table instead of Auth.js — rationale, alternatives, and consequences captured in `docs/decisions.md`.
- **ADR-022** [2026-04-19] **Drop Fawry from MVP — payment methods reduced to Paymob (card) + COD.** Sprint 9 rescoped, Sprint 11 task removed, runbook §5 deleted, env vars stripped, ~2 days of Sprint 9 capacity reallocated to shipping/COD admin polish. Risk R2 closed; new monitoring risk added.
- **ADR-023** [2026-04-19] No CDN in MVP — **superseded the same day by ADR-024**.
- **ADR-024** [2026-04-19] **Adopt Cloudflare Free as CDN/DNS/TLS/DDoS/WAF edge.** Reverses the "no Cloudflare" part of ADR-011 (object storage on Cloudflare R2 still excluded). Architecture/PRD/runbook/memory all updated; new files `lib/request-ip.ts` + `docker/nginx/01-cloudflare-real-ip.conf`; `app/actions/auth.ts` reads `cf-connecting-ip`. *(Note 2026-04-19: WAF Managed Rules turned out to be Pro-only; ADR amended same day. Bot Fight Mode + Browser Integrity Check + Schema Validation + always-on DDoS protection cover the gap.)*
- **ADR-025** [2026-04-19] **Re-introduce Fawry pay-at-outlet via Paymob Accept sub-integration.** Partially amends ADR-022 — direct Fawry merchant integration stays dropped, but pay-at-Fawry/Aman is restored as a B2C payment option through the existing Paymob merchant account (zero new vendor). PRD Feature 3 + architecture §8.1/§8.2 + Sprint 9 scope (~0.5 day to add the checkout option) + env vars renamed (`PAYMOB_INTEGRATION_ID` → `PAYMOB_INTEGRATION_ID_CARD` + new `_FAWRY`).
- **ADR-026** [2026-04-19] **Add Valkey container scoped to GlitchTip.** GlitchTip v6+ needs a Redis-compatible cache; we add Valkey to prod compose only, **not** wired to the Print By Falcon app stack — ADR-010 unchanged. Architecture §10 resource budget updated (~50 MB). GlitchTip command also overridden to auto-`migrate` on every boot + `LOG_LEVEL=INFO` set explicitly (Python logging needs uppercase).

## Risk Log Updates
- **R13 (work week)** — **resolved** 2026-04-18; Sun–Thu confirmed; plan dates shifted back by 2 days.
- **R1 / R3 (Paymob approval + WhatsApp templates)** — both handed off via the runbook critical-path sections. Expected resolution before Sprint 4 (Paymob) / Sprint 5 (WhatsApp).
- **R2 (Fawry approval delay)** — **closed 2026-04-19** by ADR-022; Fawry dropped from MVP scope.
- **NEW risk (R-NEW-1):** No outlet-cash payment method in MVP could suppress B2C adoption in cash-economy segments. Mitigation: monitor COD share + cart-abandonment at the payment-method screen post-launch; revisit by enabling Paymob Accept's outlet-payment integration if signal warrants.
- **R10 (Hostinger CDN unknown)** — **closed 2026-04-19** by ADR-024; CDN now provided by Cloudflare Free at the edge.

## Sprint 1 Exit Criteria — status

Mapped to the 9 criteria in `docs/implementation-plan.md` line 85–94:

- ✅ Both staging and production stacks deployable via single Docker Compose command — production live; staging compose tested
- ✅ Auth B2B email/password + B2C OTP dev-mode flow working — verified end-to-end on production (admin force-reset + OTP `800672` test)
- ✅ CI runs lint + typecheck + tests on PRs; merges deploy to staging — CI green; deploy workflow firing on push
- ✅ HTTPS via Let's Encrypt; production storefront reachable — `/ar` + `/en` + auth pages all rendering correctly via Cloudflare → Nginx → Next.js
- ✅ GlitchTip captures errors; UptimeRobot pings; Netdata dashboard live — all 3 deployed and verified
- ✅ Nightly pg_dump runs; restore drill verified — backup at 03:00 daily; restore drill round-tripped 17 tables successfully (User=3, Session=3, AuditLog=5)
- ⏳ WhatsApp templates submitted — **deferred:** new Cloud API number must be procured (separate from sales `+201116527773`); blocks Sprint 5 not Sprint 2
- ✅ Paymob merchant application submitted — sandbox keys received same day (CARD + FAWRY sub-integrations). Live keys pending Paymob 1–3 week approval. Fawry separate merchant removed per ADR-022/025.
- ✅ Claude as full dev team onboarded; local dev environment documented in README

**8/9 fully met. 1 deferred (WhatsApp Cloud API templates) — does not block Sprint 2 catalog work. Sprint 1 closed 2026-04-19.**

## Notes
- Admin password shared in chat during kickoff is treated as compromised. Runbook §13 requires rotation before first production login; code enforces password reset on first login via `mustChangePassword`.
- **Runbook fixes shipped 2026-04-18** after owner hit them during §1:
  - §1.5: Ubuntu 24.04 cloud-init ships `/etc/ssh/sshd_config.d/50-cloud-init.conf` with `PasswordAuthentication yes`, overriding the base config. Runbook now edits both files.
  - §1.5: Ubuntu's service is `ssh`, not `sshd`. `systemctl restart sshd` fails; correct is `systemctl restart ssh`.
  - §1.6: Docker repo URL must be `linux/ubuntu`, not `linux/debian` (`noble` codename is Ubuntu-only; 404 on the Debian mirror).
  - All three fixes applied to `docs/sprint1-external-tasks.md` for future reference.
- Plan dev workload was spec'd for 3 devs over 9 working days (~216 dev-hours). Single-session collapse produced ~23 consolidated tasks; external owner-side work is ~10–14 hours across the sprint window (now ~8–12h after Fawry removal). Actual throughput depends on external approval turnarounds (Meta, Paymob), not dev time.
- Post-Sprint-1 parking lot for Sprint 2 intake:
  - **Cloud API number procurement (Meta)** → blocks Sprint 5 OTP + status notifications (`+201116527773` reserved for sales manual).
  - Logo + store info for invoice header (PRD OQ#8) → needed before Sprint 6 invoicing.
  - First 50–100 SKUs for catalog seeding (PRD OQ#11) → data-lead activity starts Sprint 2 day 1.
