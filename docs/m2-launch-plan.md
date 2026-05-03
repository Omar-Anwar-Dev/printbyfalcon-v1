# M2 — Public Launch Plan (Draft)

**Status:** Draft for owner review (Sprint 12 D9-T3).
**Target window:** ~4 weeks after M1 reached, contingent on closed-beta health.
**Goal:** open registration to the public; transition from "8 friendly testers" to "anyone in Egypt can place an order."

This is the *plan*, not the execution — the plan exists so M2 isn't surprise work. Execution unfolds during the M1→M2 buffer and the first few weeks post-M2.

---

## 1. Definition of Done (M2 ✅)

A clear bar for "public launch reached":

1. **Open registration.** B2C self-serve sign-up via WhatsApp OTP works at scale (tested with 50+ random phone numbers across the beta window).
2. **Paymob live + verified.** PAYMENTS_PAYMOB_ENABLED=true; ≥10 real card payments processed in production with zero webhook failures.
3. **Real catalog ≥ 300 SKUs.** The 132 SKUs we shipped at M1 expanded with fast-mover refills + new product lines (whichever the beta shows demand for).
4. **Sales team operational.** Sales rep trained + executing on the Pending Confirmation queue at SLA (<24h response).
5. **Cash-flow checked.** First 30 days of M1 has produced enough order data to confirm the unit economics work (gross margin per order, COD failure rate, return rate).
6. **Marketing-ready.** Landing page polish, OG image, paid-ad creatives + landing pages prepared (even if ads aren't running yet).
7. **Support scalable.** Either you have 1+ trained support person OR a clear escalation path for after-hours (most likely a delayed-response WhatsApp expectation set in the auto-reply / business hours notice).

---

## 2. Pre-M2 work (during the M1→M2 buffer)

These run in parallel during the ~4 weeks between M1 close and M2 open.

### 2.1 Catalog growth (highest priority)

- Owner expands SKU count from 132 → 300+. Use the bestseller patterns from M1 orders to prioritize what to add.
- Re-run `npm run seed:catalog -- --dry-run` against staging for each batch before importing to production.
- Add 30-50 new product images per week (real photos preferred over stock).

### 2.2 Paymob switch-on (the in-place flip)

Per ADR-064, the procedure is:

1. Get the merchant approval email from Paymob Egypt.
2. Set live keys in `.env.production`:
   - `PAYMOB_API_KEY`
   - `PAYMOB_INTEGRATION_ID_CARD`
   - `PAYMOB_INTEGRATION_ID_FAWRY`
   - `PAYMOB_HMAC_SECRET`
   - `PAYMOB_IFRAME_ID`
3. Set `PAYMENTS_PAYMOB_ENABLED=true` (or remove the line entirely — default is enabled).
4. Trigger `Deploy to Production` via GitHub Actions.
5. Place a real test card payment (smallest SKU, your own card). Refund immediately via Paymob dashboard.
6. Verify webhook signature validates (GlitchTip should show no errors; the order should flip from `PENDING` → `PAID`).
7. Place a real test Fawry order — confirm reference code displays, pay at any Fawry/Aman outlet, confirm webhook flips the order.
8. Update beta WhatsApp group with a casual note that card payment is now live.

### 2.3 Sales team training

- Owner trains the sales rep (whoever is hired or designated) to:
  - Triage the `/admin/b2b/pending-confirmation` queue daily.
  - Use `confirmB2BOrderAction` to convert Pending → Confirmed.
  - Manage the `/admin/customers` and `/admin/b2b/companies` surfaces.
  - Recognize when to escalate (refund disputes, credit issues, system bugs) vs. handle directly.
- Document the sales workflow in [docs/sales-rep-guide.md](sales-rep-guide.md) (already exists from Sprint 8 — refresh with M1 lessons).

### 2.4 Paid-ad readiness (deferred but planned)

Even if you don't run ads at M2 launch, prepare the assets so M2+1 week can flip them on:

- **Landing page treatments** for at least 2 cohorts: "أحبار طابعتك بأقل من السعر" (price hook) + "متاح خصومات للشركات" (B2B hook).
- **OG image + WhatsApp share preview** — the social card that appears when someone shares your link.
- **One-line ad copy** in AR for Facebook/Instagram + Google search keywords.
- **GA4 or simple Cloudflare Web Analytics** wired up for measuring conversion. (Cloudflare Web Analytics is already in place per ADR-059.)
- **At least one promo code reserved** for the M2 launch (e.g., `LAUNCH2026` for 10% off).

### 2.5 Support scaling

- Decide if you (the owner) handle support solo for the first month post-M2, or train one trusted person.
- If solo: set explicit business hours in the WhatsApp business profile + storefront footer ("نرد على الواتساب 09:00 – 21:00").
- If trained person: same as sales-rep training above; add `OPS` role in `/admin/users`.

### 2.6 Backup off-site (deferred risk; address pre-M2 if possible)

ADR-014 marked off-site backups as "revisit post-launch." Pre-M2 is the moment.

- **Option A (recommended):** Backblaze B2 — cheapest cold storage; ~$5/month for first 100GB. Sync `pg_dump` files via a second cron.
- **Option B:** AWS S3 Glacier — comparable cost, more familiar to most ops people.
- **Option C:** Defer to v1.1 if M1 cash-flow doesn't justify $5/mo yet (acceptable risk per ADR-014 risk acceptance).

### 2.7 Tighten CSP to nonce-based (post-M1 polish, ADR-055 parking lot)

Sprint 11 left CSP as enforced-but-lenient (`'unsafe-inline'` + `'unsafe-eval'` on script-src). Pre-M2 is when to tighten:

- Generate a per-request nonce in middleware.
- Inject the nonce into Next.js `<Script nonce="..." />` and inline scripts.
- Drop `'unsafe-inline'` from script-src; replace with `'strict-dynamic' 'nonce-...'`.
- Test: dev + staging + one Cloudflare-fronted prod request — confirm no CSP violations in the browser console.

---

## 3. M2 launch day

When all 7 DoD items are green:

1. **Tag release.** `v1.1.0` (M2 = next minor since M1 was `v1.0.0-mvp`).
2. **Update beta WhatsApp group** with a thank-you and the public launch announcement.
3. **Switch storefront copy** to remove "إطلاق تجريبي / closed beta" framing if any survives.
4. **Open registration metrics dashboard.** Even a simple Google Sheet that tracks daily: new sign-ups, orders placed, error rate, support tickets.
5. **Soft-publish on Owner's social channels.** Don't go full marketing yet — let M2+1 week of stability data inform the paid-ad timing.

---

## 4. M2+ first month

Treat the first 30 days as M2 stabilization:

- **Daily monitoring continues** (per [daily-monitoring.md](daily-monitoring.md)) — owner does the morning sweep + the support team handles the rest.
- **Feedback channel still on** — the `/feedback` page stays live forever; it's a permanent retention tool.
- **Weekly review on Thursday** — what's the trend on order rate, support ticket rate, error rate?
- **Cash-flow review at 30 days** — does the unit economics work? If yes → start the v1.1 roadmap. If not → diagnose (catalog gap? pricing? customer acquisition cost?).

---

## 5. v1.1 roadmap (post-M2)

Already laid out in `implementation-plan.md` "Post-MVP Roadmap." Quick reference:

| Theme | When |
|---|---|
| CRM proper + B2B multi-user | After 2 weeks of M2 + B2B demand |
| Bosta API | After CRM rhythm settled |
| ETA e-invoice | If B2B asks (likely) |
| Reporting + audit UI | After 3 months of data |
| Marketing & retention | After M2+1 month |
| Inventory depth | When operational scale demands |
| Advanced checkout | When transaction volume justifies |
| Search upgrades | When catalog >5k SKUs |

---

## 6. Risks specific to M2 (not M1)

| Risk | Likelihood | Mitigation |
|---|---|---|
| Public traffic spike overwhelms VPS | Medium | Cloudflare in front handles burst; if origin saturates, k6 results from Sprint 11 inform a vertical scale upgrade (KVM2 → KVM4). |
| Real customer disputes (charge, refund, delivery) without trained support | High at launch | Owner handles personally for first 2 weeks; automate response templates after pattern emerges. |
| Cash-flow negative for first 30 days | Medium | Acceptable if marketing CAC is the cause; not acceptable if unit economics broken. Review at day 30. |
| Single-VPS still a SPOF | Low (acceptable per ADR-010) | Snapshot cadence to weekly; manual failover documented; revisit at M2+3 months. |
| Paymob fraud / chargebacks | Low (small volume) | Manual refund process exists per ADR-058; track chargeback rate; if >0.5% of orders, tighten signup verification. |

---

## 7. What this plan does NOT cover

Deliberately out of scope for M2:

- Multi-warehouse or supplier integration → v1.1 inventory depth.
- Subscription pricing / saved payment methods → post-M2 advanced checkout.
- Multi-currency or non-Egypt expansion → v2 (separate initiative).
- Native mobile app → never planned for v1.x; PWA shape of the storefront is sufficient.
- AI search / recommendations → v1.1 search upgrades, gated on catalog size.

---

## 8. Sign-off question for owner

After reviewing this plan, the owner needs to commit (or push back) on:

1. **Target M2 date:** ~4 weeks post-M1 default. Earlier? Later?
2. **Sales-team plan:** solo (you) or hire / train one rep before M2?
3. **Off-site backup decision (ADR-014 revisit):** B2 / S3 Glacier / defer?
4. **Marketing posture at M2:** soft-launch only, or paid ads from day 1?
5. **CSP tightening (ADR-055):** worth a sprint? or defer to v1.1?

These five answers shape the M1→M2 buffer work. Lock them in before the buffer starts so the work is sequenced cleanly.
