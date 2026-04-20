# Order Operations Guide

**Audience:** Print By Falcon ops team (Owner + Ops role — PBF admin accounts).
**Scope:** day-to-day order processing in the admin panel. If this doc disagrees with the code, the code is the truth and this guide needs an update.

---

## 1. The order status pipeline

```
PENDING_CONFIRMATION  ─►  CONFIRMED  ─►  HANDED_TO_COURIER  ─►  OUT_FOR_DELIVERY  ─►  DELIVERED
                    │            │              │                                       │
                    ▼            ▼              ▼                                       ▼
                CANCELLED    DELAYED_OR_ISSUE (recoverable)                          RETURNED
```

- **PENDING_CONFIRMATION** — only B2B "Submit for Review" orders land here. Sales rep confirms → `CONFIRMED`.
- **CONFIRMED** — payment settled (or COD accepted); awaiting courier handoff.
- **HANDED_TO_COURIER** — package in courier's custody; tracking info captured.
- **OUT_FOR_DELIVERY** — courier is delivering today.
- **DELIVERED** — customer received. Terminal unless a return is recorded.
- **CANCELLED / RETURNED** — terminal.
- **DELAYED_OR_ISSUE** — temporary state; admin must type a reason. Can recover back into the pipeline.

Each state change fires a WhatsApp message to the customer (and email too, for B2B) unless admin has opted that status out via `/admin/settings/notifications`.

---

## 2. Daily workflow (Ops)

### 2.1 Morning queue check

1. Open `/admin/orders?status=CONFIRMED` → these are today's orders to pack.
2. Open `/admin/orders/cancellations` → review any customer-submitted cancellation requests. Approve or deny before packing.

### 2.2 Packing done → courier handoff

**Single-order path:**
1. Open the order at `/admin/orders/<id>`.
2. Click **Mark Handed to Courier** in the Status actions panel.
3. Pick the courier, optionally override the agent phone, type the waybill number, set the ETA (defaults to +3 days).
4. Add a customer-visible note if you want something included in the WhatsApp update.
5. Submit → customer gets WhatsApp with courier name + phone + waybill + ETA.

**Bulk path (recommended when ≥3 orders ship with the same courier):**
1. Open `/admin/orders`.
2. Tick the checkboxes next to the orders you're shipping today.
3. Click **Mark selected as Handed to Courier**.
4. Fill the shared courier + waybill + ETA once — applied to every selected order.
5. The dialog reports succeeded / failed counts at the end.

### 2.3 Courier updates during the day

- **Courier tells you it's out for delivery** → open the order, click **Mark Out for Delivery**. Add a note if you have useful context.
- **Customer confirms receipt** → click **Mark Delivered**. `deliveredAt` is stamped automatically.

### 2.4 Exceptions

- **Courier traffic / address issue** → click **Flag as Delayed / Issue**. **A note is required** — write the reason; the customer gets it in their update.
- **Customer says it never arrived** → click **Flag as Delayed / Issue**, add the note, contact the courier. Once resolved, recover back to the appropriate pipeline state (typically **Out for Delivery**).
- **Customer cancels via WhatsApp before courier handoff** → easiest path: ask them to click "Request cancellation" on their order page. If they can't, you can request on their behalf via impersonation (post-MVP) or cancel directly via **Cancel order** in the order's Status actions.
- **Customer rejected delivery** → click **Mark Returned** (only valid from DELIVERED or OUT_FOR_DELIVERY). Record the return details as per §3.

---

## 3. Cancellations

### 3.1 Customer-initiated (the common path)

1. Customer clicks "Request cancellation" on `/account/orders/<id>` — this is only available pre-HANDED_TO_COURIER.
2. Order keeps its current status (reservation still held). `cancellationRequestedAt` is set.
3. Request appears in `/admin/orders/cancellations`.
4. Admin clicks **Approve** or **Deny** with an optional note:
   - **Approve** → order status goes to CANCELLED. Inventory reservation is released automatically (stock comes back + `RESERVATION_RELEASE` audit logged). Customer gets a WhatsApp update.
   - **Deny** → `cancellationResolution=DENIED` is recorded with the note. Customer sees the decision + note on their order page.

### 3.2 Admin-initiated cancellation

Same as any other status change: open the order, click **Cancel order** from Status actions, add an internal or customer-visible note.

---

## 4. Returns

