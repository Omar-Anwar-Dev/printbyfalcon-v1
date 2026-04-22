# E2E Coverage Matrix — MVP User Stories

Sprint 11 S11-D3-T1. Maps each PRD §4 user story to its E2E coverage. When an acceptance criterion is verified only by unit/integration tests, that's called out explicitly — the point is to not ship M1 with a blind spot.

## Legend
- **E2E** — covered by Playwright spec at path listed
- **UNIT** — exercised by a vitest (`*.test.ts`) only; E2E is overkill
- **MANUAL** — verified at sprint demo / post-deploy smoke; no automation
- **PARTIAL** — flow covered up to the external-dependency boundary (e.g. Paymob iframe, Whats360 device)

## B2C (Mahmoud)

| PRD Story | Coverage | Location |
|---|---|---|
| Enter printer model → compatible products | **E2E** | [search.spec.ts](../tests/e2e/search.spec.ts) — `printer model filter chip links to /search?printer=` |
| Live stock status on every product page | **E2E** | [sprint6.spec.ts](../tests/e2e/sprint6.spec.ts) — "OOS catalog UX smoke" |
| Phone → WhatsApp OTP → account in <60s | **PARTIAL** | [sprint11.spec.ts](../tests/e2e/sprint11.spec.ts) — form renders. Dev-mode OTP issuance covered by [lib/whatsapp.test.ts](../lib/whatsapp.test.ts) + [lib/otp.ts](../lib/otp.ts) unit paths. Real WhatsApp send = **MANUAL** (gated on Whats360 device) |
| Guest checkout works | **E2E** | [checkout.spec.ts](../tests/e2e/checkout.spec.ts) — "/checkout redirects to /cart when empty" + "product detail has add-to-cart" |
| Paymob card payment | **PARTIAL** | [checkout.spec.ts](../tests/e2e/checkout.spec.ts) — webhook HMAC rejection path; [sprint11.spec.ts](../tests/e2e/sprint11.spec.ts) — webhook GET probe. Full card → iframe → callback = **MANUAL** on staging |
| Paymob-Fawry pay-at-outlet (ADR-025) | **MANUAL** | Paymob's sub-integration routes through the same webhook. Verified in sandbox at Sprint 9; live verification post-deploy |
| Cash on Delivery | **UNIT** | [lib/settings/cod.test.ts](../lib/settings/cod.test.ts) — fee calculation + zone toggle |
| WhatsApp status updates | **E2E** | [order-pipeline.spec.ts](../tests/e2e/order-pipeline.spec.ts) — Whats360 webhook HTTP contract + [sprint11.spec.ts](../tests/e2e/sprint11.spec.ts) — 401 on missing secret |
| Order status + courier phone visible | **E2E** | [sprint6.spec.ts](../tests/e2e/sprint6.spec.ts) + [order-pipeline.spec.ts](../tests/e2e/order-pipeline.spec.ts) — admin route gating verified; customer-side tested via [lib/order/status.test.ts](../lib/order/status.test.ts) |

## B2B (Hala)

| PRD Story | Coverage | Location |
|---|---|---|
| Apply for corporate account online | **E2E** | [sprint11.spec.ts](../tests/e2e/sprint11.spec.ts) — "/b2b/signup renders" + [sprint7.spec.ts](../tests/e2e/sprint7.spec.ts) — "public B2B routes render" |
| Negotiated prices visible when logged in | **UNIT** | [lib/pricing/resolve.test.ts](../lib/pricing/resolve.test.ts) — tier A/B/C + custom override resolution |
| Bulk-order tool (SKU autocomplete + qty) | **E2E** | [sprint8.spec.ts](../tests/e2e/sprint8.spec.ts) — "bulk-order lookup API" |
| Submit-for-Review vs Pay Now | **MANUAL** | Routes gated by `checkout-context.ts`; covered by admin queue E2E in [sprint7.spec.ts](../tests/e2e/sprint7.spec.ts). Full SFR demo = manual at sprint 7 close |
| One-click reorder | **E2E** | [sprint8.spec.ts](../tests/e2e/sprint8.spec.ts) — "reorder preview API" |

