# Inventory Ops Guide (Sprint 6)

Day-to-day reference for the ops team working with Print By Falcon's inventory
and invoicing. Written to be readable without opening the code — sales/ops and
founder both consume this. Last updated 2026-04-21.

## 1. Inventory dashboard

`/admin/inventory` is the canonical view. Each row shows:

- **Available** — current qty, already minus active reservations during
  browsing.
- **Low-stock at** — the threshold this SKU is evaluated against (per-SKU
  override if set, otherwise the global default shown at the top of the page).
- **Status** — OK / Low / Out, rendered from the same logic the storefront
  uses.

Filters:
- **Low stock only** — tick to focus the day's attention.
- **Search** — SKU or name, bilingual.

Row actions:
- **Receive** — incoming stock from a supplier. Qty positive; optional note.
- **Adjust** — any signed delta (damage, theft, count correction, returned
  without an order). Reason is mandatory.
- **History** — full movement log per SKU with actor + timestamp.

Every action writes an `InventoryMovement` row (append-only) and an
`AuditLog` row. Nothing is destructive — even `Adjust -5` keeps the receipt.

## 2. Low-stock alerts

Two channels:

1. **Dashboard widget** — the home `/admin` page shows up to 20 low-stock rows,
   newest out-of-stock first. Refreshes on every visit.
2. **Daily email digest** — worker cron at 08:00 Africa/Cairo sends a digest
   email to every OWNER/OPS admin whose profile has an email. Empty-state is
   silent (no "all clear" mail). Renders bilingually per recipient's
   `languagePref`.

## 3. Thresholds

- **Global default** → `/admin/settings/inventory`. Default is 5 units
  (Sprint 6 kickoff decision).
- **Per-SKU override** → product's inventory history page
  (`/admin/inventory/[id]`) has a small form; empty = fall back to global.

Change the global: all SKUs without an override reflect the new threshold on
next dashboard refresh.

## 4. Bulk receive (CSV paste)

When a supplier delivery includes many SKUs:

1. Open `/admin/inventory/bulk-receive`.
2. Paste rows in the shape `sku,qty[,note]`. Header row (`sku,qty,note`) is
   optional; auto-detected.
3. Click **Run bulk receive**.
4. Per-row outcome is shown — SKU-not-found rows are reported, successful rows
   print the new qty.

Each row is processed through the same `receiveStock` path — full audit +
movement log.

## 5. Invoicing (ADR-034)

Invoices are **not files on the VPS**. The `Invoice` row stores the metadata
(number, order, version, amendment info); the PDF is rendered on-demand from
the immutable Order + OrderItem snapshot + the current `store.info` Setting.

### Lifecycle

| Trigger                                        | What happens                                                      |
|------------------------------------------------|-------------------------------------------------------------------|
| Order confirmed (COD)                          | Invoice row created; PDF sent via WhatsApp (Whats360 send-doc).   |
| Paymob webhook → PAID                          | Invoice row created (if missing) + WhatsApp delivery fires.       |
| Admin clicks "Amend" on `/admin/orders/[id]`   | Prior version is marked amended; new version allocated a fresh   |
|                                                | number; optional re-delivery to customer.                         |

For **B2B** orders the email channel also fires — PDF bytes attached in-memory
via SMTP. For **B2C** WhatsApp is the sole channel (PRD Feature 5).

### Store info on invoices

Admin → Settings → "Store & invoice info" — editable trade name, CR#, tax
card#, address, phone, email, website. Changes apply to *future* renders (the
invoice row is stable; the store fields are looked up at render time). Amend
an existing invoice if you need to bake in the correction.

### Downloading / printing

- **Admin** — `/admin/orders/[id]` has Open/Print + Amend buttons. Open renders
  inline in the browser → print via Ctrl+P. No file lands on the server.
- **Customer** — `/account/orders/[id]` has a Download PDF button. Tokenless
  for signed-in order owners; WhatsApp recipients get a signed URL that
  Whats360 fetches.

## 6. Troubleshooting

| Symptom                                   | Likely cause + fix                                                         |
|-------------------------------------------|-----------------------------------------------------------------------------|
| Storefront shows "Out of stock" for a SKU | `Inventory.currentQty <= 0` — receive stock, or check a stuck ORDER reservation |
| Customer didn't receive invoice WhatsApp  | `/admin/orders/[id]` → check Notification status (PENDING/SENT/FAILED). FAILED rows have `errorMessage`. |
| Amended invoice still shows old CR#       | Re-open the PDF (browser cache is 5 min). Confirm `/admin/settings/store`   |
| Bulk receive: "sku_not_found"             | SKU mismatch — verify against the product's `/admin/products/[id]`         |
| Low-stock digest empty                    | No SKUs are below their effective threshold — expected when stock is healthy|
| Invoice PDF loads slowly                  | First render downloads the Arabic font once; subsequent renders are cached  |

## 7. Deferred / post-MVP notes

- **PDF watermark on amendments** — renders but not yet a repeating background.
- **Invoice language selector** — Arabic-only per PRD.
- **500-SKU catalog** — deferred by owner at Sprint 6 kickoff; stays at 200.
- **Paymob-PAID → legacy confirmation email** — still parked in Sprint 4
  parking lot (out of scope for Sprint 6).
