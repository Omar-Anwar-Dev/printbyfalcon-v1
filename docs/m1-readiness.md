# M1 Readiness — Go / No-Go Checklist

**Sprint 11 + Sprint 12 dev consolidation.** Everything that needs to be green before M1 (closed beta / production launch) opens to 5 friendly B2C testers + 3 friendly B2B companies.

**Posture:** M1 launches **COD-only** per [ADR-064](decisions.md) — Paymob merchant approval is still in review. The Paymob switchover is a single-env-var flip post-approval, not a code change.

**WhatsApp posture:** Whats360 device runs on `+201116527773` (single number for sales + OTP + order notifications) per [ADR-063](decisions.md). Operational guardrails (admin device-status widget + opt-out word-equality + OTP-bypass) make the single-number posture safe enough for closed beta.

**Dev track** — Sprint 11 (priceless-boyd-432d48 worktree) + Sprint 12 (kind-knuth-23348b worktree) work merged to main + deployed to staging + staging smoke-passes.

**Ops track** — owner executes against live infrastructure after the merge lands on production. No dev work left; just executions.

---

## Dev-track sign-off (Sprint 11 + Sprint 12 work)

### Security
- [x] **CSP** shipped + HSTS + COOP + CORP + X-Permitted-Cross-Domain-Policies in [next.config.mjs](../next.config.mjs). See [security-audit.md](security-audit.md).
- [x] **Webhook rate limit** — 1000/IP/1min on `/api/webhooks/paymob` + `/api/webhooks/whats360`; 429 + Retry-After response.
- [x] **Production env guard** — [lib/env-check.ts](../lib/env-check.ts) + [instrumentation.ts](../instrumentation.ts) fails boot if `OTP_DEV_MODE=true`, `NOTIFICATIONS_DEV_MODE=true`, `WHATS360_SANDBOX=true` in production, or any required secret missing. **Sprint 12:** PAYMOB_* keys conditionally required iff `PAYMENTS_PAYMOB_ENABLED !== 'false'` (ADR-064).
- [x] **Paymob HMAC hardening** — verify function no longer crashes on length-mismatched garbage inputs (S11-D8-T3 bug fix).
- [x] **Late-webhook-on-cancelled guard** — PAID Paymob webhook on CANCELLED order now records audit flag + skips invoice/email; ops must reconcile refund (S11-D8-T3 bug fix).
- [x] **OWASP Top 10 checklist** — all 10 green, see [security-audit.md §OWASP Top 10](security-audit.md).

### Tests
- [x] **200/200 vitest** green at Sprint 11 close. (Sprint 10 baseline: 141; Sprint 11 added 59 new cases.)
- [x] **Sprint 12** — additional 3 env-check cases (COD-only posture). Final count documented in progress.md verification.
- [x] **Playwright E2E coverage** across all MVP user stories — matrix at [e2e-coverage-matrix.md](e2e-coverage-matrix.md) with 5 items deliberately left for manual verification.
- [x] Typecheck + lint + build clean.

### Performance
- [x] **Lighthouse harness** ([scripts/perf/lighthouse.sh](../scripts/perf/lighthouse.sh)) + URL list shipped. Ops runs against staging.
- [x] **k6 harness** ([scripts/perf/k6-browse.js](../scripts/perf/k6-browse.js) + [k6-checkout.js](../scripts/perf/k6-checkout.js)) shipped. Ops runs against staging.
- [x] **DB query audit** — one missing index found + fixed (`Notification.externalMessageId` was full-scanning on every Whats360 webhook).

### Accessibility
- [x] **Code-level a11y review** — no serious anti-patterns (details in [a11y-audit.md](a11y-audit.md)).
- [x] **axe-core ops harness** ([scripts/perf/axe-audit.sh](../scripts/perf/axe-audit.sh)) — 10 representative pages.

### Customer-side
- [x] **WhatsApp customer opt-out** — STOP/UNSUBSCRIBE/إلغاء keyword detection + `NotificationOptOut` table + worker gate ([lib/notifications/opt-out.ts](../lib/notifications/opt-out.ts)). OTP sends bypass so auth still works.
- [x] **Privacy policy** — AR + EN, Law 151/2020-shaped ([/privacy](../app/[locale]/privacy/page.tsx)). **Reviewed by owner** — placeholder review banner removed (ADR-059 polish pass).
- [x] **Terms of service** — AR + EN ([/terms](../app/[locale]/terms/page.tsx)). **Reviewed by owner** — placeholder review banner removed (ADR-059 polish pass).
- [x] **Cookie policy** — AR + EN ([/cookies](../app/[locale]/cookies/page.tsx)).
- [x] **Cookie consent banner** — informational, essential-cookies-only ([components/cookie-consent.tsx](../components/cookie-consent.tsx)).
- [x] **CSV importer hardening** — BOM, Arabic Unicode, duplicate SKUs, missing headers all caught pre-write ([lib/catalog/csv-parser.ts](../lib/catalog/csv-parser.ts)).

