# Daily Monitoring Playbook — M1 Closed Beta

**Audience:** the owner (you), once production is live with the 8 friendly testers.
**Cadence:** 3 sweeps per day during the soft-launch window (S12-D2 through S12-D8). Each takes 5–10 minutes.
**Goal:** catch real-user issues fast enough to fix same-day; keep error rate <1% per Sprint 12 exit criterion.

---

## Quick reference

| What | Where | Healthy state |
|---|---|---|
| App health | `https://printbyfalcon.com/api/health` | `200 OK` with `{ ok: true }` |
| Admin dashboard | `https://printbyfalcon.com/ar/admin` | All widgets render; Whats360 widget is GREEN |
| Whats360 device | Admin home widget OR direct: `curl ".../api/v1/instances/status?token=...&instance_id=..."` | `connected: true` |
| Errors | GlitchTip: `https://glitchtip.printbyfalcon.com` | <10 events/5min |
| Server health | Netdata SSH tunnel: `ssh -L 19999:localhost:19999 deploy@VPS` → http://localhost:19999 | CPU <70%, memory <85% |
| Uptime | UptimeRobot dashboard | "Up" on the public URL probe |
| New feedback | `https://printbyfalcon.com/ar/admin/feedback?status=NEW` | All triaged within 24h |
| New orders | `https://printbyfalcon.com/ar/admin/orders` | All in `CONFIRMED` (not stuck in `PENDING`) |
| Pending B2B | `https://printbyfalcon.com/ar/admin/b2b/pending-confirmation` | Oldest <24h |

---

## 1. Morning sweep (~09:30 Cairo)

**Order matters — do these in sequence.**

### Step 1 — Is the site up?

```bash
curl -fsS https://printbyfalcon.com/api/health
# Expect: {"ok":true,...}
```

If this fails: open `runbook.md §8` (Site is down). Most common cause = container restart loop or full disk.

### Step 2 — Is Whats360 connected?

Open `/ar/admin` and look at the widget at the top. Three states:

- 🟢 **Connected** — done, move on.
- 🔴 **Offline** — go straight to `runbook.md §8.3` (Whats360 device disconnected). Open the QR scanner page on the device phone, rescan within 10 minutes. OTPs and order notifications are ALL blocked while it's down.
- 🟡 **Probe failed** — Whats360 service may be degraded. Check `https://whats360.live/status` (their own status page). If their service is down, message testers via WhatsApp directly to apologize for delayed OTP and tell them to retry in ~30 min.

### Step 3 — Triage feedback that came in overnight

Open `/ar/admin/feedback?status=NEW`.

For each new item:
- **BUG** → if reproducible same-day, fix it (open new branch + PR via `/project-executor`); mark `REVIEWING` once you start, `ACTIONED` once shipped.
- **UX** → log it; bundle multiple UX reports into a single batch fix later this week.
- **FEATURE_REQUEST** → reply briefly via WhatsApp + `DISMISSED` (with note "v1.1") OR `ACTIONED` if it's a 5-min addition.
- **PRAISE** → forward the relevant snippets to your friend / co-founder / whoever needs the encouragement; mark `ACTIONED`.

If the submitter left a `contactValue`, reply on WhatsApp within the same morning sweep. **Don't let testers feel ignored** — that's how friendly betas die.

### Step 4 — Order health

Open `/ar/admin/orders`.

- Any orders in `PENDING` payment status >1h old? They're stuck Paymob orders waiting for webhook resolution. The reconciliation cron (`paymob-reconciliation`, hourly) handles these. If still stuck after 2h, manually mark `FAILED` from the order detail page.
- Any orders `CONFIRMED` >48h without `HANDED_TO_COURIER`? Either you forgot to hand them over, or they're a B2B `PENDING_CONFIRMATION` that needs a sales-rep call.
- Any `CANCELLATION_REQUESTED`? Make a decision today (approve = release stock + refund if needed; reject = keep order as-is + tell customer why).

### Step 5 — GlitchTip pulse check

Open `https://glitchtip.printbyfalcon.com`. Look at the last 12 hours.

- Spike (>10 events / 5min in any group)? Open the event group → see if it's a known transient (network blip, bot scan) or a real bug. If real, file a feedback row yourself with category `BUG` so it shows up in the next day's triage.
- New error groups since yesterday? Click each one — if it's app-side (not bot or scanner traffic), fix today.
- All quiet? Move on.

