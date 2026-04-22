# Settings Panel Reference

**Audience:** store owner + ops team. Short, opinionated guide to every
toggle under `/admin/settings`. Numbers come from the Sprint 9 kickoff
(2026-04-22); everything here is admin-editable and survives redeploy
because it's stored in the database, not code.

---

## Store & invoice info — `/admin/settings/store`

Owner-only. These fields are printed on every invoice header. Edits apply
to **future** invoices; existing invoices keep their original snapshot.
Amend an existing invoice to re-render it with the corrected header.

| Field | Notes |
|---|---|
| Trade name (AR / EN) | Bilingual — both rendered on the invoice + site nav |
| Commercial Registry # | Placeholder `TBD` until the owner supplies |
| Tax Card # | Same — placeholder acceptable for MVP |
| Address (AR / EN) | Bilingual; single-line on invoice |
| Phone | Invoice footer + receipts |
| Email | Invoice footer; not used for outbound mail (Hostinger SMTP uses its own `FROM`) |
| Website | Invoice footer |
| **Logo** | Upload PNG / JPG / WebP / SVG (≤ 2 MB). Re-encoded to WebP ≤ 400px. Appears on invoices + storefront header when set. Clear button removes the logo without deleting the row. |
| **Support WhatsApp** | Sales-team manual WhatsApp line. Distinct from the Whats360 OTP/notifications number. Used by the Sprint 10 "Chat with us" bridge deep-link. Leave empty to hide the bridge. |

---

## Shipping & governorates — `/admin/settings/shipping`

Owner-only. Three sections on one page.

### Free-shipping thresholds
Global defaults: **B2C = 1,500 EGP**, **B2B = 5,000 EGP**. Zone-level
overrides (filled per zone below) take priority when set; leave blank
to fall back to the global default.

### The 5 zones
Each zone has four editable fields:

| Field | Default | Effect |
|---|---|---|
| Rate (EGP) | See defaults below | Flat rate per order when the free-ship threshold isn't met |
| B2C free-ship override | empty | If filled, supersedes the global B2C threshold *for this zone* |
| B2B free-ship override | empty | Same, for B2B |
| COD enabled | true | Master per-zone COD switch. Unchecking hides COD from checkout for all addresses in this zone |

**Seeded defaults** (owner-approved 2026-04-22):

| Zone | Rate (EGP) |
|---|---|
| Greater Cairo | 40 |
| Alex + Delta | 65 |
| Canal + Suez | 70 |
| Upper Egypt | 85 |
| Sinai + Red Sea + Remote | 130 |

### Governorate assignment
Tick several governorates and assign them to one zone in one click.
Default mapping follows the PRD §5 Feature 3 reading. The assignment
decides the shipping cost the customer sees at checkout when they pick
that governorate on the address form.

---

## Cash on delivery — `/admin/settings/cod`

Owner-only. Three fields, globally scoped. Per-zone toggle lives on
the Shipping page — when a zone has `codEnabled = false`, COD is
hidden regardless of the settings below.

| Field | Default | Effect |
|---|---|---|
| Enabled | on | Master kill switch. Off = COD never offered anywhere. |
| Fee type | FIXED | `FIXED` = flat EGP; `PERCENT` = % of subtotal. |
| Fee value | 20 EGP (fixed) | The fee charged on top of the order total when COD is selected. |
| Max order (EGP) | 15,000 | Subtotal cap. Orders above this can't pick COD. |

**Per-zone availability:** Sinai + Red Sea can be toggled off from the
shipping page if the courier refuses cash collection there. Global
policy stays on.

**Ops workflow:** Delivered COD orders sit in `paymentStatus =
PENDING_ON_DELIVERY`. Use the **"Mark COD as paid"** button on the
order detail page (or the `/admin/orders/cod-reconciliation` report —
grouped by courier) to flip them to `PAID` once cash is collected.

---

## VAT — `/admin/settings/vat`

Owner-only.

| Field | Default | Effect |
|---|---|---|
| VAT rate % | 14 | Applied at checkout to every non-exempt line item (qty × unit). |

**Per-product VAT exemption** lives on the product itself (`vatExempt`
flag). Edit a product from the catalog list to flip the flag. The VAT
settings page shows a list of the first 20 exempt products so the owner
can see at a glance which items are excluded.

Note: the VAT stored on each order is the calculated amount at the
time of order placement, not a rate — changing the rate does **not**
re-bill past orders. Future orders pick up the new rate immediately.

---

## Promo codes — `/admin/settings/promo-codes`

Owner-only. MVP scope: one promo code per order; stacking isn't
supported.

| Field | Notes |
|---|---|
| Code | Normalised to uppercase on save. Letters/digits/`-`/`_` only. Case-insensitive at checkout. |
| Type | `PERCENT` (1–100) or `FIXED` (EGP). |
| Value | Percent points or EGP amount per `type`. |
| Min order | Optional subtotal floor. Orders below this can't apply the code. |
| **Max discount (EGP)** | Optional absolute ceiling on the computed discount. **Essential for PERCENT codes** — "10% off, max 150 EGP" stops the code from giving 2,895 EGP off a 28k order. Empty = no cap. |
| Usage limit | Total uses across all customers. Empty = unlimited. Atomic counter — race-safe. |
| Valid from / to | Optional date window. Leave blank for no restriction. |
| Active | Soft toggle (keeps the row + history). |

**List page actions:**
- Search by code (substring match).
- **Disable expired** bulk action — flips `active = false` on every
  row whose `validTo < now`. Idempotent. Audit-logged.
- Per-row toggle-active button.

**Seeded demo codes** (from post-push):
- `WELCOME10` — 10% off, min 300 EGP, **max discount 150 EGP**, unlimited.
- `FIXED50` — 50 EGP off, min 500 EGP, 100-use cap.
- `B2BBULK` — 5% off, min 2,000 EGP, **max discount 500 EGP**, unlimited.

> **Migration note (post-Sprint 9 hotfix):** existing environments that seeded `WELCOME10` / `B2BBULK` before the cap was added won't auto-gain it on redeploy (`update: {}` in the upsert preserves admin edits). Open each code in `/admin/settings/promo-codes` and set `Max discount` manually after the fix deploys.

---

## Courier partners — `/admin/couriers`

Owner + Ops. Editable list of the courier companies used on order
hand-off. Names are bilingual (AR + EN); phone is the dispatch line.
Couriers with linked orders cannot be hard-deleted — deactivate
instead.

---

## Inventory thresholds — `/admin/settings/inventory`

Owner-only. Global low-stock threshold (default **5**). Per-SKU
overrides live on each product's inventory page and win over the
global default when set.

---

## Notifications — `/admin/settings/notifications`

Owner-only. Per-status / per-channel opt-out matrix. A ticked box
**disables** outbound notifications for that status × channel pair.

| Channel | Applies to |
|---|---|
| WhatsApp | B2C + B2B orders (primary channel) |
| Email | B2B orders only (secondary mirror) |

Default = all-on. Rate-limiting (5/phone/hour) is always enforced
regardless of this matrix.

---

## What's **not** on the settings panel

The following live elsewhere — either on the product / order itself, or
in code:

- Pricing tiers (A / B / C) — seeded via `prisma/post-push.ts`; change
  via an SQL migration + re-seed.
- Per-company custom pricing (Tier C) — admin at `/admin/b2b/companies/[id]`.
- Whats360 / Paymob / Hostinger SMTP credentials — `.env.*` only.
- Cloudflare / Nginx config — infrastructure (`docker/`, `runbook.md`).