### Sprint 12 — M1 launch tooling
- [x] **Paymob feature flag** ([lib/payments/feature-flags.ts](../lib/payments/feature-flags.ts), ADR-064). `PAYMENTS_PAYMOB_ENABLED=false` in `.env.production` opts into COD-only checkout; default `true` keeps staging unchanged. Hides Paymob radios + rejects Paymob payment submissions server-side; env-check stops requiring PAYMOB_* keys.
- [x] **Whats360 device-status widget** ([components/admin/whats360-status-widget.tsx](../components/admin/whats360-status-widget.tsx)) on /admin home. Polls every 60 s; surfaces connected / disconnected / probe-failed states with operator-actionable copy. Visible to OWNER + OPS.
- [x] **`/feedback` bilingual page** ([/feedback](../app/[locale]/feedback/page.tsx) + thanks page) — anonymous-safe; signed-in user pre-filled; rate-limited 5/IP/hour.
- [x] **Admin feedback review** — [/admin/feedback](../app/[locale]/admin/feedback/page.tsx) list + detail with status workflow (NEW → REVIEWING → ACTIONED / DISMISSED). Sprint 12 nav entry added.
- [x] **Pre-deploy go/no-go script** — `npm run m1:check [-- --env path] [-- --url URL]`. Static checks (schema, env file, placeholder values) + live probes (health, storefront, admin gate, sitemap, security headers). Exit 1 on any FAIL.
- [x] **Tester onboarding kit** ([docs/tester-onboarding.md](tester-onboarding.md)) — bilingual welcome messages + per-tester checklist + day-by-day support cadence.
- [x] **Daily monitoring playbook** ([docs/daily-monitoring.md](daily-monitoring.md)) — 3 daily sweeps + escalation paths + weekly review template.
- [x] **M2 launch plan draft** ([docs/m2-launch-plan.md](m2-launch-plan.md)) — Definition of Done + buffer-period work + sign-off questions for owner.

### Docs
- [x] Admin guide already shipped at Sprint 10 ([admin-guide.md](admin-guide.md)).
- [x] FAQ scaffold ([faq.md](faq.md)) — bilingual AR/EN.
- [x] E2E coverage matrix ([e2e-coverage-matrix.md](e2e-coverage-matrix.md)).
- [x] Security audit write-up ([security-audit.md](security-audit.md)).
- [x] A11y audit ([a11y-audit.md](a11y-audit.md)).
- [x] This readiness doc.
- [x] Sprint 12 trio: tester-onboarding, daily-monitoring, m2-launch-plan.

---

## Ops-track checklist (OWNER runs after deploy)

### Pre-launch infra (blocking M1)

1. **Run envs through the env-check.** Deliberately set `OTP_DEV_MODE=true` on a staging boot and confirm the container fails to start with `env_check.failed` in logs. Then set `false`, redeploy, confirm boot succeeds.
2. ⏭️ **Live Paymob merchant switchover (deferred to post-M1 per ADR-064).** Application still in review with Paymob Egypt. M1 launches COD-only. When approval lands: set live keys in `.env.production` (PAYMOB_API_KEY / PAYMOB_INTEGRATION_ID_CARD / PAYMOB_INTEGRATION_ID_FAWRY / PAYMOB_HMAC_SECRET / PAYMOB_IFRAME_ID), set `PAYMENTS_PAYMOB_ENABLED=true`, redeploy, run a real test card payment + refund. See [docs/m2-launch-plan.md §2.2](m2-launch-plan.md).
3. **Whats360 live device (per ADR-063).** Device is scanned to `+201116527773` (sales line — owner-confirmed, ADR-063). Set `NOTIFICATIONS_DEV_MODE=false` in `.env.production`. Send a real OTP to your own phone → verify arrival. Watch the new admin Whats360 widget — it should report GREEN within 60 s of deploy.
4. **Email DNS records.** In Cloudflare DNS, add SPF / DKIM / DMARC records for `printbyfalcon.com`. Run `mail-tester.com` from a `noreply@printbyfalcon.com` test send → target score >9/10.
5. **Backup + restore drill.** Take a fresh Hostinger KVM, restore the latest prod snapshot + latest `pg_dump` → boot the app stack → confirm storefront renders + one test login works. Document the exact command sequence in [runbook.md §8.4](runbook.md).
6. **GlitchTip alert config.** Create an email alert rule for `>10 errors / 5min` → trigger a simulated spike (curl 11× a deliberately-broken admin route) → confirm email arrives.

