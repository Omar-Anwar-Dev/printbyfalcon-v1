# Sales Rep Workflow Guide

_Sprint 7 — Owner + Sales Rep playbook for B2B application review, tier + credit-term assignment, and post-approval pricing upkeep._

This guide walks the day-to-day B2B flow: from the moment a company fills the signup form to the moment their orders are flowing cleanly through the pipeline at the right prices. If you only have 30 seconds, read §1 and §2.

---

## 1. Roles at a glance

| Task                               | Owner | Sales Rep | Ops |
|------------------------------------|:-----:|:---------:|:---:|
| Review + approve B2B application   |  ✅   |    ✅     | —   |
| Reject B2B application             |  ✅   |    ✅     | —   |
| Assign / change pricing tier       |  ✅   |    ✅     | —   |
| Set credit terms + credit limit    |  ✅   |    ✅     | —   |
| Add / remove per-SKU override      |  ✅   |    ✅     | —   |
| Suspend a B2B company              |  ✅   |    ✅     | —   |
| Resend welcome email (manual)      |  ✅   |    ✅     | —   |
| Order fulfilment for B2B orders    |  ✅   |    —      | ✅  |

Ops handles the order pipeline (courier handoff, status changes, returns). Commercial decisions stay with Owner + Sales Rep.

---

## 2. The approval flow — 5-minute checklist

When a new application arrives at **`/admin/b2b/applications`** (badge in the side-nav shows the pending count):

1. **Open the card.** Note the company name, CR#, tax card #, and primary-contact details.
2. **Sanity-check the credentials.**
   - Is the CR# plausible (Egyptian commercial registry format)?
   - Is the tax card # plausible (9 digits, sometimes dashed)?
   - Does the phone match an Egyptian mobile pattern?
   - Is the contact person + email plausibly tied to the company?
3. **Decide on tier.**
   - **Tier A (10%)** — standard corporate customer, no special negotiation.
   - **Tier B (15%)** — sustained volume or long relationship history.
   - **Tier C (custom)** — everything negotiated line-by-line; use for key accounts with specific SKU deals.
4. **Decide on credit terms.** Default **Pay on order** (no credit). Only extend terms if: (a) sales team has an existing relationship, and (b) the customer has a clear AP process. `Net-15` / `Net-30` / `Custom (with limit)` available.
5. **Click Approve.** A welcome email with a 12-char temp password goes out automatically. `mustChangePassword=true` forces them to rotate on first login.

If anything in 2–4 is off:

- **Click Reject with a clear, actionable reason.** The applicant gets an email with that reason; their email + CR# stay free for resubmission. Good rejection reasons are **specific and fixable**:
  - _"Tax card image is blurry — please resubmit with a clearer scan."_
  - _"Commercial registry number doesn't match the name on the tax card — please double-check."_
  - _"Phone number returned out-of-service when we called; please update and resubmit."_
- **Don't** reject as a delaying tactic. A rejection starts a fresh conversation; it doesn't schedule a follow-up.

---

## 3. Tier philosophy

Keep the tier grid simple. Pricing drift (dozens of per-account discounts) is how B2B pricing becomes un-auditable.

- **New customer, no relationship history.** Default to Tier A. Upgrade later if they earn it.
- **Known customer from the Facebook / WhatsApp era.** Honor whatever rate you were giving them manually — usually Tier A or Tier B, rarely Custom.
- **Key account (major corporate, government, education, recurring large POs).** Tier B as a floor. If they want specific SKUs at specific prices, move them to Tier C and record the overrides.
- **Never** promise a tier in writing before you've reviewed the application. Say _"we'll confirm your pricing when we set up the account."_

---

## 4. Post-approval upkeep — `/admin/b2b/companies`

The company list is the working surface once an account is live. Click any row to open the **company detail page**:

- **Commercial terms box** — change tier, credit terms, credit limit, status (Active/Suspended), and **checkout policy**.
  - Checkout policy controls what the B2B user sees at checkout:
    - **Both (default)** — Submit for Review + Pay Now
    - **Submit for Review only** — forces everything through sales
    - **Pay Now only** — self-serve checkout only (no sales review)
- **Per-product price overrides** — add a row per SKU for Tier C accounts (or for one-off deals on Tier A/B accounts). Wins over the blanket tier discount.
- **Recent orders** — 15 most recent orders for the company; click through to the full order detail.

All changes are audit-logged (`AuditLog.action = b2b.company.*`). When in doubt, query the DB for the change history.

---

## 5. Handling common situations

**"The customer says the welcome email didn't arrive."**
1. Check their spam folder first — Hostinger SMTP lands there sometimes.
2. From `/admin/b2b/companies/<id>`, you can't resend programmatically yet (coming v1.1). For now: ask them to click **Forgot password** on `/b2b/login`, which sends a reset link to the same address.

**"The customer's tax card # was wrong on the application."**
- CR# and tax card # are read-only from the customer side by design (PRD Feature 4). Edit them yourself via Prisma Studio / DB — they shouldn't change often.

**"We want to temporarily pause an account (non-payment, etc.)."**
- Set the company status to **Suspended** from the detail page. Their login instantly stops working; existing orders stay in the pipeline; all audit history is retained.

**"They asked for a bigger discount."**
- Bump tier (A → B) or add Tier C overrides on the SKUs they care about. **Don't** create bespoke tiers — the 3-tier model is deliberate to keep pricing legible.

**"The customer resubmits after rejection."**
- They can — Design A rejection leaves their email + CR# free. Just re-review the new application the same way.

---

## 6. Reading the audit log

Every B2B action writes an `AuditLog` row you can query directly in Postgres:

```sql
SELECT "createdAt", "actorId", "action", "entityId", "before", "after", "note"
FROM "AuditLog"
WHERE "entityType" IN ('B2BApplication', 'Company', 'CompanyPriceOverride')
ORDER BY "createdAt" DESC
LIMIT 50;
```

Common action names: `b2b.application.submit`, `b2b.application.approve`, `b2b.application.reject`, `b2b.company.update_terms`, `b2b.company.override.create`, `b2b.company.override.update`, `b2b.company.override.delete`.

The UI viewer arrives in v1.1 — until then, SQL is the canonical trail.

---

## 7. Demo data for testing

Run `npm run seed:b2b` against a dev database to get three test companies spanning all tiers. Credentials are printed to stdout. The seed is idempotent, so re-running refreshes the fixtures without duplicating rows.

Tier C's demo company gets one per-SKU override on whichever product sorts first in the catalog — enough to verify the override path on a demo walkthrough.

---

## Appendix — Related documentation

- **Pricing resolution internals:** [lib/pricing/resolve.ts](../lib/pricing/resolve.ts) — the 3-path resolver (override → tier → base).
- **Approval action internals:** [app/actions/admin-b2b.ts](../app/actions/admin-b2b.ts) — atomic user + company creation on approval.
- **B2B architecture reference:** [docs/architecture.md](architecture.md) §5.3 "Pricing & B2B".
- **ADR-005:** split auth flows (WhatsApp OTP for B2C, email+password for B2B).
- **ADR-007:** one shared login per company in MVP.
- **ADR-016:** three admin roles (Owner / Ops / Sales Rep).
