# Print By Falcon — Operational Runbook

**Last updated:** 2026-04-19
**Owner:** Omar Anwar (solo) — on-call 24/7 during MVP
**Status:** Living document. This is the 3 AM playbook. Keep it terse.

> This runbook is for **recurring operations** — deploys, rollbacks, incidents. For **one-time Sprint 1 setup** (DNS, SSL, Paymob merchant, Meta Business verification), see [sprint1-external-tasks.md](sprint1-external-tasks.md).

---

## 1. Quick reference

| What | Where |
|---|---|
| Production site | https://printbyfalcon.com (AR default) · https://printbyfalcon.com/en |
| Staging site | https://staging.printbyfalcon.com |
| Health — prod | https://printbyfalcon.com/api/health |
| Health — staging | https://staging.printbyfalcon.com/api/health |
| Repo | https://github.com/Omar-Anwar/print-by-falcon *(adjust if different)* |
| CI + Staging deploy | GitHub Actions → [Actions tab](https://github.com/Omar-Anwar/print-by-falcon/actions) |
| Prod deploy | GitHub Actions → **Deploy to Production** → Run workflow |
| Error tracking | https://errors.printbyfalcon.com (GlitchTip, self-hosted, ADR-013) |
| Uptime monitor | https://uptimerobot.com — two monitors: prod + staging `/api/health` |
| Server metrics | Netdata on VPS port 19999 (loopback only). SSH tunnel: `ssh -L 19999:localhost:19999 deploy@VPS` |
| Logs | `docker compose logs -f <service>` on VPS. App + worker write to stdout (JSON via pino) |
| Cloudflare | https://dash.cloudflare.com — DNS, WAF, rate-limit overrides |
| Paymob dashboard | https://accept.paymob.com (sandbox + live merchants) |
| VPS (Hostinger KVM2) | IP in `hpanel.hostinger.com` → VPS → SSH Access |
| Contact | support@printbyfalcon.com · +20 111 652 7773 (sales WhatsApp) |

---

## 2. Environments

| Env | URL | Host | Port (VPS loopback) | Deploy trigger | Access |
|---|---|---|---|---|---|
| Dev | http://localhost:3000 | laptop | — | `npm run dev` | anyone |
| Staging | https://staging.printbyfalcon.com | Hostinger KVM2 (same VPS as prod) | `127.0.0.1:3001` | Automatic on push to `main` | owner |
| Production | https://printbyfalcon.com | Hostinger KVM2 | `127.0.0.1:3000` | **Manual** `workflow_dispatch` in GitHub Actions | owner only |

Both environments run as separate Docker Compose projects on the **same VPS** per [ADR-015](decisions.md). Separate DB (`pbf_prod` vs `pbf_staging`), separate containers, separate subdomain.

Nginx on the host terminates TLS (Let's Encrypt) and routes by hostname to the loopback ports above. Static files (`/storage/*`) are served directly by Nginx from `/var/pbf/storage` — bind-mounted into the app containers (ADR-028).

---

## 3. Secrets & config

**Where secrets live:**
- On the VPS: `/var/pbf/repo/.env.production` + `/var/pbf/repo/.env.staging` (600 perms, owned by `deploy` user). **Never commit these.**
- In GitHub Actions → Settings → Secrets and variables → Actions: `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY`. Attached to `staging` and `production` Environments.
- Sensitive external creds: committed to `.env.*.example` as key-only templates — no values. See [.env.production.example](../.env.production.example) and [.env.staging.example](../.env.staging.example).

**Required env vars** (complete list in `.env.production.example`):

| Key | Purpose | How to rotate |
|---|---|---|
| `AUTH_SECRET` | Signs session cookies | Generate new 32-char random, update env file, `docker compose restart app`. **Invalidates every session.** |
| `DATABASE_URL` | Postgres connection | Change DB password: `ALTER USER pbf_prod WITH PASSWORD ...` in psql, update env, restart |
| `OWNER_TEMP_PASSWORD` | Seeded on first boot only | Seed ignores on subsequent boots; rotate Owner via `/admin/change-password` UI |
| `WHATS360_TOKEN` | Whats360 API auth (sends + account mgmt) | Whats360 dashboard → API settings → regenerate token; update env + `docker compose restart app worker` |
| `WHATS360_INSTANCE_ID` | Identifies the QR-attached device sending WhatsApp | Whats360 dashboard → Devices; instance_id is stable unless the device is deleted and re-created |
| `WHATS360_WEBHOOK_SECRET` | `X-Webhook-Token` header check on `POST /api/webhooks/whats360` | Generate new 32-char hex, update env, update the `X-Webhook-Token` header value in Whats360 dashboard webhook config |
| `SMTP_PASS` | Hostinger SMTP | hPanel → Emails → reset password, update env, restart |
| `PAYMOB_API_KEY` | Paymob server auth | Paymob dashboard → Developers → rotate; update env, restart |
| `PAYMOB_HMAC_SECRET` | Verifies webhook payloads | Same flow — rotate in Paymob dashboard first, then env |
| `SENTRY_DSN` / `GLITCHTIP` DSN | Error tracking | GlitchTip UI → Project settings → regenerate DSN |

**If a secret leaks** (committed, screenshared, pasted in chat, disclosed in logs): treat as incident.
1. Rotate the credential in the source system first (Paymob dashboard, Meta, DB password, etc.).
2. Update `.env.production` / `.env.staging` on the VPS.
3. `docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d` (picks up new env).
4. Document the incident in `docs/progress.md` under a new **Incidents** section.

---

## 4. Deploy procedure

### 4.1 Staging (automatic on merge to `main`)

1. Merge PR into `main` on GitHub (or push a commit directly — owner privilege).
2. `.github/workflows/ci.yml` fires first: install → prisma generate+migrate → lint → typecheck → test → build. Must be **all green**.
3. `.github/workflows/deploy-staging.yml` fires on the same push. SSHes to the VPS, runs `scripts/deploy-staging.sh`:
   - `git fetch --all --prune && git reset --hard origin/main` on `/var/pbf/repo`
   - `docker compose ... build app-staging worker-staging && up -d`
   - `docker image prune -f`
4. **Verify** (owner):
   ```bash
   curl -sS https://staging.printbyfalcon.com/api/health | jq
   # expect: { "ok": true, "service": "pbf-web", "env": "production", ... }
   ```
5. Run the smoke checklist — §5 below.

### 4.2 Production (manual `workflow_dispatch`)

**Never auto-deploy prod.** See [ADR-031](decisions.md) principle 4: "manual the scary."

1. Confirm staging is clean: health ✅, smoke test ✅, no new errors in GlitchTip for the last 15 min.
2. In GitHub → Actions → **Deploy to Production** → **Run workflow** → pick branch `main` → **Run**.
3. The `production` Environment protection rule prompts for **required reviewer approval** (you). Approve.
4. Workflow SSHes to VPS, runs `scripts/deploy-production.sh`:
   - `git fetch && git reset --hard origin/main` (same repo checkout — staging and prod share the repo but use different compose files + env files)
   - `docker compose -f docker/docker-compose.prod.yml --env-file .env.production build app worker`
   - `docker compose ... up -d`
   - `docker image prune -f`
5. **Verify** (within 2 min of deploy completion):
   ```bash
   curl -sS https://printbyfalcon.com/api/health | jq
   ```
6. Run smoke checklist against prod — §5.
7. **Watch GlitchTip + browser console for 15 min** after deploy. Error rate should stay at baseline.
8. Log the deploy in §10 below (date, commit SHA, notes).

### 4.3 Manual-SSH fallback (if CI/CD is down)

If GitHub Actions is degraded, deploy by hand:

```bash
ssh deploy@VPS
cd /var/pbf/repo
git fetch --all --prune
git reset --hard origin/main
# staging
docker compose -f docker/docker-compose.staging.yml --env-file .env.staging up -d --build
# prod
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build
```

---

## 5. Smoke test checklist

**Run after every deploy.** Start staging, repeat identically on prod after promotion.

### 5.1 Unauthenticated (storefront)
- [ ] `GET /api/health` returns 200 with `ok: true`
- [ ] `/ar` and `/en` render the homepage (hero + value-prop strip + category rail + featured products + brand rail + compatibility CTA visible)
- [ ] Direction is correct: `/ar` is RTL, `/en` is LTR (check header alignment + nav)
- [ ] `/ar/products` and `/en/products` render the catalog grid with ≥1 product
- [ ] `/ar/search?q=toner` returns results; `/ar/search?q=hp%20m404` triggers the printer-model banner (if the 200-SKU fixture is loaded)
- [ ] Mobile nav (hamburger) opens + closes; category expansion works
- [ ] Footer shows brand block + 3 link columns
- [ ] 404: `/ar/this-does-not-exist` renders the branded 404 page
- [ ] Language switch `/ar/products` ↔ `/en/products` preserves path
- [ ] `/sitemap.xml` + `/robots.txt` both 200
- [ ] Product detail renders gallery + specs + schema.org JSON-LD (view source)

### 5.2 Authenticated (B2C)
- [ ] `/sign-in`: request OTP → enter code (dev mode prints to logs; prod waits for real WhatsApp message)
- [ ] Post-sign-in redirects to account page; header shows "Account" icon+text
- [ ] Add-to-cart on a product detail page → cart count badge appears in header
- [ ] `/cart` renders cart with 1 item; qty +/- works; remove works
- [ ] `/checkout`: fill shipping address → select COD → place order
- [ ] `/order/confirmed/[id]` renders with order number + status "Confirmed"
- [ ] Confirmation email arrives (check support@printbyfalcon.com inbox)

### 5.3 Admin
- [ ] `/admin/login` with Owner creds works
- [ ] `/admin/products` lists products
- [ ] `/admin/orders` shows the just-placed order
- [ ] Click-through to order detail → status timeline renders

### 5.4 External integrations
- [ ] Paymob card checkout (sandbox mode in staging): pick "Paymob card" → iframe opens → test card `5123 4567 8901 2346` completes → webhook flips order to PAID
- [ ] GlitchTip shows no new errors in the 15 min post-deploy window

**If ANY step fails** → roll back (§6) before debugging further.

---

## 6. Rollback procedure

**Rule of thumb:** if you can't pinpoint the root cause in **15 minutes**, roll back first and debug second. Customer-facing downtime costs more than a debug session.

### 6.1 Fast rollback — no DB schema change

For deploys that only changed app/worker code (no new Prisma migrations, no new DB columns):

```bash
ssh deploy@VPS
cd /var/pbf/repo

# Find the previous good commit (usually the one before HEAD)
git log --oneline -5

# Reset repo to the previous commit
git reset --hard <previous-commit-sha>

# Rebuild + restart the broken env
# prod:
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build app worker

# staging:
docker compose -f docker/docker-compose.staging.yml --env-file .env.staging up -d --build app-staging worker-staging

# Verify health
curl -sS https://printbyfalcon.com/api/health | jq
```

**Target recovery time: 3–5 minutes** (docker build dominates).

### 6.2 Rollback with DB schema change

The app uses `prisma db push --accept-data-loss` on every boot (Sprint 1 pattern — see progress.md §Notes, Sprint 11 parking lot to switch to `migrate deploy`). This means:

- **Rollback that drops columns/tables** → `accept-data-loss` drops the column silently. Data in dropped columns is **lost irreversibly** unless you restored from backup first. Always restore DB before rolling back a schema-destructive change.
- **Rollback that only adds columns** → safe; the reverted app doesn't use the new column, rows just have default values.

Procedure for a destructive rollback:
1. **Stop** the app containers: `docker compose -f docker/docker-compose.prod.yml stop app worker`
2. **Restore** the DB from last night's backup: `bash scripts/restore.sh /var/pbf/backups/pbf-prod-YYYY-MM-DD-HHMM.sql.gz` (see §9).
3. Git-reset to previous commit: `git reset --hard <previous-commit-sha>`
4. Rebuild: `docker compose ... up -d --build app worker`
5. Verify health; run smoke test.

**Warning:** restoring from backup loses every order/cart/address created since the backup timestamp. Triage whether rolling back is worth it vs rolling forward with a hotfix.

### 6.3 Cloudflare-level rollback (emergency: serve 503 page)

If the VPS is entirely down and you need to give users a branded error instead of a browser default:

1. Cloudflare dashboard → `printbyfalcon.com` → **Rules** → **Page Rules**.
2. Add a rule: `printbyfalcon.com/*` → **Origin Error Page: Custom HTML** with a maintenance notice.
3. Disable the rule once the VPS is healthy again.

---

## 7. Monitoring & alerting

| Layer | Tool | Alert threshold | Who gets notified |
|---|---|---|---|
| Uptime | UptimeRobot (free) | Down > 5 min | support@printbyfalcon.com + SMS to owner |
| Application errors | GlitchTip self-hosted (per ADR-013) | First occurrence of a new error signature | email to support@printbyfalcon.com |
| Server RAM | Netdata — 90% utilization | > 90% for 1 min | email to support@printbyfalcon.com |
| Paymob webhook failures | App logs + GlitchTip | Any 5xx from `/api/webhooks/paymob` | via GlitchTip alert |
| Disk | Netdata — 85% utilization | > 85% | email |

**Grep recipes for common log checks:**

```bash
# All app errors in last hour
ssh deploy@VPS 'docker compose -f /var/pbf/repo/docker/docker-compose.prod.yml logs --since 1h app | grep -iE "error|fatal"'

# Paymob webhook activity
ssh deploy@VPS 'docker compose ... logs --since 1h app | grep -i paymob'

# Cart reservation cleanup cron (every 5 min)
ssh deploy@VPS 'docker compose ... logs --since 30m worker | grep cleanup'

# Order creation
ssh deploy@VPS 'docker compose ... logs --since 1h app | grep createOrderAction'
```

---

## 8. Common incidents

### 8.1 "Site is down" (UptimeRobot alert)

1. `curl -sS https://printbyfalcon.com/api/health` — timeout or 5xx?
2. `ssh deploy@VPS` → `docker compose -f /var/pbf/repo/docker/docker-compose.prod.yml ps`
   - Any container not Up → `docker compose logs <svc> --tail 200`
   - All Up → it's a networking issue; check Nginx: `sudo systemctl status nginx`, `sudo tail -f /var/log/nginx/error.log`
3. If the last deploy was < 30 min ago and this didn't start before it → **roll back** (§6).
4. If not deploy-related: check Cloudflare (dashboard → Analytics → Reliability) for edge issues.
5. Escalate past 30 min: check Hostinger status page (KVM2 host maintenance?).

### 8.2 High error rate in GlitchTip (spike)

1. Open the error in GlitchTip — is the signature tied to a recent commit? (check timestamps)
2. If yes → **roll back** (§6). Then fix-forward in a separate PR.
3. If the signature is old and just now spiking → check request volume. DDoS? Set Cloudflare WAF rate-limit to 60 req/min on `/api/*`.

### 8.3 Paymob webhooks failing (orders stuck in PENDING_PAYMENT)

1. Check `/api/webhooks/paymob` is reachable: `curl -I https://printbyfalcon.com/api/webhooks/paymob` → expect 405 (GET not allowed) or 401 (missing HMAC). If 404 — deploy is broken.
2. Check GlitchTip for HMAC-verify errors. If many → `PAYMOB_HMAC_SECRET` mismatch; confirm the env var matches Paymob dashboard → Developers.
3. Run the hourly reconciliation manually: `docker exec -it pbf-prod-worker-1 node node_modules/tsx/dist/cli.mjs worker/jobs/paymob-reconciliation.ts` (verify exact path).

### 8.4 Database full / slow

1. Disk: `ssh deploy@VPS 'df -h /'` — > 85% → prune old backups: `find /var/pbf/backups -name '*.sql.gz' -mtime +30 -delete` (retention is 14d in cron; 30d here is safety margin).
2. Long-running queries: `docker exec -it pbf-prod-postgres-1 psql -U pbf_prod -c "SELECT pid, state, query_start, query FROM pg_stat_activity WHERE state <> 'idle' ORDER BY query_start;"`
3. Kill a runaway: `SELECT pg_cancel_backend(<pid>);` — then terminate if needed: `SELECT pg_terminate_backend(<pid>);`
4. Sustained load → upgrade VPS to KVM3 (Hostinger support, in-place on same IP).

### 8.5 WhatsApp OTPs / status notifications not arriving (Whats360 — per ADR-033)

1. Is `OTP_DEV_MODE=false` in prod env? If `true`, codes are logged not sent. Same check for `NOTIFICATIONS_DEV_MODE` for order-status sends.
2. Is the Whats360 device connected? `curl "https://whats360.live/api/v1/instances/status?token=$WHATS360_TOKEN&instance_id=$WHATS360_INSTANCE_ID"`. If disconnected, re-scan the QR at `/api/v1/instances/qr-page` on the scanned device's phone.
3. `WHATS360_TOKEN` expired or regenerated in dashboard? Reads as 401 from `/api/v1/send-text`. Fix: copy new token from Whats360 dashboard → update env → `docker compose restart app worker`.
4. 403 responses = plan quota exceeded. Check Whats360 dashboard plan usage; upgrade or wait for rollover.
5. Whats360 webhook URL set in dashboard? Should be `https://printbyfalcon.com/api/webhooks/whats360` with `X-Webhook-Token` header value matching `WHATS360_WEBHOOK_SECRET` in env.
6. Check the `Notification` table for recent `FAILED` rows with error_message — that's where Whats360's failure reasons land: `SELECT created_at, status, error_message FROM "Notification" ORDER BY created_at DESC LIMIT 20;`

### 8.6 Storage (`/var/pbf/storage`) disk space runaway

Product images pile up. Check:
```bash
du -sh /var/pbf/storage/*
```
- Orphan images (product deleted but files not cleaned) — Sprint 11 housekeeping will add a cron. For now, manual: `docker exec -it pbf-prod-app-1 node scripts/storage-gc.ts` (once the script exists).

---

## 9. Backups & recovery

**What's backed up:**
- Postgres: `pbf_prod` + `pbf_staging` DBs, nightly 03:00 UTC via `scripts/backup.sh` (cron on the VPS, not inside Docker)
- Hostinger snapshots: weekly, automated by the provider

**What's NOT backed up** (risk acknowledged per [ADR-014](decisions.md)):
- `/var/pbf/storage/*` (product images) — stored on VPS disk, survives redeploys via bind mount, but if the VPS dies we lose them. Mitigation: source images can be re-uploaded from the owner's laptop (kept under `images/<sku>/*`).
- Off-site copies — local disk only.

**Retention:** last 14 days of nightly `pg_dump` in `/var/pbf/backups/pbf-*.sql.gz`.

**Restore procedure** (tested 2026-04-19 Sprint 1 D6-T2):

```bash
ssh deploy@VPS
cd /var/pbf/repo

# Pick a backup — sort descending, newest first
ls -lt /var/pbf/backups/pbf-prod-*.sql.gz | head -5

# Restore (requires prod app containers stopped so no concurrent writes)
docker compose -f docker/docker-compose.prod.yml stop app worker

# Run the restore script
bash scripts/restore.sh /var/pbf/backups/pbf-prod-YYYY-MM-DD-HHMM.sql.gz

# Bring app + worker back
docker compose -f docker/docker-compose.prod.yml up -d app worker
curl -sS https://printbyfalcon.com/api/health | jq
```

**Last restore drill:** 2026-04-19 (Sprint 1 D6-T2). Repeat quarterly.

---

## 10. Deploy history

| Date | Env | Commit | Notes |
|---|---|---|---|
| 2026-04-19 | staging | *(tbd this deploy)* | Sprint 1 — Foundation live. Auth + admin seed + Cloudflare edge. |
| 2026-04-19 | prod | *(tbd this deploy)* | Sprint 1 initial prod. Storage bind-mount fix (ADR-028). |
| 2026-04-19 | staging | *(tbd)* | Sprint 2 — Catalog. 50-SKU fixture + bilingual pages. |
| 2026-04-19 | prod | *(tbd)* | Sprint 2 prod. |
| 2026-04-19 | staging | *(tbd)* | Sprint 3 — Smart search + filters + 200-SKU fixture. |
| 2026-04-19 | prod | *(tbd)* | Sprint 3 prod. FTS bootstrap + perf:search ready. |
| 2026-04-19 | prod | `b3c42a3` → rolled back to `30eb5dd` | **Sprint 4 + UI foundation pass.** First-request crash on `/ar` & `/en` (digests 2617824920, 1579566200); branded error boundary rendered correctly. Rolled back via §6.1 in ~3 min — prod currently on `30eb5dd`. Root cause TBD; defensive fix prepared on branch `claude/tender-vaughan-7d2763` (boot-time DB env logging + per-call try/catch + `POSTGRES_PASSWORD` in env examples). See progress.md → Incidents for full writeup. |
| 2026-04-23 | prod | `61505a8` | **Sprint 11 + UI refiner v2 (Tier 1 + 2 + 3) bundled deploy.** Manual SSH per §4.3. Pre-flight env-check green. Manual backup `pbf-prod-2026-04-23-0350.sql.gz` taken. Prisma schema sync: added `NotificationOptOut` table + `@@index([externalMessageId])`. Boot successful: `env_check.passed` + Ready in 222ms. No errors. Rollback target = `a64f4d8` (Sprint 10) if needed. Full details in progress.md → Release Engineering → 2026-04-23. |

> Owner: append each new deploy to this table as it happens. A one-line note is enough.

---

## 11. Cheatsheet

```bash
# SSH into VPS
ssh deploy@VPS

# Container status (both envs)
docker compose -f /var/pbf/repo/docker/docker-compose.prod.yml ps
docker compose -f /var/pbf/repo/docker/docker-compose.staging.yml ps

# Tail app logs — prod / staging
docker compose -f /var/pbf/repo/docker/docker-compose.prod.yml logs -f app
docker compose -f /var/pbf/repo/docker/docker-compose.staging.yml logs -f app-staging

# Psql into prod DB
docker exec -it pbf-prod-postgres-1 psql -U pbf_prod -d pbf_prod

# Force health probe
curl -sS https://printbyfalcon.com/api/health | jq
curl -sS https://staging.printbyfalcon.com/api/health | jq

# Manual deploy (if GH Actions is down)
cd /var/pbf/repo && git fetch --all --prune && git reset --hard origin/main
docker compose -f docker/docker-compose.staging.yml --env-file .env.staging up -d --build
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build

# Manual backup (ad-hoc, outside cron)
bash /var/pbf/repo/scripts/backup.sh

# Disk check
df -h / && du -sh /var/pbf/*

# Netdata tunnel
ssh -L 19999:localhost:19999 deploy@VPS   # then open http://localhost:19999
```