### Pre-launch verification (blocking M1)

7. **Run `npm run m1:check -- --env .env.production --url https://staging.printbyfalcon.com` on the staging box** (or against the staging URL from your laptop) → all PASS, zero FAIL. Run again with the production URL once promoted.
8. **Lighthouse runs green on staging.** `bash scripts/perf/lighthouse.sh https://staging.printbyfalcon.com` → all 8 pages pass mobile >90 / desktop >95.
9. **k6 browse passes on staging.** `BASE_URL=https://staging.printbyfalcon.com k6 run scripts/perf/k6-browse.js` → p95 TTFB <800ms, 5xx <0.1%.
10. **k6 checkout passes on staging.** `BASE_URL=https://staging.printbyfalcon.com PRODUCT_SLUG=<a-real-slug> k6 run scripts/perf/k6-checkout.js` → p95 <1500ms, 200s on /checkout >99%.
11. **axe-core a11y scan green on staging.** `bash scripts/perf/axe-audit.sh https://staging.printbyfalcon.com` → zero serious + critical violations.
12. **NVDA pass on AR golden path.** Sign-in → browse → cart → checkout using NVDA on Chrome. Everything announces correctly.
13. **Cross-browser smoke.** Manually test golden path on Chrome mobile, Chrome desktop, Safari mobile, Firefox, Samsung Internet (popular in Egypt).
14. **Webhook rate limit fires.** Flood-test `/api/webhooks/paymob` with 1001 requests in <60s → confirm 429 after the 1000th.

### Content gates (blocking M1)

