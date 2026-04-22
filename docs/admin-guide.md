# Admin Panel User Guide

Sprint 10 S10-D9-T1. This guide covers every page in `/admin/*` and which role can do what. Written for non-technical users.

---

## Roles at a glance

| Role | Who | What they can do |
|---|---|---|
| **Owner** | Ahmed + other business owners | Everything. Only role that manages users, settings, pricing tiers. |
| **Ops** | Mona + ops team | Orders, status updates, courier handoffs, returns, inventory, catalog. Cannot change pricing, settings, or roles. |
| **Sales Rep** | Karim + sales team | B2B queues (applications + pending confirmation), company tier/credit decisions, customer lookup. Cannot see inventory or revenue. |

If a role can't access a page, they see an "unauthorized" screen — not a 404. This is by design so you know the page exists but you need to request access.

---

## Daily workflows

### Opening the panel

1. Go to `https://printbyfalcon.com/ar/admin/login` (Arabic) or `/en/admin/login` (English).
2. Enter email + password.
3. Forgot password? Click "Forgot password" → check email → click reset link.
4. New admin? You get an invitation email from another Owner with a link that expires in 48h.

### The home dashboard

What you see depends on your role:
- **Owner:** Sales today/week/month, pending queues, low stock, top products, top customers, 30-day trend.
- **Ops:** New orders, low stock, returns pending, top products.
- **Sales Rep:** B2B applications, pending confirmation, top customers.

The dashboard caches for 5 minutes so numbers may lag slightly. Hard refresh the page if you need real-time.

---

## Orders

### Finding an order

1. Go to **Orders** in the sidebar.
2. Use filters (status, date, payment method, customer type) or search by order number / name / phone.
3. Click any order to see its full detail page.

### Processing a new order (Ops)

1. From the dashboard, click "New orders awaiting" or go to **Orders** filtered by `CONFIRMED`.
2. Open the order. Verify address + payment method.
3. Click **Mark as Handed to Courier** → pick a courier, enter waybill, save.
4. The customer gets a WhatsApp notification automatically.
5. Later: update to **Out for Delivery** → **Delivered**.

### Bulk handoff to courier

From the Orders list, tick multiple rows → bottom bar appears → pick the courier + save. All selected orders flip at once.

### Editing a COD order before delivery (Sprint 10)

If the customer calls and wants to reduce qty or drop a line on a **CONFIRMED + unpaid (COD)** order:
1. Open the order.
2. Click **Edit** next to the line.
3. Enter new qty (must be lower than current; entering 0 removes the line) + a reason.
4. Save. Stock is restored automatically; totals recompute.
5. Reminder: **regenerate the invoice** from the invoice panel so the customer gets the updated PDF.

**Not allowed:** editing a PAID Paymob order. Those use the Returns flow (partial refund tracked there).

### Recording a cancellation

Customer clicks "Request cancellation" on their order page → it appears in **Orders → Cancellation requests**. Open + approve/deny with a note. If approved pre-handoff, stock is auto-released.

### COD reconciliation

At end-of-day, open **Orders → COD reconciliation**. See all COD orders still unpaid, grouped by courier. When courier hands over cash, open each order + click **Mark COD as paid**.

---

## Returns (Ops)

### Recording a return

Customer messages support via WhatsApp (out-of-band). Ops:
1. Open the customer's order (`/admin/orders/<id>`).
2. Click **+ Record a return** at the top of the Returns section.
3. Tick the items being returned + qty per line.
4. Write a short reason + pick the refund decision (Pending / Approved cash / Approved card / Denied).
5. Save.

**If the return fails the policy** (out of window, order below min, non-returnable product): a yellow banner appears with the reason. If your role is allowed to override (Owner sets this in Settings → Return policy), tick **Override policy** + write a reason. Every override is logged.

### Processing a return (approving refund)