---

## 2. Afternoon sweep (~16:00 Cairo)

Lighter version of the morning:

1. **WhatsApp messages from testers** → reply to anything that came in.
2. **`/ar/admin/feedback?status=NEW`** — re-triage anything that landed since morning.
3. **GlitchTip** — same pulse check; resolve any new groups.
4. **If you shipped a fix today**: deploy via GitHub Actions `deploy-production` workflow. The runbook §6 covers the rollback path if something breaks.

---

## 3. Evening sweep (~21:00 Cairo)

This one's about closure for the day:

1. Final feedback sweep + WhatsApp reply pass.
2. **Mark anything actioned today** as `ACTIONED` in `/ar/admin/feedback` so tomorrow's triage starts clean.
3. **B2B "Pending Confirmation" queue** (`/ar/admin/b2b/pending-confirmation`) — anything older than 18h flips to red on the dashboard. Sales rep follow-up before tomorrow morning.
4. Note any tester pattern in your tracking sheet: "Tester X reports issue Y — same as yesterday." Two reports of the same friction = priority for tomorrow's batch fix.

---

## 4. Weekly review (every Thursday, end of day)

A short retro at the end of the work week:

- **Counts:** new feedback, completed feedback, orders placed, orders delivered, error rate (use GlitchTip's weekly view).
- **Theme spotting:** what's coming up repeatedly? Three reports of "checkout slow" = a real perf issue worth a Lighthouse run.
- **Catalog gaps:** any tester ask "do you have X printer?" or "do you have OEM for brand Y?" — log it; data team (you) addresses it for next week.
- **Update [docs/progress.md](progress.md)** — append a one-paragraph note on the week's findings.

---

## 5. Escalation paths

If any of these happen, stop the daily routine and escalate immediately:

| Event | Action |
|---|---|
| Site is fully down (`api/health` fails for >5 min) | Follow `runbook.md §8` — Cloudflare grey-cloud is the fastest emergency revert. |
| GlitchTip shows >50 errors in 5 min on a fresh deploy | Roll back via `runbook.md §6.1` — fast rollback is faster than diagnosing under pressure. |
| Real customer payment fails (when Paymob is enabled) | Manually contact the customer via WhatsApp + offer COD as recovery. Then debug. |
| A tester reports their data was visible to someone else (RBAC bug) | Treat as a P0 — fix immediately, audit-log the affected sessions, tell the tester directly. |
| Whats360 stays disconnected >2h | Failover to Meta Cloud API per ADR-033 (~3-5 days). Email-only notifications for B2B in the meantime. |
| Disk usage on VPS >90% | Triage what's eating the disk (`docker system df`, `du -sh /var/pbf/storage`). Most likely culprit during M1 = product image uploads. |
| Backups stop running (no `pbf-prod-*.sql.gz` for >24h) | Re-run the cron manually + confirm the host disk has space. Backups not running = silent disaster waiting. |

---

## 6. Pre-flight before each production deploy during the beta

Don't deploy mid-day if you can avoid it. Pick a window when no tester is mid-checkout (early morning is safest). For each deploy:

1. **Run the M1 readiness check on staging:**
   ```bash
   bash scripts/m1-check.sh https://staging.printbyfalcon.com
   ```
2. Deploy to staging first via merge to `main`.
3. Smoke-test on staging (`runbook.md §5` — at least: storefront loads, sign-in works, place a test order, admin renders).
4. Deploy to production via `Deploy to Production` GitHub Actions workflow.
5. Watch GlitchTip for 15 minutes after the deploy. Errors > baseline = consider rollback.

---

## 7. End of M1 (Sprint 12 D10) — final stability sweep

The last 48 hours before you tag `v1.0.0-mvp`:

- Error rate must be <1% of all requests (read GlitchTip + Cloudflare analytics).
- No `BUG`-category feedback older than 48h still in `NEW` or `REVIEWING`.
- No order stuck in `PENDING` for >2h.
- Backup ran in the last 24h (`/var/pbf/backups/`).
- Whats360 has been continuously connected for the full 48h (Whats360 dashboard).

If all green → tag the release + announce M1 reached. If not → extend the beta by 2-3 days, fix the gaps, repeat.