15. **Privacy + Terms reviewed by owner** — owner-confirmed at Sprint 12 kickoff. Review banners already removed as part of ADR-059 polish pass. ✅
16. **FAQ content reviewed + localised.** Skim [faq.md](faq.md); update phone numbers if changed; adjust wording to match store voice.
17. **Live catalog data imported via the M1 fresh-cutover.** Real **132-SKU CSV** (per Sprint 12 kickoff) replaces the 200-SKU demo fixture currently in production. Use the dedicated `npm run m1:fresh-catalog` (NOT plain `seed:catalog`) — it wipes test data + imports the new catalog atomically. See [§M1 catalog cutover](#m1-catalog-cutover) below for the full procedure.
18. **Initial zones + COD settings set in admin.** `/admin/settings/shipping` + `/admin/settings/cod` — verify per PRD §10 Open Questions #10 + #13.

### Production deploy rehearsal (blocking M1)

19. **Rehearse deploy workflow** on staging: (a) manual `workflow_dispatch` prod deploy via GitHub Actions, (b) approval gate by owner, (c) health-probe success, (d) test rollback within 10 min. Full procedure in [runbook.md §6](runbook.md).
20. **Dependency audit.** `npm audit --production` — resolve any high or critical.

### Tester onboarding (blocking M1)

21. **5 B2C friendly testers identified + welcomed.** Use the templates in [docs/tester-onboarding.md §2](tester-onboarding.md).
22. **3 B2B friendly companies identified + welcomed.** Approve applications in `/admin/b2b/applications`; assign tier; create login; send the B2B template in [docs/tester-onboarding.md §3](tester-onboarding.md).

---

## Risk acceptance for M1 (per ADR + PRD)

- **COD-only at launch** (ADR-064). R15 materialized — accepted; closed-beta cohort tolerates a single payment method; Paymob switches on with a single env var when approval lands.
- **Single-VPS architecture** (ADR-010, ADR-015). Uptime SLA 99% (~7.2h/month).
- **Single-WhatsApp-number posture** (ADR-063). All sales + OTP + order notifications converge on `+201116527773`. Device disconnect = total notification outage. Mitigated by the new admin device-status widget (60 s refresh) + the daily monitoring playbook.
- **No off-site backups yet** (ADR-014). Revisit pre-M2 per [m2-launch-plan.md §2.6](m2-launch-plan.md).
- **Dashboard widget data correctness verified manually** (not E2E'd); accepted.
- **Paymob + Whats360 concentration risk** — single points of failure for payments + WhatsApp. Failover documented in architecture §8.1 + §8.3.
- **Admin UI a11y is best-effort** (PRD §8). Storefront + B2B are WCAG 2.1 AA.
- **ETA e-invoice submission deferred to v1.1** (ADR-003).

## M1 catalog cutover

The production database currently holds the **200-SKU demo fixture** (Sprint 3 + later sprints' seeded data). The M1 launch replaces this with the owner's real **132-SKU catalog** and wipes all the leftover test orders, demo notifications, demo promos, and other transactional residue. The `m1-fresh-catalog` script does this atomically.

### Step-by-step (run on the production VPS)

> **All commands assume you SSH'd to the prod VPS as `deploy` and `cd /var/pbf/repo`.** Local-laptop dry-runs are fine for previewing the wipe count, but the actual `--execute` MUST run on the VPS so the storage cleanup + DB connection are colocated.

**1. Place the real CSV** at `fixtures/catalog-real-132.csv` on the VPS (scp from your laptop). Confirm it parses cleanly:

```bash
docker compose -f docker/docker-compose.prod.yml exec app \
  npm run seed:catalog -- --dry fixtures/catalog-real-132.csv
```

This is the existing dry-run path; it parses + validates without touching the DB. Address any CSV errors before continuing.

**2. Take a fresh DB backup** (out-of-band of the nightly cron):

```bash
bash scripts/backup.sh --label "pre-m1-cutover-$(date +%Y%m%d-%H%M)"
```

The backup file lands in `/var/pbf/backups/`. **Verify the file exists and is non-zero before continuing.**

**3. Dry-run the cutover** to see exactly what will be wiped:

```bash
docker compose -f docker/docker-compose.prod.yml exec app \
  npm run m1:fresh-catalog -- fixtures/catalog-real-132.csv
```

(No `--execute` flag = dry run.) The output reports current row counts per table. Sanity-check:
- **Product** count should be ~200 (the demo fixture).
- **Order**, **Notification**, etc. should match what you'd expect from internal testing.
- Counts under `(preserved)` confirm admins, settings, couriers, audit log, and shipping zones are NOT touched.

**4. Execute the cutover:**

```bash
docker compose -f docker/docker-compose.prod.yml exec app \
  npm run m1:fresh-catalog -- fixtures/catalog-real-132.csv --execute
```

The script gives a 3-second abort window before wiping. Then it:
1. Wipes (in dependency order) all transactional data + catalog + ephemeral rows.
2. Imports the 132 SKUs via the existing `seed-catalog` logic (upsert by SKU; on a fresh DB this is plain insert).
3. Reports post-import counts.

If anything fails mid-script, the wipe + import run inside one Prisma transaction → full rollback. Restore from the backup only if the transaction itself fails OR you want to revert hours later.

**5. Wipe storage files** (script doesn't touch `/var/pbf/storage` — image rows are gone but the bytes remain):

```bash
sudo rm -rf /var/pbf/storage/products/*
```

The new CSV's image references will land in fresh per-product directories on the next `seed:catalog` run (if the CSV references local images per `images/<sku>/*` convention) or you upload them through `/admin/products` afterward.

**6. Verify** on `/admin/products`:
- 132 active products listed.
- Each has correct AR + EN names + brand + category.
- Spot-check 5 random SKUs against the source CSV.
- `/ar/products` storefront grid renders the new catalog.

**7. (Optional) Clean up the leftover demo PromoCode rows** if you didn't pass `--also-promos`. The 3 demo codes (`WELCOME10`, `FIXED50`, `B2BBULK`) re-seed via `post-push.ts` on every boot — to remove them permanently, delete the seed block from `scripts/post-push.ts` AND delete the rows from `/admin/settings/promo-codes`.

### Optional flags

- `--also-customers` — also wipes non-admin Users + Address + Company + B2BApplication. Use this if you've been seeding test B2C / B2B data and want a truly empty customer table on M1 launch.
- `--also-promos` — also wipes PromoCode. Useful if owner-configured promos are all stale.

### Rollback

If you need to undo the cutover before the first real customer order arrives:

```bash
bash scripts/restore.sh /var/pbf/backups/pbf-prod-pre-m1-cutover-YYYYMMDD-HHMM.sql.gz
```

After a real customer has placed an order on the new catalog, the backup restore would lose that order — at that point the cutover is permanent and rollback means hand-fixing.

---

## Sign-off

When every box above is ticked:
- Merge to main + deploy via GitHub Actions `deploy-production` workflow.
- Run the M1 catalog cutover (above) — **after** the deploy lands but **before** announcing to testers.
- Tag release `v1.0.0-mvp` (per implementation-plan.md S12-D10-T2 — supersedes the older `v0.12.0-m1` working name).
- Send soft-launch comms to 5+3 testers using the templates in [docs/tester-onboarding.md](tester-onboarding.md).
- M1 reached. 🚀