1. Go to **Returns** (sidebar).
2. Click the row → detail page.
3. Change the decision to **Approved — cash** or **Approved — card (manual)**.
4. Save. **Stock is automatically restored to inventory** (only once per return — re-saves don't double-add).

### Return policy (Owner only)

Settings → **Return policy**:
- **Enable/disable** returns globally.
- **Return window (days)**: how long after delivery a return is accepted (default 14).
- **Min order value**: smaller orders don't qualify (default unlimited — any order can be returned).
- **Override roles**: which admin roles can bypass the policy. Default: everyone (Owner, Ops, Sales Rep). Tighten to Owner-only if needed.

Per-product toggle: in each product's edit page there's a **Returnable** checkbox. Uncheck it for items that can never be returned (custom orders, opened consumables you decide not to accept back).

---

## Catalog (Ops + Owner)

Products, Brands, Categories, Printer Models — all under respective sidebar items. Bilingual (Arabic + English). Archive instead of Delete whenever possible (archiving preserves order history integrity).

---

## Inventory (Ops + Owner)

- **Inventory list**: search SKU, see current qty + threshold, click to edit.
- **Bulk receive**: paste CSV (`sku,qty`) + save — good for large shipments.
- **Thresholds**: each SKU can override the global low-stock threshold.

---

## Customers (Owner + Sales Rep)

**B2C** customers (individual buyers) at **Customers**:
- Search + filter (active/deactivated).
- Click a customer → see their addresses + orders + contact info.
- Owner only: edit contact, deactivate/reactivate.

**B2B** companies at **B2B Companies**:
- Full profile: CR#, tax card, pricing tier, credit terms, addresses, recent orders.
- Change tier/credit (Owner + Sales Rep).
- Per-company custom pricing (Tier C): paste CSV to bulk-import overrides.

---

## B2B approvals (Sales Rep + Owner)

1. **B2B Applications**: pending company signups. Open → verify CR/tax card → Approve (assign tier + credit) or Reject (with reason). Email goes out automatically.
2. **Pending Confirmation**: Submit-for-Review orders waiting on sales-rep sign-off. Open → B2B Confirm panel → add payment-method note (e.g. "PO #A12 — Net-15") + rep note → Confirm. Invoice generates automatically.

---

## Settings (Owner only)

Eight panels:
1. **Store & invoice info** — name, logo, CR#, tax card, address, phone, support WhatsApp number (used for the "Chat with us" button).
2. **Shipping & governorates** — zones, per-zone rates, free-shipping thresholds, governorate → zone mapping.
3. **Cash on delivery** — enable/disable, fee type (fixed or %), max order, per-zone availability.
4. **VAT** — default rate (14%) + list of VAT-exempt products.
5. **Promo codes** — create/manage discount codes (% or fixed, expiry, usage cap).
6. **Return policy** — enabled toggle, window, min order, override roles.
7. **Courier partners** — partner list shown in the courier-handoff modal.
8. **Inventory thresholds** — global low-stock floor.
9. **Notifications** — per-status toggle for WhatsApp + email.

---

## Admin users (Owner only)

**Admin Users** in the sidebar:
- **Invite**: email + role → recipient gets 48h link to set their own password. Password is never sent in the clear.
- **Change role**: switch someone between Owner / Ops / Sales Rep. The last remaining Owner can't be demoted (prevents lockout).
- **Deactivate**: kills their sessions immediately + blocks login. Reactivate anytime.

You cannot change your own role or deactivate yourself — another Owner has to do it.

---

## The audit trail

Every state-changing action writes a row to `AuditLog`. A UI viewer lands in v1.1 — for now, see [docs/audit-log-queries.md](audit-log-queries.md) for ready-to-run SQL.

---

## WhatsApp support bridge

On every storefront page (except admin + checkout pages — avoids distraction), customers see a green **WhatsApp** floating button. It opens `wa.me/<your support number>` with a pre-filled message that includes what page they were on (product SKU, order number, etc.).

Configure the number in **Settings → Store & invoice info → Support WhatsApp**. Leave blank to hide the button entirely.

---

## Exports (Owner + Ops)

**Orders → Export CSV** downloads all orders matching the current filter (status/date/payment). UTF-8 BOM so Arabic renders correctly in Excel.

---

## Getting help

Report bugs at https://github.com/<org>/PrintByFalcon/issues or ping the dev channel. Include the order number / customer ID if relevant — the dev can pull the audit trail from there.
