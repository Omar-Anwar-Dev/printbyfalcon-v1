# Whats360 — Key Rotation & Verification Runbook

> Sprint 11.5 — last updated 2026-05-06.

This document is the source of truth for changing the Whats360 credentials, re-pairing the device, or swapping accounts. The token + instance ID stay in `.env.production` (never in the database — see ADR-056). The admin panel only controls **transport mode** (LIVE / SANDBOX / DEV) and exposes a one-click connection check + test send.

For non-rotation tasks:

- **Pause WhatsApp during maintenance** → admin UI: `/admin/settings/whatsapp` → click "DEV". Confirms with admin password. No HTTP call leaves the server.
- **Run end-to-end tests without billing** → switch to "SANDBOX" — calls Whats360's `/api/v1/send-text?sandbox=true`. Returns simulated success without delivering or charging.
- **Verify the linked phone is online** → "Test connection" button on the same page.
- **Send yourself a one-line test message** → "Send test message" form on the same page.

---

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `WHATS360_TOKEN` | yes | 64-char hex, per-account. Whats360 dashboard → API Token. |
| `WHATS360_INSTANCE_ID` | yes | `device_xxxxxxxx`. Whats360 dashboard → device tile → "ID". |
| `WHATS360_WEBHOOK_SECRET` | yes | Free-form string (we generate it, then paste into Whats360 → device → Custom Webhook → Custom Header `X-Webhook-Token`). Required to authenticate inbound `send failure` / `subscription expiry` events. |
| `WHATS360_BASE_URL` | optional | Defaults to `https://whats360.live`. Override only if Whats360 announces a regional endpoint. |
| `NOTIFICATIONS_DEV_MODE` | optional, env-only | If `true`, **always** log-only regardless of DB mode. Used on developer laptops; must be unset/`false` in production. |
| `WHATS360_SANDBOX` | optional, env-only | If `true`, **always** appends `&sandbox=true`. Used on staging; must be unset/`false` in production. |

> Mode rule: env override > DB setting. So if `NOTIFICATIONS_DEV_MODE=true` is in `.env.production`, the admin UI's mode setting is ignored and the page surfaces a yellow warning chip. **Don't keep this env var set in production**.

---

## Rotating the token (Whats360 issued you a new one)

**Pre-flight:**

1. Log into Whats360 dashboard. Confirm the new token in API Settings.
2. Confirm device under "Devices" is still "Connected" (the green dot). If not, re-pair first (see § Re-pairing below).
3. SSH to the VPS as the deploy user.

**Rotation:**

4. Edit `.env.production`:
   ```
   sudo nano /var/pbf/env/.env.production
   ```
5. Replace the value:
   ```
   # WHATS360_TOKEN=OLD_TOKEN_BACKUP   # rotated 2026-05-06
   WHATS360_TOKEN=NEW_TOKEN_HERE
   ```
6. Save + close.
7. Restart web + worker:
   ```
   cd /var/pbf
   docker compose -f docker-compose.prod.yml restart web worker
   ```

**Verify (3 minutes):**

8. Open `/admin/settings/whatsapp`. The "Env keys status" panel should show all three vars as `Set`.
9. Click "Check now" under "Test connection". Expected: `Device connected ✓`.
10. Send a test message to your own number using the "Send test message" form. The message should arrive in WhatsApp within a few seconds.

If any step fails, see § Common errors below.

---

## Replacing the device (lost phone, dead battery, new SIM)

This is the longest path — Whats360 ties the API token to a specific WhatsApp session that lives on a physical device. If that device disappears, you must re-pair.

1. **Buy or borrow a phone**, install WhatsApp Business, register the store's business number on it. (If the SIM is also lost, get a replacement from the carrier first; the WhatsApp account follows the SIM, not the device.)
2. **Bring the device online** — open WhatsApp Business on the new device.
3. **Whats360 dashboard** → Devices → select the existing device tile → click "Re-link / Show QR".
4. On the device, in WhatsApp Business → Settings → Linked Devices → "Link a device" → scan the QR shown in the Whats360 dashboard.
5. Wait ~10 seconds. The device tile in Whats360 should flip to a green "Connected" dot.
6. Verify via the admin UI: `/admin/settings/whatsapp` → "Check now" → expect `Device connected ✓`.
7. Send a test message.

> Owner-operational note: keep the device powered + on Wi-Fi or cellular at all times. WhatsApp marks the linked-device session inactive after ~14 days if the phone never connects. Lost link = no OTPs, no order notifications.

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| "Test connection" returns `Device disconnected` | Phone is off, out of network, or session expired | Pick up the phone, open WhatsApp Business, leave it open for 30 sec; re-test. If still down, re-pair. |
| HTTP 401 from `/api/v1/send-text` | Token wrong or revoked | Re-paste from Whats360 dashboard. |
| HTTP 403 / "quota exceeded" | Plan quota hit | Upgrade plan in Whats360 dashboard or wait for cycle reset. |
| `Notification.status = FAILED` with error `opted_out` | Customer replied STOP / إلغاء — opt-out is per ADR-057 | Not a key issue; the customer asked to be unsubscribed. Normal. |
| OTPs work but order-status messages don't | Probably a worker issue, not Whats360 | Check `docker compose logs worker` for `send-whatsapp` job errors. |
| Admin UI shows mode = LIVE but messages don't arrive | Maybe DEV/SANDBOX env var is set | Check `.env.production` for `NOTIFICATIONS_DEV_MODE` or `WHATS360_SANDBOX`; remove + restart. |
| Inbound webhook never fires | `WHATS360_WEBHOOK_SECRET` mismatch with Whats360 dashboard | Open Whats360 dashboard → device → Custom Webhook → confirm the `X-Webhook-Token` header value matches `.env.production`. |

---

## Failover to Meta Cloud API (per ADR-033)

If Whats360 suspends our account or the underlying number is banned by WhatsApp:

1. Provision a Meta WhatsApp Business Cloud API account (3–5 business days, requires business verification).
2. Submit 5 templates: `auth_otp_ar`, `order_confirmed_ar`, `order_status_change_ar`, `b2b_pending_review_ar`, `payment_failed_ar` (templates already drafted in `lib/whatsapp/templates.ts`).
3. Add a new transport file `lib/whatsapp/transport-meta.ts` mirroring the Whats360 surface.
4. Switch `lib/whatsapp.ts` to dispatch on `WHATSAPP_TRANSPORT` env var (`whats360` / `meta`).
5. Replace tokens, restart, smoke test.

This is documented as a v1.1+ contingency — not part of MVP runbook.

---

## Who has access

- Only the OWNER role can flip mode or send test messages (`requireAdmin(['OWNER'])`).
- Only the deploy user can edit `.env.production`.
- All mode flips and test sends emit audit-log rows (`settings.whatsapp.mode` / `settings.whatsapp.test_send`).

---

## Related documents

- [Architecture §8.3 — Whats360](architecture.md) — protocol details
- [decisions.md ADR-033](decisions.md) — Whats360 chosen over Meta Cloud API
- [decisions.md ADR-056](decisions.md) — env-check fail-fast at boot
- [decisions.md ADR-069](decisions.md) — admin password gate
- [decisions.md ADR-070](decisions.md) — Whats360 mode runtime switch
- [m1-readiness.md](m1-readiness.md) — pre-launch verification checklist