1. Customer messages the store on WhatsApp (the floating "Chat with us" button on the site). Ops confirms items + reason.
2. Open the order at `/admin/orders/<id>`.
3. Click **Record a return**.
4. For each returned line item, type the qty (up to the ordered qty).
5. Reason: free-text, min 3 chars.
6. Refund decision:
   - **Pending review** — default. Finance team hasn't decided yet.
   - **Cash refund** — amount was / will be refunded in cash.
   - **Card refund (manual)** — admin will ask Paymob for a manual refund; no automated flow yet.
   - **Denied** — return accepted (item takeback) but no refund.
7. Refund amount (EGP) + optional internal note.
8. Submit → `Return` + `ReturnItem` rows created; visible on `/admin/orders/returns` and inline on the order page.
9. If the order should also move to RETURNED state, use Status actions separately — recording a return does NOT change order status by itself.

Refund processing is **manual** — the admin takes the refund decision here and communicates with finance / Paymob outside the system. Automated refunds are v1.1 scope.

---

## 5. Notifications

### 5.1 Reading the Notification table

Every outbound customer message is logged in the `Notification` table. Columns to know:

| Column | Meaning |
|---|---|
| `channel` | `WHATSAPP` or `EMAIL` |
| `template` | e.g. `order.statusChange.handed_to_courier` |
| `status` | `PENDING` (in queue), `SENT` (Whats360 / SMTP accepted), `FAILED` |
| `externalMessageId` | Whats360's id or the SMTP message-id |
| `errorMessage` | On `FAILED`, the reason (`rate_limited`, 4xx from Whats360, SMTP failure, etc.) |

Quick SQL triage (run on the VPS):

```bash
docker compose -f docker/docker-compose.prod.yml exec postgres psql -U pbf_prod -d pbf_prod \
  -c "SELECT \"createdAt\", channel, template, status, \"errorMessage\" FROM \"Notification\" ORDER BY \"createdAt\" DESC LIMIT 20;"
```

### 5.2 When a customer reports they didn't get a WhatsApp message

1. Find the order, check the Notifications table for a matching row (by `relatedOrderId` / timestamp).
2. If `status=FAILED`, read the error:
   - `rate_limited` — we hit 5 messages/phone/hour. Send the next update manually from the sales WhatsApp, or wait for the window.
   - `401` from Whats360 — `WHATS360_TOKEN` expired. See [runbook.md §8.5](runbook.md).
   - `403` from Whats360 — plan quota. Check Whats360 dashboard.
   - `invalid_phone_format` — customer's phone on the order is malformed. Fix the `User.phone` and manually re-send.
3. If `status=SENT` but the customer swears they got nothing — check Whats360 dashboard for delivery. Most common cause: device disconnected after we accepted. Re-scan the QR.

### 5.3 Opting a status out of notifications

`/admin/settings/notifications` (Owner only) has a channel × status matrix. Ticking a box suppresses future notifications for that pair entirely (no row created, no message sent). Existing PENDING / SENT rows are not touched.

Typical use: after customer launch, if `OUT_FOR_DELIVERY` messages start overlapping with the courier's own SMS, opt out the WhatsApp side so we don't double-notify.

---

## 6. Shortcuts to memorize

| Shortcut | Destination |
|---|---|
| `/admin/orders?status=CONFIRMED` | Today's ship queue |
| `/admin/orders?status=HANDED_TO_COURIER` | Out with couriers |
| `/admin/orders/cancellations` | Pending cancellation requests |
| `/admin/orders/returns` | Returns log |
| `/admin/couriers` | Manage courier list (deactivate a misbehaving courier here, don't delete) |
| `/admin/settings/notifications` | Channel × status opt-out (Owner only) |

---

## 7. Common mistakes + how to avoid

- **Marking an order "Handed to Courier" without a waybill** → The customer gets a WhatsApp without tracking info and they'll ask via WhatsApp anyway. Always fill the waybill.
- **Deactivating vs deleting a courier** → If the courier has any past orders, the Delete button is blocked (correctly — we'd orphan history). **Deactivate** hides the courier from future handoff pickers without losing the link.
- **Editing `internalNotes` to communicate with the customer** → Internal notes are team-only. Use `customerNotes` for anything you want the buyer to see on `/account/orders/<id>`.
- **Forgetting to flip `OTP_DEV_MODE=false` or `NOTIFICATIONS_DEV_MODE=false` in prod** → No WhatsApp sends happen, no errors — just silence. Verify by sending a test OTP to yourself right after a deploy.
