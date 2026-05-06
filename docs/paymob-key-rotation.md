# Paymob — Key Rotation & Verification Runbook

> Sprint 11.5 — last updated 2026-05-06.

This document is the source of truth for changing or rotating the Paymob credentials in production. The keys themselves stay in `.env.production` (never in the database — see ADR-056). The admin panel only controls **which methods are visible** at checkout and **which mode** (LIVE / TEST) is active.

If you need to:

- **Switch between live and test mode without changing keys** → use the admin UI: `/admin/settings/payment-methods` → "TEST" / "LIVE" buttons. Confirms with your admin password.
- **Show or hide a specific method** (Visa / Fawry / Wallet / COD) → same page → toggle next to each method.
- **Replace a key** (rotation, lost token, new merchant account) → follow the steps below.

---

## Environment variables Paymob reads

| Variable | Required for | Notes |
|---|---|---|
| `PAYMOB_API_KEY` | LIVE mode | The long base64 string from Paymob dashboard → Settings → Account Info → API Key. |
| `PAYMOB_HMAC_SECRET` | LIVE webhooks | From Paymob dashboard → Settings → Account Info → HMAC. |
| `PAYMOB_INTEGRATION_ID_CARD` | LIVE card | From Paymob dashboard → Developers → Payment Integrations → "Online Card". |
| `PAYMOB_INTEGRATION_ID_FAWRY` | LIVE Fawry pay-at-outlet | From Paymob dashboard → Developers → Payment Integrations → "Aman / Fawry". Optional — only needed if Fawry method is enabled. |
| `PAYMOB_INTEGRATION_ID_WALLET` | LIVE wallets | Optional — from "Mobile Wallet" integration. |
| `PAYMOB_IFRAME_ID` | LIVE iframe | From Paymob dashboard → Developers → iframes → the ID number of your default iframe. |
| `PAYMOB_API_KEY_TEST` | TEST mode | Test merchant API key (Paymob provides this in the same dashboard, "Test Mode" toggle on). Optional — if missing, TEST mode falls back to dev-stub (no real call). |
| `PAYMOB_HMAC_SECRET_TEST` | TEST webhooks | Optional. |
| `PAYMOB_INTEGRATION_ID_CARD_TEST` | TEST card | Optional. |
| `PAYMOB_INTEGRATION_ID_FAWRY_TEST` | TEST Fawry | Optional. |
| `PAYMOB_INTEGRATION_ID_WALLET_TEST` | TEST wallets | Optional. |
| `PAYMOB_IFRAME_ID_TEST` | TEST iframe | Optional. |

**Mode rule:** when `Setting payment.mode = TEST`, the runtime tries `<NAME>_TEST` first, then falls back to `<NAME>`. So you can keep both sets in `.env.production` and switch from the admin UI without redeploying.

---

## Rotating a key (e.g., Paymob revoked the old API key, or you started a new merchant account)

**Pre-flight (5 minutes):**

1. Open Paymob dashboard → Settings → Account Info — copy the new key into a scratch buffer (do not paste it anywhere yet).
2. Confirm you're logged into the VPS as the deploy user: `ssh deploy@printbyfalcon.com`.
3. Confirm the current production stack is healthy: `docker compose -f docker-compose.prod.yml ps` — all containers should be `Up`.

**Rotation (5–10 minutes):**

4. Open `.env.production` on the VPS:
   ```
   sudo nano /var/pbf/env/.env.production
   ```
5. Replace the value of the variable you're rotating. Keep the previous value commented above for one cycle (in case rollback is needed):
   ```
   # PAYMOB_API_KEY=OLD_VALUE_BACKUP   # rotated 2026-05-06
   PAYMOB_API_KEY=NEW_VALUE_HERE
   ```
6. Save + close.
7. Restart the production stack so the new value is picked up by Next.js + the worker. **Do NOT restart only the web container** — the worker also reads these vars for the reconciliation job.
   ```
   cd /var/pbf
   docker compose -f docker-compose.prod.yml restart web worker
   ```
8. Wait ~20 seconds for both to come back up: `docker compose -f docker-compose.prod.yml ps`.

**Verify (3 minutes):**