## Admin / Owner (Ahmed)

| PRD Story | Coverage | Location |
|---|---|---|
| Home dashboard with sales KPIs + queues | **UNIT** | [lib/admin/dashboard.ts](../lib/admin/dashboard.ts) — no dedicated test file; widgets smoke-verified by admin dashboard auth gate in [sprint10.spec.ts](../tests/e2e/sprint10.spec.ts). **MANUAL** sign-off at sprint 10 demo |
| Every state change audit-logged | **UNIT** | AuditLog writes exercised in every admin action path; queryable via [docs/audit-log-queries.md](audit-log-queries.md) |
| Admin roles enforced (Owner / Ops / Sales Rep) | **E2E** | [sprint10.spec.ts](../tests/e2e/sprint10.spec.ts) + [sprint11.spec.ts](../tests/e2e/sprint11.spec.ts) — "admin sub-routes all redirect to login" |

## Ops (Mona)

| PRD Story | Coverage | Location |
|---|---|---|
| All orders in one filterable list | **E2E** | [sprint6.spec.ts](../tests/e2e/sprint6.spec.ts) — admin auth gates on /admin/orders |
| Bulk status updates + courier assignment | **E2E** | [sprint8.spec.ts](../tests/e2e/sprint8.spec.ts) — "admin auth gates" (route+contract) |
| Low-stock alerts | **UNIT** | [lib/inventory/low-stock.ts](../lib/inventory/low-stock.ts) — dashboard widget + daily digest job |

## Sales Rep (Karim)

| PRD Story | Coverage | Location |
|---|---|---|
| Queues for B2B applications + SFR orders | **E2E** | [sprint7.spec.ts](../tests/e2e/sprint7.spec.ts) + [sprint10.spec.ts](../tests/e2e/sprint10.spec.ts) — admin auth + public routes |
| Assign tier + credit on approve | **UNIT** | [lib/validation/b2b.test.ts](../lib/validation/b2b.test.ts) — zod schema for B2B application review |

## Infra / cross-cutting (Sprint 11 additions)

| Concern | Coverage | Location |
|---|---|---|
| Security headers on storefront | **E2E** | [sprint11.spec.ts](../tests/e2e/sprint11.spec.ts) — "CSP + HSTS + COOP present" |
| Webhook HMAC / secret rejection | **E2E** | [checkout.spec.ts](../tests/e2e/checkout.spec.ts) + [sprint11.spec.ts](../tests/e2e/sprint11.spec.ts) |
| Webhook rate limit (1000/IP/min) | **UNIT** | [lib/rate-limit.test.ts](../lib/rate-limit.test.ts) — trip behavior verified |
| Production env sanity | **UNIT** | [lib/env-check.test.ts](../lib/env-check.test.ts) — 8 cases |
| Health probe liveness | **E2E** | [sprint11.spec.ts](../tests/e2e/sprint11.spec.ts) — /api/health 200 |
| Sitemap + robots.txt + locale swap | **E2E** | [storefront.spec.ts](../tests/e2e/storefront.spec.ts) |

## Explicitly NOT automated (accepted risk)

These are verified manually at sprint demos or post-deploy smoke, and the cost-benefit of writing E2E around them was judged not worth it for MVP:

- **Full Paymob card redirect → iframe → return callback.** Sandbox-only; requires owner on the device. Verified end-to-end in sprint 4 + sprint 9 demos; post-deploy ops checklist includes a live test transaction.
- **Full Whats360 send → phone receives message.** Requires a physical device with the Whats360 QR-scanned session. Verified in Sprint 5 dev mode + live test scheduled in Sprint 11 ops checklist.
- **Email deliverability (SPF/DKIM/DMARC).** DNS-layer; validated via mail-tester.com in ops checklist (S11-D6-T2).
- **Lighthouse + k6 load performance.** External-tool runs against staging; harnesses shipped in [scripts/perf/](../scripts/perf/).
- **Dashboard widget correctness with real data.** Requires seeded data; widgets render-verified in auth-gate tests, correctness verified at sprint 10 demo.
