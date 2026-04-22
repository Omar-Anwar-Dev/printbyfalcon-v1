# M1 Readiness — Go / No-Go Checklist

**Sprint 11 consolidation.** Everything that needs to be green before M1 (closed beta / production launch) opens to 5 friendly B2C testers + 3 friendly B2B companies.

**Dev track** — completed in the priceless-boyd-432d48 worktree (Sprint 11). Sign-off = merged to main + deployed to staging + staging smoke-passes.

**Ops track** — owner executes against live infrastructure after the Sprint-7-through-11 merge lands on staging + production. No dev work left; just executions.

---

## Dev-track sign-off (Sprint 11 work in this worktree)

### Security
- [x] **CSP** shipped + HSTS + COOP + CORP + X-Permitted-Cross-Domain-Policies in [next.config.mjs](../next.config.mjs). See [security-audit.md](security-audit.md).
- [x] **Webhook rate limit** — 1000/IP/1min on `/api/webhooks/paymob` + `/api/webhooks/whats360`; 429 + Retry-After response.
- [x] **Production env guard** — [lib/env-check.ts](../lib/env-check.ts) + [instrumentation.ts](../instrumentation.ts) fails boot if `OTP_DEV_MODE=true`, `NOTIFICATIONS_DEV_MODE=true`, `WHATS360_SANDBOX=true` in production, or any required secret missing.
- [x] **Paymob HMAC hardening** — verify function no longer crashes on length-mismatched garbage inputs (S11-D8-T3 bug fix).
- [x] **Late-webhook-on-cancelled guard** — PAID Paymob webhook on CANCELLED order now records audit flag + skips invoice/email; ops must reconcile refund (S11-D8-T3 bug fix).
- [x] **OWASP Top 10 checklist** — all 10 green, see [security-audit.md §OWASP Top 10](security-audit.md).

### Tests
- [x] **200/200 vitest** green. (Sprint 10 baseline: 141; Sprint 11 added: 8 env-check + 6 rate-limit + 21 opt-out + 7 HMAC + 17 CSV parser = 59 new cases.)
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
- [x] **Privacy policy** — AR + EN, Law 151/2020-shaped ([/privacy](../app/[locale]/privacy/page.tsx)). **REVIEW REQUIRED BEFORE M1** banner in place.
- [x] **Terms of service** — AR + EN ([/terms](../app/[locale]/terms/page.tsx)). **REVIEW REQUIRED BEFORE M1** banner in place.
- [x] **Cookie policy** — AR + EN ([/cookies](../app/[locale]/cookies/page.tsx)).
- [x] **Cookie consent banner** — informational, essential-cookies-only ([components/cookie-consent.tsx](../components/cookie-consent.tsx)).
- [x] **CSV importer hardening** — BOM, Arabic Unicode, duplicate SKUs, missing headers all caught pre-write ([lib/catalog/csv-parser.ts](../lib/catalog/csv-parser.ts)).

### Docs
- [x] Admin guide already shipped at Sprint 10 ([admin-guide.md](admin-guide.md)).
- [x] FAQ scaffold ([faq.md](faq.md)) — bilingual AR/EN.
- [x] E2E coverage matrix ([e2e-coverage-matrix.md](e2e-coverage-matrix.md)).
- [x] Security audit write-up ([security-audit.md](security-audit.md)).
- [x] A11y audit ([a11y-audit.md](a11y-audit.md)).
- [x] This readiness doc.

---

## Ops-track checklist (OWNER runs after deploy)

### Pre-launch infra (blocking M1)

1. **Run envs through the env-check.** Deliberately set `OTP_DEV_MODE=true` on a staging boot and confirm the container fails to start with `env_check.failed` in logs. Then set `false`, redeploy, confirm boot succeeds.
2. **Live Paymob merchant switchover (S11-D3-T2).** Flip from sandbox to live credentials in `.env.production` (`PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_INTEGRATION_ID_FAWRY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_IFRAME_ID`). Test a real card payment with one product → refund immediately. Verify webhook HMAC validates.
3. **Whats360 live device (S11-D4-T1 per ADR-033).** Confirm the Whats360 device is scanned against the live business WhatsApp number (not sales line `+201116527773`). Set `NOTIFICATIONS_DEV_MODE=false` in `.env.production`. Send a real OTP to your own phone → verify arrival.
4. **Email DNS records (S11-D6-T2).** In Cloudflare DNS, add SPF / DKIM / DMARC records for `printbyfalcon.com`. Run `mail-tester.com` from a `noreply@printbyfalcon.com` test send → target score >9/10.
5. **Backup + restore drill (S11-D2-T2).** Take a fresh Hostinger KVM, restore the latest prod snapshot + latest `pg_dump` → boot the app stack → confirm storefront renders + one test login works. Document the exact command sequence in [runbook.md §8.4](runbook.md).
6. **GlitchTip alert config (S11-D5-T2).** Create an email alert rule for `>10 errors / 5min` → trigger a simulated spike (curl 11× a deliberately-broken admin route) → confirm email arrives.