9. Open `/admin/settings/payment-methods` in the browser. The "env missing" warning chip next to each method should NOT show for the methods you're using.
10. Place a real test order with `mode = TEST`:
    - Switch mode to TEST in the admin UI (requires your admin password).
    - From a phone or incognito window, browse to a product, add to cart, checkout.
    - Use a Paymob test card: `5123 4500 0000 0008` / any future expiry / any 3 digits CVV / OTP `123456`.
    - Order should reach `Confirmed` + `payment_status=PAID` in `/admin/orders`.
    - Webhook should also fire (audit log under `paymob_webhook` action will have a new row).
11. Switch mode back to LIVE.
12. Optional: place a real EGP 1 order on a personal card to confirm live processing. Refund manually from Paymob dashboard immediately after.
13. After 24 hours of no issues, remove the commented backup line from `.env.production` and restart again.

**Rollback if something breaks:**

- Re-open `.env.production`, swap the active value with the commented backup, save, restart `web worker`.
- File a Paymob support ticket if the new key is rejected by Paymob's API.

---

## Verifying keys are wired correctly without sending a real transaction

The fastest sanity check is the **env-missing chip** in `/admin/settings/payment-methods`:

- Visa / Fawry / Wallet methods that are **enabled** but lack their env var pair show an orange "env missing" pill.
- COD has no env requirement and never shows the pill.

For a deeper check (HMAC test, integration_id existence on Paymob's side):

1. SSH to the VPS.
2. From inside the web container, run a quick payload generation:
   ```
   docker compose -f docker-compose.prod.yml exec web node -e "
     const { createPaymentKey } = require('/app/.next/server/chunks/lib_payments_paymob.js');
     createPaymentKey({
       merchantOrderId: 'ROT-TEST-' + Date.now(),
       amountCents: 100,
       items: [{ name: 'rotation-test', amount_cents: 100, description: 'rotation', quantity: 1 }],
       billing: {
         firstName: 'Rotation', lastName: 'Test',
         phoneNumber: '+201116527773', email: 'admin@printbyfalcon.com',
         country: 'EG', city: 'Cairo', street: 'NA',
       },
     }).then(r => console.log(r)).catch(e => console.error(e.message));
   "
   ```
3. Output should include `paymentKey: "<long string>"` and an `iframeUrl` pointing at `accept.paymob.com`. If the URL points at `/payments/paymob/dev-stub`, the keys are **not** picked up — go back and re-check the env file.

> Note: the path inside the container may shift between Next.js builds — if `lib_payments_paymob.js` doesn't exist, run `find /app/.next -name 'paymob*'` to locate the actual chunk.

---

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| All checkout payments redirect to a local `/payments/paymob/dev-stub` page | API_KEY / IFRAME_ID / INTEGRATION_ID for the active mode is missing | Re-check the env file; restart `web worker`. |
| Webhook returns 401 | HMAC_SECRET wrong or missing | Re-paste from dashboard. |
| Webhook returns 200 but order stays `pending` | HMAC matches but transaction's `success: false` (Paymob declined) | Check Paymob dashboard for the decline reason; not a key issue. |
| `paymob.dev_mode.stub` warnings in logs at boot | `lib/env-check.ts` is firing because keys are missing in production | Either fill the env, or set `SKIP_ENV_CHECK=true` (not recommended). |
| Admin can flip to TEST mode but customer is still charged real money | TEST keys aren't set; runtime fell back to LIVE keys | Add `PAYMOB_API_KEY_TEST` etc. to `.env.production` and restart. |

---

## Who has access to do this?

- Only the OWNER role can flip mode or toggle methods (the admin UI gates on `requireAdmin(['OWNER'])`).
- Only the deploy user has SSH + read access to `.env.production`. If a sales-rep or ops admin needs an emergency mode flip, they ping the owner — there's no fast-path around the admin password.
- All flips emit audit-log rows (`settings.payment_method.toggle` / `settings.payment.mode`); query `audit_log` to see who flipped what when.

---

## Related documents

- [Architecture §8.1 — Paymob](architecture.md) — protocol details
- [decisions.md ADR-022](decisions.md) — Fawry direct integration dropped
- [decisions.md ADR-025](decisions.md) — Fawry via Paymob sub-integration
- [decisions.md ADR-056](decisions.md) — env-check fail-fast at boot
- [decisions.md ADR-068](decisions.md) — payment-method runtime toggle
- [decisions.md ADR-069](decisions.md) — admin password gate
- [m1-readiness.md](m1-readiness.md) — pre-launch verification checklist
