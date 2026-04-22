# B2B user guide — Print By Falcon

*Last updated: 2026-04-22 (Sprint 8)*

This guide is for the primary contact at a company that orders consumables + printers from Print By Falcon. It walks through signup, checkout, the bulk-order tool, reorder, and the Submit-for-Review flow. If you're an internal sales rep, read [sales-rep-guide.md](sales-rep-guide.md) instead.

## 1. Getting access

1. Open [https://printbyfalcon.com/en/b2b/register](https://printbyfalcon.com/en/b2b/register) (or `/ar/b2b/register` for Arabic).
2. Fill in company name, CR#, tax card, primary-contact name/phone/email, governorate, and optional monthly-volume estimate.
3. Pick a password — you'll use this to sign in once approved.
4. Our sales team reviews applications within 24 hours on business days. Approved companies receive a welcome email with a temporary login password; rejected applications receive a short reason and can re-apply with the same email.

While you're waiting, you can browse the catalog and buy at public list prices as a guest — your B2B account and its negotiated pricing activate only after approval.

## 2. Signing in and the portal

- `/b2b/login` — email + password. Forgot password? Click the link on the login page; reset tokens expire in 60 minutes.
- On first login you'll be asked to replace the temporary password.
- After that, you'll land on `/b2b/profile` — your company page. From there you can jump to:
  - **Bulk order** — the power-user entry tool (see §4).
  - **Company orders** — every order placed under this company's login.
  - **My orders** — same list, but also lists guest/B2C orders if you had any.
  - **Change password** / **Addresses** — standard account housekeeping.

## 3. Pricing you'll see

- Tier A / Tier B companies get a blanket discount off public prices on every SKU. The tier badge appears on your profile page.
- Tier C companies have per-SKU custom prices set by the sales rep. Products without a custom price show the public list price.
- The catalog + search + product detail always show *your* pricing. A crossed-out list price next to the discounted price is the public list price for context.

## 4. Bulk order tool (`/b2b/bulk-order`)

The fastest way to place a recurring order:

1. Type a SKU or part of a product name in the first row.
2. Pick a match from the dropdown — the product locks in with price + availability.
3. Set qty. If you type more than what's in stock, an amber warning appears — you can still submit (we'll hold what we have and notify you about the shortfall) or lower the qty.
4. **Press Enter** to append a new empty row, or click "Add row" / "Duplicate last" from the top bar.
5. You can add up to 50 rows per batch.
6. Click **"Add all to cart"** when the table looks right. Rows that can't be added (archived / fully out-of-stock) are listed separately — nothing mysteriously disappears.
7. Proceed to `/cart` and then checkout as usual.

Keyboard flow: Tab moves between fields. Enter in any row adds a new row at the bottom. Escape closes the suggestion dropdown.

## 5. Checkout — two ways to pay

When you reach `/checkout` as a B2B user, you'll see two options (unless your company is configured for one only):

### "Pay Now"
Standard path — same friction as B2C. Pick card or Cash on Delivery, confirm, done. Your invoice is emailed + sent via WhatsApp as soon as the payment lands (or immediately for COD).

### "Submit for Review"
The sales-rep-mediated path:
1. Fill in **"Placed by (name)"** — this is mandatory here so we know which person inside the company is responsible for the order. It's printed on the invoice and visible in your order history.
2. Optional: add a **PO reference** if your internal procurement expects one on the invoice.
3. Click "Submit for Review." Your order lands in the sales-rep queue in `Pending Confirmation` status.
4. You'll receive a WhatsApp confirming we got the request and will reach out within 24 hours.
5. A sales rep calls / messages you to agree on payment arrangements (PO, bank transfer, credit terms, whatever fits).
6. Once agreed, the rep clicks "Confirm" — your order flips to `Confirmed`, the invoice is generated, and you get a WhatsApp + email with the terms the rep agreed with you spelled out.

Stock is **held** from the moment you submit — no one else can snap up your units while we're agreeing terms.

## 6. One-click reorder

Every past order has a **"Reorder"** button — on the order detail page, in the Company orders list, and on the empty-cart state of `/cart`. Clicking it opens a modal showing each line with one of four statuses:

- **Available** — already ticked, will be added at today's price.
- **Limited stock** — fewer units left than you originally ordered; we'll add what's available (shown in brackets).
- **Out of stock** — grayed out; you can't add it now but can wait for restock.
- **Archived / unavailable** — we removed this SKU since your previous order. The line is shown for reference but can't be re-added.

Untick anything you don't want, click "Add to cart," and you're done. Prices are **today's** prices, not whatever you paid originally — tier discounts still apply.

## 7. What happens after you place an order

Regardless of path, every order runs through the same pipeline:

`Confirmed → Handed to Courier → Out for Delivery → Delivered`

For B2B accounts:
- Every status change sends a **WhatsApp** (always) and an **email** (always).
- You can view the live timeline + courier contact + waybill on `/account/orders/<id>`.
- Before we hand the order to the courier, you can request a cancellation from the order page. A sales rep reviews and approves or denies.

Questions? Reply to any of our WhatsApp messages or email the sales rep who approved your account — we'll route it.