### Pre-launch verification (blocking M1)

7. **Lighthouse runs green on staging.** `bash scripts/perf/lighthouse.sh https://staging.printbyfalcon.com` → all 8 pages pass mobile >90 / desktop >95.
8. **k6 browse passes on staging.** `BASE_URL=https://staging.printbyfalcon.com k6 run scripts/perf/k6-browse.js` → p95 TTFB <800ms, 5xx <0.1%.
9. **k6 checkout passes on staging.** `BASE_URL=https://staging.printbyfalcon.com PRODUCT_SLUG=<a-real-slug> k6 run scripts/perf/k6-checkout.js` → p95 <1500ms, 200s on /checkout >99%.
10. **axe-core a11y scan green on staging.** `bash scripts/perf/axe-audit.sh https://staging.printbyfalcon.com` → zero serious + critical violations.
11. **NVDA pass on AR golden path.** Sign-in → browse → cart → checkout using NVDA on Chrome. Everything announces correctly.
12. **Cross-browser smoke.** Manually test golden path on Chrome mobile, Chrome desktop, Safari mobile, Firefox, Samsung Internet (popular in Egypt).
13. **Webhook rate limit fires.** Flood-test `/api/webhooks/paymob` with 1001 requests in <60s → confirm 429 after the 1000th.

### Content gates (blocking M1)

14. **Privacy + Terms reviewed by lawyer.** Remove the "REVIEW REQUIRED BEFORE M1" banner from [/privacy](../app/[locale]/privacy/page.tsx) + [/terms](../app/[locale]/terms/page.tsx) once the lawyer signs off.
15. **FAQ content reviewed + localised.** Skim [faq.md](faq.md); update phone numbers if changed; adjust wording to match store voice.
16. **Live catalog data imported.** Real 500–2000 SKU CSV dry-run on staging → clean run → import to production.
17. **Initial zones + COD settings set in admin.** `/admin/settings/shipping` + `/admin/settings/cod` — verify per PRD §10 Open Questions #10 + #13.

### Production deploy rehearsal (blocking M1)

18. **Rehearse deploy workflow** on staging: (a) manual `workflow_dispatch` prod deploy via GitHub Actions, (b) approval gate by owner, (c) health-probe success, (d) test rollback within 10 min. Full procedure in [runbook.md §6](runbook.md).
19. **Dependency audit.** `npm audit --production` — resolve any high or critical.

### Tester onboarding (blocking M1)

20. **5 B2C friendly testers identified.** Personal outreach — share onboarding instructions + dedicated WhatsApp support channel.
21. **3 B2B friendly companies identified.** Sales rep makes personal contact. Ensure applications are approved with pricing tier + credit terms pre-launch.

---

## Risk acceptance for M1 (per ADR + PRD)

- **Single-VPS architecture** (ADR-010, ADR-015). Uptime SLA 99% (~7.2h/month).
- **No off-site backups yet** (ADR-014). Revisit post-launch revenue.
- **Dashboard widget data correctness verified manually** (not E2E'd); accepted.
- **Paymob + Whats360 concentration risk** — single points of failure for payments + WhatsApp. Failover documented in architecture §8.1 + §8.3.
- **Admin UI a11y is best-effort** (PRD §8). Storefront + B2B are WCAG 2.1 AA.
- **ETA e-invoice submission deferred to v1.1** (ADR-003).

## Sign-off

When every box above is ticked:
- Merge Sprint 11 to main.
- Tag release `v0.12.0-m1`.
- Execute production deploy via GitHub Actions `deploy-production` workflow.
- Send soft-launch comms to 5+3 testers.
- M1 reached. 🚀
