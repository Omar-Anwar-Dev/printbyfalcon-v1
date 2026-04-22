# Returns workflow — ops procedure

Sprint 10 S10-D9-T2. Detailed step-by-step for recording + processing a return, including policy / override / stock-release flow.

---

## The bigger picture

1. **Customer requests a return** — via WhatsApp / phone / email. Out-of-band, there's no customer self-serve return UI in MVP.
2. **Ops records the return** — in the admin panel, against the customer's order, picking specific items + qty.
3. **Finance/Ops decides** — Approved (cash refund), Approved (card-manual), Denied, or left Pending.
4. **Stock is restored** — automatically on approval, once per return.
5. **Refund is issued** — out-of-band (bank transfer / Paymob manual partial refund). The decision + amount are logged; the actual money movement is not automated.

---

## Recording the return

### From the customer's order detail page (canonical path)

1. Open `/admin/orders/[orderId]`.
2. Scroll to the **Returns** section → click **+ Record a return**.
3. The recording form loads with:
   - The order's line items pre-listed.
   - A yellow **Return policy warning** banner if the order fails policy (see below).
4. Tick the items being returned. Adjust qty per line (cannot exceed the line's original qty).
5. Write a reason (required, 3-500 chars). Example: "Customer received damaged cartridge — unit seal broken."
6. Pick a refund decision:
   - **Pending** — default; flip later once finance decides.
   - **Approved — cash** — refund is paid in cash (for COD orders) or bank transfer.
   - **Approved — card (manual)** — refund will be pushed back to Paymob manually from their dashboard.
   - **Denied** — refund denied (wrong use case / out-of-window with no override).
7. Optionally enter the refund amount (EGP).
8. Add an internal note if relevant (team-only; not shown to customer).
9. **Save**. You're redirected back to the order.

### Policy violation paths

When any of these are true, the record form shows a yellow banner:
- Returns are globally disabled.
- Today is past `order.deliveredAt + windowDays` (default 14).
- Order's total is below `minOrderEgp` (optional).
- Any selected item is flagged non-returnable in its product edit page.
- The order was never delivered (still in `CONFIRMED` / `HANDED_TO_COURIER` / `OUT_FOR_DELIVERY`).

The admin has 3 options:
1. **Cancel** the recording — don't create a return row. Typical for "actually let me double-check the dates".
2. **Tick "Override policy"** + write a reason — allowed only for roles in the configured `overrideRoles` list (default: all admins). The reason is mandatory + saved on the Return row.
3. **If the role can't override** — a note explains "Ask an Owner" and the only option is Cancel.

Every override is captured:
- In `Return.policyOverride = true` and `Return.overrideReason`.
- In `AuditLog` under `order.return_recorded` with `policyOverride` + reason in the `after` JSON.
- On the Returns list, the row gets a small "Policy override" pill.

---

## Processing the return (approving refund + releasing stock)

1. Go to **Sidebar → Returns** (or click a return row from the order detail page).
2. Filter to `Refund decision = Pending` to find the queue.
3. Click the return → detail page.
4. Review the reason + items + (if present) override reason banner.
5. Change the decision to **Approved — cash** or **Approved — card (manual)**.
6. Confirm the refund amount (if not already filled in).
7. Save.

**What happens on save:**
- `Return.refundDecision` flips to the new decision.
- If the new decision is Approved (either cash or card-manual) **and** stock wasn't yet released:
  - Each line's `qty` increments the corresponding product's `Inventory.currentQty`.
  - An `InventoryMovement(type=RETURN, qtyDelta=+qty, reason="Return <returnId>", refId=<orderId>)` row is created per line.
  - `Return.stockReleasedAt` is set to now.
- A success banner tells you whether stock was released.

**Idempotency:** flipping a Return from Approved to Pending and back to Approved does NOT re-release stock. The check is `stockReleasedAt === null`. If you accidentally approved with wrong qtys, adjust the quantities manually via the `InventoryMovement` path (admin > inventory > receive/adjust) — the system won't do it for you.

---

## Following the refund money

The system doesn't send money. After approving:
- **Cash refund**: arrange with the customer — either handed back by the courier on pickup, or bank transfer. Record the payout in accounting.
- **Card (manual)**: log into Paymob Merchant Dashboard → find the original transaction → "Refund" (full or partial). Paymob sends a webhook but we don't currently auto-flip the order to `REFUNDED` (MVP scope); the paymentStatus stays as-is. Note it on the Return row.

---

## Viewing return history

**Sidebar → Returns** shows the log. Filters:
- Refund decision (Pending, Approved cash/card, Denied).
- Stock released? (Yes/No/All).

Each row surfaces:
- Order number (link to order detail).
- Customer name.
- Reason + (if override) the override reason in a yellow line.
- Refund decision badge.
- Refund amount.
- Stock released badge.
- Date.

Clicking a row opens the return detail page where you can adjust the decision.

---

## Related policy settings (Owner only)

**Settings → Return policy** controls:
- **Enabled** — master on/off.
- **Return window (days)** — max days after delivery. Default 14.
- **Min order value (EGP)** — optional floor. Default unlimited.
- **Override roles** — checkboxes for Owner / Ops / Sales Rep.

The list of products currently marked non-returnable appears at the bottom of the same page (first 20). Edit individual products via their own edit page.

---

## Audit trail

Every return action writes `AuditLog` rows. See [docs/audit-log-queries.md](audit-log-queries.md) for ready-to-run SQL — especially query #3 for finding all policy-override returns.

---

## Bugs + edge cases to watch

- **Customer paid by Paymob + order not yet delivered**: can't record a return (policy check: `not_delivered`). Use the existing cancellation flow (request from the customer's order page) instead.
- **Order has no linked product** (product deleted since the order): the policy check treats it as non-returnable. Override with a reason if the customer is clearly right.
- **Partial returns across multiple rounds** (e.g. 3 units returned now, 2 more next week): create a second Return row — don't try to edit the first. Each row is its own unit of approval + stock release.
- **Return decision flipped from Approved back to Pending**: stock remains restored. If this is wrong (e.g. you accepted it and want to unaccept), manually decrement inventory via an ADJUST movement with a note.
