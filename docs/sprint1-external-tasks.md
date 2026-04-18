# Sprint 1 — External / DevOps Runbook

Step-by-step instructions for tasks I (Claude) can't do from inside the codebase — you need a human to click buttons, enter credit cards, SSH into VPSes, and submit paperwork. Work through this in order. Estimated total owner-side effort: **10–14 hours spread across Sprint 1**.

Every section ends with a **"Done when"** checklist. Mark each in [`docs/progress.md`](progress.md) when complete.

> **Sprint 1 real-world dates (Sun–Thu work week):** Sun 2026-04-19 → Thu 2026-04-30.

---

## 1. VPS hardening + SSH access (Day 1 — Sun 2026-04-19) — **critical path**

You confirmed the Hostinger KVM2 is provisioned but SSH isn't set up yet. Do this first — every later step assumes SSH.

### 1.1 Get the VPS's root password

1. Log into [`hpanel.hostinger.com`](https://hpanel.hostinger.com).
2. Sidebar → **VPS** → your KVM2 instance → **SSH Access** tab.
3. Copy the **IP address** and **root password** (Hostinger auto-generated one).

### 1.2 First SSH login (from your laptop)

Open PowerShell (Windows):

```powershell
ssh root@YOUR.VPS.IP.ADDRESS
# first time — accept the fingerprint (yes)
# paste the root password (it won't echo)
```

### 1.3 Create a deploy user (don't operate as root day-to-day)

```bash
adduser deploy                      # you'll be prompted for a password
usermod -aG sudo deploy             # grant sudo
mkdir -p /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
touch /home/deploy/.ssh/authorized_keys
chmod 600 /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
```

### 1.4 Generate an SSH keypair on your laptop and install the public key

On your laptop (PowerShell):

```powershell
ssh-keygen -t ed25519 -C "pbf-deploy-laptop" -f $HOME\.ssh\pbf_deploy
# press enter to accept defaults; set a passphrase (recommended)
type $HOME\.ssh\pbf_deploy.pub
# copy the output line
```

Back on the VPS (still as root):

```bash
echo "PASTE-THE-PUBLIC-KEY-LINE-HERE" >> /home/deploy/.ssh/authorized_keys
```

Test from your laptop:

```powershell
ssh -i $HOME\.ssh\pbf_deploy deploy@YOUR.VPS.IP
# should log in without asking for a password (passphrase yes, password no)
```

### 1.5 Lock down SSH

> **Ubuntu 24.04 note:** the base `/etc/ssh/sshd_config` has `Include /etc/ssh/sshd_config.d/*.conf` at the top. Hostinger's cloud-init ships a file there (`50-cloud-init.conf`) that sets `PasswordAuthentication yes` — **it overrides anything you set in the base config**. You need to edit BOTH.

Still as root:

```bash
apt update && apt upgrade -y
# edit the cloud-init drop-in first (it overrides the base)
nano /etc/ssh/sshd_config.d/50-cloud-init.conf
```

Change `PasswordAuthentication yes` → `PasswordAuthentication no`.

Then the base file for good measure:

```bash
nano /etc/ssh/sshd_config
```

Set / change these lines (uncomment if needed):

```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Save each (`Ctrl-O`, `Enter`, `Ctrl-X`). Restart SSH — note Ubuntu's service is called `ssh`, not `sshd`:

```bash
systemctl restart ssh
# verify the effective config
sudo sshd -T | grep -E 'permitrootlogin|passwordauthentication|pubkeyauthentication'
# expect: permitrootlogin no / pubkeyauthentication yes / passwordauthentication no
```

**Before you log out**, open a SECOND terminal and verify you can still log in as `deploy` with the key — otherwise you're locked out.

### 1.6 Install Docker + Docker Compose + firewall

As `deploy` (with `sudo`). The URL is `linux/ubuntu`, **not** `linux/debian` — Docker serves them separately and the Ubuntu codenames (`noble` = 24.04) don't exist on the Debian side.

```bash
sudo apt install -y ca-certificates curl gnupg ufw
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo \"$VERSION_CODENAME\") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker deploy
# log out and back in so the group applies
exit
```

After reconnecting, verify Docker works without sudo:

```bash
docker run hello-world
docker compose version
```

Firewall — allow only 22/80/443:

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

### 1.7 Install Nginx + Certbot on the **host** (not in a container)

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo systemctl enable --now nginx
```

### 1.8 Prepare directories

```bash
sudo mkdir -p /var/pbf/repo /var/pbf/backups /var/pbf/storage /var/pbf/staging/storage /var/log/pbf
sudo chown -R deploy:deploy /var/pbf /var/log/pbf
```

### 1.9 Clone the repo onto the VPS

Option A (private repo, SSH key on GitHub):

```bash
cd /var/pbf
rm -rf repo && git clone git@github.com:YOUR-ORG/print-by-falcon.git repo
```

Option B (HTTPS + personal access token).

### **Done when**
- [ ] `ssh -i ~/.ssh/pbf_deploy deploy@VPS` works from your laptop
- [ ] Root password login disabled, key-only enforced
- [ ] `sudo ufw status verbose` shows only 22/80/443 open
- [ ] `docker run hello-world` runs as `deploy` without sudo
- [ ] `/var/pbf/repo` is a fresh clone of the project
- [ ] `nginx -v` and `certbot --version` both print versions

---

## 2. DNS + SSL (Day 1–2) — **critical path**

### 2.1 Point DNS records at the VPS

In Hostinger hPanel → **Domains** → `printbyfalcon.com` → **DNS / Nameservers** → **DNS records**. Create/update:

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `YOUR.VPS.IP` | 3600 |
| A | `www` | `YOUR.VPS.IP` | 3600 |
| A | `staging` | `YOUR.VPS.IP` | 3600 |
| A | `errors` | `YOUR.VPS.IP` | 3600 |

DNS propagates in 5–60 minutes. Verify with:

```bash
dig +short printbyfalcon.com @1.1.1.1
dig +short staging.printbyfalcon.com @1.1.1.1
```

### 2.2 Place Nginx site configs on the VPS

Only the **prod** and **staging** configs go in now. `errors.printbyfalcon.com.conf` references an SSL cert that doesn't exist yet, and is deployed in §7 after GlitchTip + its cert are up.

You need four committed files in this order (filenames are prefixed `00-` and `01-` so nginx loads infra-config before site configs):

| File | Purpose |
|---|---|
| `00-rate-limits.conf` | declares the `auth_limit` zone the site configs reference |
| `01-cloudflare-real-ip.conf` | restores real client IP from `CF-Connecting-IP` (per ADR-024) |
| `printbyfalcon.com.conf` | prod site |
| `staging.printbyfalcon.com.conf` | staging site |

From your laptop, copy the four files onto the VPS:

```bash
scp docker/nginx/00-rate-limits.conf               deploy@VPS:/tmp/
scp docker/nginx/01-cloudflare-real-ip.conf        deploy@VPS:/tmp/
scp docker/nginx/printbyfalcon.com.conf            deploy@VPS:/tmp/
scp docker/nginx/staging.printbyfalcon.com.conf    deploy@VPS:/tmp/
```

On the VPS — first disable Ubuntu's default site (it ships a catch-all that collides on :443), then drop the new configs in:

```bash
# remove the default site that ships with the Ubuntu nginx package
sudo rm -f /etc/nginx/sites-enabled/default

# move the four configs into place (numeric prefixes ensure load order)
sudo mv /tmp/00-rate-limits.conf            /etc/nginx/conf.d/
sudo mv /tmp/01-cloudflare-real-ip.conf     /etc/nginx/conf.d/
sudo mv /tmp/printbyfalcon.com.conf         /etc/nginx/conf.d/
sudo mv /tmp/staging.printbyfalcon.com.conf /etc/nginx/conf.d/

sudo nginx -t
sudo systemctl reload nginx
```

If you already copied the `errors.*` config and hit "cannot load certificate" from nginx, pull it back out:

```bash
sudo mv /etc/nginx/conf.d/errors.printbyfalcon.com.conf /tmp/errors.printbyfalcon.com.conf.parked
sudo nginx -t && sudo systemctl reload nginx
```

You'll put it back in §7 once the GlitchTip cert exists.

### 2.3 Issue Let's Encrypt certificates

> **Chicken-and-egg note:** our full nginx configs have HTTPS `server` blocks that reference Let's Encrypt cert paths. If those certs don't exist yet, `nginx -t` fails and nginx won't reload — which also blocks `certbot --nginx` from working. The bootstrap dance below solves that by issuing certs with `--webroot` behind a minimal HTTP-only config, then putting the full configs back. You only do this once per VPS.

```bash
# 1. pull the full configs aside
sudo mv /etc/nginx/conf.d/printbyfalcon.com.conf         /tmp/
sudo mv /etc/nginx/conf.d/staging.printbyfalcon.com.conf /tmp/

# 2. drop in a bootstrap HTTP-only config that serves /.well-known/acme-challenge
sudo mkdir -p /var/www/certbot
sudo tee /etc/nginx/conf.d/bootstrap.conf > /dev/null <<'EOF'
server {
    listen 80;
    listen [::]:80;
    server_name printbyfalcon.com www.printbyfalcon.com staging.printbyfalcon.com errors.printbyfalcon.com;

    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 200 'bootstrap: certs pending';
        add_header Content-Type text/plain;
    }
}
EOF

sudo nginx -t && sudo systemctl reload nginx

# 3. issue the certs via webroot (no nginx plugin dependency)
sudo certbot certonly --webroot -w /var/www/certbot \
  -d printbyfalcon.com -d www.printbyfalcon.com \
  --email support@printbyfalcon.com --agree-tos --no-eff-email

sudo certbot certonly --webroot -w /var/www/certbot \
  -d staging.printbyfalcon.com \
  --email support@printbyfalcon.com --agree-tos --no-eff-email

# (errors.printbyfalcon.com cert is deferred until section 7, after GlitchTip is up)

# 4. certbot-nginx's shared ssl options + dhparam — generate if they don't exist yet
[ -f /etc/letsencrypt/options-ssl-nginx.conf ] || \
  sudo curl -fsSL https://raw.githubusercontent.com/certbot/certbot/main/certbot-nginx/src/certbot_nginx/_internal/tls_configs/options-ssl-nginx.conf \
    -o /etc/letsencrypt/options-ssl-nginx.conf
[ -f /etc/letsencrypt/ssl-dhparams.pem ] || \
  sudo openssl dhparam -out /etc/letsencrypt/ssl-dhparams.pem 2048

# 5. remove the bootstrap and put the full configs back
sudo rm /etc/nginx/conf.d/bootstrap.conf
sudo mv /tmp/printbyfalcon.com.conf         /etc/nginx/conf.d/
sudo mv /tmp/staging.printbyfalcon.com.conf /etc/nginx/conf.d/

sudo nginx -t
sudo systemctl reload nginx

# auto-renewal is already scheduled by the certbot package
sudo systemctl status certbot.timer
```

### **Done when**
- [ ] `dig` resolves all 4 subdomains to the VPS IP
- [ ] Visiting `http://printbyfalcon.com` 301-redirects to HTTPS
- [ ] `https://printbyfalcon.com` serves a valid cert (browser padlock, no warnings)
- [ ] Same for `https://staging.printbyfalcon.com`

---

## 3. WhatsApp Business number + Cloud API (Day 2 — Mon 2026-04-20) — **critical path for Sprint 5**

Target: a **NEW physical phone number distinct from the sales team number** registered with Meta Cloud API. *(Original plan put `+201116527773` here; that number was reassigned to the sales-team manual WhatsApp on 2026-04-19 — a separate Cloud API number must be procured.)*

### 3.1 Create / access a Meta Business Account

1. Go to [`business.facebook.com`](https://business.facebook.com).
2. **Create a Business Account** (if you don't already have one). Name: *Print By Falcon*.
3. Complete business verification: commercial registry, tax card, utility bill, domain ownership. **This can take 1–7 days** — start now.

### 3.2 Add the new number to WhatsApp Cloud API

1. In Meta Business Suite → **WhatsApp Accounts** → **Add WhatsApp Account**.
2. Add the **new** number you procure for the Cloud API (must be different from `+201116527773` which is the sales manual line). If `+201116527773` was already verified with Meta Cloud API earlier in this runbook, **release it first**: WhatsApp Manager → Phone Numbers → Remove `+201116527773` → confirm.
3. **IMPORTANT:** the number must NOT be active on a consumer WhatsApp / WhatsApp Business app. Uninstall it from any phone first.
4. Verify via SMS / voice call OTP sent to the number.
5. Copy the auto-generated **Phone Number ID** and a test **access token** (temporary — valid 24h). You'll replace with a permanent system-user token once verified.

### 3.3 Quick smoke test

```bash
curl -sS "https://graph.facebook.com/v21.0/me?access_token=PASTE-TEMP-TOKEN" | jq .
# expect: { "name": "...", "id": "..." }
```

Put these in `.env.production` on the VPS:

```
WHATSAPP_CLOUD_API_TOKEN=<permanent system-user token>
WHATSAPP_PHONE_NUMBER_ID=<from step 3.2>
WHATSAPP_BUSINESS_ACCOUNT_ID=<from step 3.2>
```

### 3.4 Submit 5 message templates (critical path for Sprint 5 notifications)

In **WhatsApp Manager** → **Message Templates** → **Create Template**. Submit all 5 as **Utility** (OTP as **Authentication**), Arabic:

| Template name | Category | Sample body |
|---|---|---|
| `auth_otp_ar` | Authentication | `رمز الدخول الخاص بك هو {{1}}. صالح لمدة 5 دقائق. لا تشاركه مع أي شخص.` |
| `order_confirmed_ar` | Utility | `تم تأكيد طلبك {{1}} بقيمة {{2}} جنيه. سنتواصل معك عند التحضير.` |
| `order_status_change_ar` | Utility | `حالة طلبك {{1}} الآن: {{2}}. شكرًا لتسوقك مع برينت باي فالكون.` |
| `b2b_pending_review_ar` | Utility | `تم استلام طلبك {{1}}. فريق المبيعات سيتواصل معك خلال {{2}} ساعة.` |
| `payment_failed_ar` | Utility | `لم يتمكن النظام من معالجة الدفع لطلبك {{1}}. الرجاء إعادة المحاولة أو التواصل مع الدعم.` |

Meta approval takes **3–5 business days per template**. If any is rejected, iterate wording and resubmit immediately — they don't bundle resubmissions.

### **Done when**
- [ ] Meta Business Account created + verification *submitted*
- [ ] **New** Cloud API number procured + verified (NOT `+201116527773` — that is the sales manual line)
- [ ] `curl .../me` smoke test passes
- [ ] All 5 templates submitted and in "Pending review" (or approved)

---

## 4. Paymob merchant application (Day 1) — **critical path for Sprint 4 (M0)**

You confirmed your docs are assembled. Submit today.

1. Go to [`accept.paymob.com/portal2/en/PaymobDeveloperPortal`](https://accept.paymob.com/portal2/en/PaymobDeveloperPortal).
2. **Sign up** → choose **Egypt** → **Business account**.
3. Upload:
   - Commercial Registry (recent ≤ 3 months)
   - Tax Card
   - Bank account letter
   - Owner National ID (front + back)
   - Business website URL: `https://printbyfalcon.com` (even if not live yet — **tell their support rep it's M0 pre-launch**)
   - Short business description (use the Arabic version of §1 of the PRD)
4. Email their support (`support@paymob.com`) the application reference ID and request **sandbox credentials immediately** (they grant these before live approval — needed for Sprint 4).
5. Expected turnaround: live merchant approval **1–3 weeks**; sandbox **same day**.

### **Done when**
- [ ] Application submitted; reference ID recorded
- [ ] **Sandbox credentials received** — `PAYMOB_API_KEY`, `PAYMOB_INTEGRATION_ID_CARD`, `PAYMOB_INTEGRATION_ID_FAWRY` (per ADR-025), `PAYMOB_HMAC_SECRET`, `PAYMOB_IFRAME_ID`
- [ ] Sandbox credentials added to `.env.staging` on the VPS (NOT committed to repo)
- [ ] Live credentials are a **separate request** to Paymob — do NOT reuse sandbox keys in production

---

## 5. ~~Fawry merchant application~~ — **removed (ADR-022)**

The MVP no longer integrates Fawry directly. B2C payment options are **Paymob (card) + Cash on Delivery**. See `docs/decisions.md` ADR-022 for the rationale and the future re-introduction path (Paymob Accept's outlet-payment integration in v1.1 if cash-economy demand justifies). Skip to §6.

---

## 6. Cloudflare Free — CDN / DNS / TLS / DDoS / WAF edge (Day 2–3) — ADR-024

Cloudflare Free is now the edge in front of the VPS. This section walks through DNS migration, the configuration baseline locked in ADR-024, the origin lockdown that prevents bypass attacks, and a verification.

### 6.1 Sign up + add the site

1. Open [`dash.cloudflare.com/sign-up`](https://dash.cloudflare.com/sign-up). Create an account with `support@printbyfalcon.com`. Enable 2FA on the account immediately (Settings → Security → enable Two-Factor Authentication, TOTP — use Google Authenticator or 1Password).
2. **Add a Site** → enter `printbyfalcon.com` → choose **Free** plan → Continue.
3. Cloudflare scans your existing DNS records (read from Hostinger DNS). Verify the four A records:

   | Name | Type | Value | Proxy |
   |---|---|---|---|
   | `printbyfalcon.com` | A | `<your VPS IP>` | 🟠 Proxied |
   | `www` | A | `<your VPS IP>` | 🟠 Proxied |
   | `staging` | A | `<your VPS IP>` | 🟠 Proxied |
   | `errors` | A | `<your VPS IP>` | 🟠 Proxied |

   If anything's missing, add it. **All four orange-cloud (proxied).**

4. Cloudflare gives you 2 nameservers, e.g.:
   ```
   tom.ns.cloudflare.com
   sara.ns.cloudflare.com
   ```
   (yours will be different — copy YOUR pair).

### 6.2 Switch nameservers in Hostinger

1. Hostinger hPanel → **Domains** → `printbyfalcon.com` → **Nameservers**.
2. Change from "Hostinger nameservers" → **"Use custom nameservers"**.
3. Paste the two Cloudflare nameservers (one per line). Save.
4. Back in Cloudflare → **"Done, check nameservers"**. Cloudflare polls until the change is visible globally (usually 30 min – 4 h, max 24 h).
5. You'll get an email when active, and the dashboard banner turns green.

### 6.3 SSL/TLS settings

Cloudflare → **SSL/TLS**:

| Section | Setting |
|---|---|
| Overview → Encryption mode | **Full (strict)** — verifies your origin Let's Encrypt cert |
| Edge Certificates → Always Use HTTPS | **On** |
| Edge Certificates → Min TLS Version | **TLS 1.2** |
| Edge Certificates → HSTS | **Enable** · max-age 12 months · include subdomains · preload |
| Edge Certificates → Automatic HTTPS Rewrites | **On** |
| Edge Certificates → TLS 1.3 | **On** |

> Wait until DNS shows "active" before enabling Always Use HTTPS — otherwise existing HTTP requests start 522-erroring during propagation.

### 6.4 Network / Speed

**Network** tab: enable IPv6, gRPC, WebSockets, **HTTP/3 (with QUIC)**, **0-RTT**.

**Speed** → Optimization:
- **Brotli** — On
- **Early Hints** — On
- **Auto Minify** — **OFF for HTML / CSS / JS** (Next.js already minifies; double-minify can corrupt source maps and hashes)
- **Rocket Loader** — Off (breaks Next.js hydration)

### 6.5 Caching — page rules

Cloudflare → **Caching → Cache Rules** (newer, doesn't count against Page Rule limit). Create three rules in this order:

| Order | Rule name | Match | Then |
|---|---|---|---|
| 1 | **API bypass** | Hostname is `printbyfalcon.com` OR `staging.printbyfalcon.com` AND URI Path starts with `/api/` | Cache eligibility: **Bypass cache** |
| 2 | **Next.js static** | Hostname is `printbyfalcon.com` OR `staging.printbyfalcon.com` AND URI Path starts with `/_next/static/` | Cache eligibility: **Eligible for cache** · Edge TTL: **1 month** |
| 3 | **Storage assets** | Hostname is `printbyfalcon.com` OR `staging.printbyfalcon.com` AND URI Path starts with `/storage/` | Cache eligibility: **Eligible for cache** · Edge TTL: **1 year** · Browser TTL: respect origin |

### 6.6 Security baseline

Cloudflare → **Security → Settings**:
- **Bot Fight Mode** = **On** (Free plan basic — fine for MVP)
- **Browser Integrity Check** = **On**
- **Email Address Obfuscation** = **OFF** (interferes with B2B contact forms)
- **Hotlink Protection** = **OFF** (admin uses image URLs during testing)
- **Schema Validation** = **On** (default — protects API endpoints from malformed payloads)
- **Replace insecure JS libraries** = **On**

**WAF Managed Rules:** Pro-only as of 2026 (Cloudflare moved them out of Free). All three DDoS protection layers (SSL/TLS, Network, HTTP) are always-active on Free regardless. Free includes a quota of 5 Custom Rules + 1 Rate Limiting Rule which we reserve for Sprint 11 production-hardening — the nginx `auth_limit` zone + DB-backed rate limiter already cover the immediate need.

### 6.7 Origin lockdown — only Cloudflare can reach the VPS

Critical: Cloudflare protects you only if attackers can't bypass it and hit the origin IP directly. Lock the VPS firewall to accept :80/:443 from Cloudflare's IP ranges only.

On the VPS as `deploy`:

```bash
# 1. fetch Cloudflare's published IP ranges
curl -fsSL https://www.cloudflare.com/ips-v4 | sudo tee /etc/cloudflare/ips-v4 > /dev/null
sudo mkdir -p /etc/cloudflare
curl -fsSL https://www.cloudflare.com/ips-v4 | sudo tee /etc/cloudflare/ips-v4 > /dev/null
curl -fsSL https://www.cloudflare.com/ips-v6 | sudo tee /etc/cloudflare/ips-v6 > /dev/null

# 2. install a tiny script that rebuilds the firewall rules each week
sudo tee /usr/local/bin/refresh-cloudflare-ufw.sh > /dev/null <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
sudo mkdir -p /etc/cloudflare
curl -fsSL https://www.cloudflare.com/ips-v4 -o /etc/cloudflare/ips-v4
curl -fsSL https://www.cloudflare.com/ips-v6 -o /etc/cloudflare/ips-v6

# remove old "Cloudflare" rules
sudo ufw status numbered | awk -F'[][]' '/Cloudflare/ {print $2}' | sort -nr | while read n; do yes | sudo ufw delete "$n"; done

# allow 80/443 from each Cloudflare CIDR
for ip in $(cat /etc/cloudflare/ips-v4) $(cat /etc/cloudflare/ips-v6); do
  sudo ufw allow proto tcp from "$ip" to any port 80  comment 'Cloudflare'
  sudo ufw allow proto tcp from "$ip" to any port 443 comment 'Cloudflare'
done

# remove the broad "any" rules added in §1.6 — Cloudflare-only now
sudo ufw delete allow 80/tcp 2>/dev/null || true
sudo ufw delete allow 443/tcp 2>/dev/null || true

sudo ufw reload
EOF
sudo chmod +x /usr/local/bin/refresh-cloudflare-ufw.sh

# 3. run it once
sudo /usr/local/bin/refresh-cloudflare-ufw.sh

# 4. weekly cron — Cloudflare publishes new ranges occasionally
echo "0 4 * * 1 root /usr/local/bin/refresh-cloudflare-ufw.sh >> /var/log/pbf/cf-ufw.log 2>&1" \
  | sudo tee /etc/cron.d/cloudflare-ufw

sudo ufw status verbose | head -40
```

> **Smoke-test BEFORE removing the broad rules**: from your laptop, `curl https://printbyfalcon.com` should still work (because Cloudflare proxies the request). If it doesn't, restore `sudo ufw allow 80/tcp` and `443/tcp` and investigate before locking down.

### 6.8 Verify everything end-to-end

```bash
# from your laptop
curl -I https://printbyfalcon.com

# expect headers including:
#   server: cloudflare
#   cf-cache-status: DYNAMIC | HIT | MISS | BYPASS
#   cf-ray: <hash>-CAI    (CAI = Cairo PoP — confirms you're hitting the Egypt edge)
```

If `cf-cache-status: BYPASS` on `/api/...` and `HIT` (after second request) on `/storage/...` → cache rules working.

### 6.9 Real client IP at the origin

Two-part change so our app sees the real client IP instead of Cloudflare's proxy IP. **The committed Nginx site configs already include the `set_real_ip_from` + `real_ip_header` directives** (see [`docker/nginx/printbyfalcon.com.conf`](../docker/nginx/printbyfalcon.com.conf) — re-scp + reload nginx if you set it up before this change). The application code already prefers `cf-connecting-ip` ([`lib/request-ip.ts`](../lib/request-ip.ts), used by [`app/actions/auth.ts`](../app/actions/auth.ts)).

After re-scp:

```bash
sudo nginx -t && sudo systemctl reload nginx
# tail an auth request and confirm $remote_addr in access.log is the real client IP, not 172.x.x.x (Cloudflare)
```

### **Done when**
- [ ] Cloudflare account created with 2FA enabled
- [ ] DNS migrated to Cloudflare nameservers; banner "Active" in dashboard
- [ ] All 4 subdomains orange-clouded
- [ ] SSL mode = Full (strict); HSTS preload enabled
- [ ] HTTP/3, Brotli, Early Hints on
- [ ] 3 Cache Rules in place (API bypass, Next.js static, storage assets)
- [ ] WAF Managed Rules + Bot Fight Mode on
- [ ] `ufw status verbose` shows :80/:443 only allowed from Cloudflare ranges
- [ ] `curl -I https://printbyfalcon.com` returns `cf-ray: ...-CAI` (or other Egypt PoP)
- [ ] Nginx access log shows real client IP after `real_ip` directives loaded

### **Fallback** (if Cloudflare causes problems mid-launch)

Cloudflare → **DNS** → click the orange cloud on each record → grey-cloud (DNS-only). Cloudflare keeps serving DNS but stops proxying — site goes back to direct origin in ~5 min (no propagation). If you need to leave Cloudflare entirely, change nameservers back to Hostinger's in hPanel (24h propagation).

---

## 7. GlitchTip error tracking (Day 4)

After the prod stack is up (section 10), finish this:

```bash
ssh deploy@VPS
cd /var/pbf/repo
# add GlitchTip secrets to .env.production first:
# GLITCHTIP_SECRET_KEY=<openssl rand -base64 64>
# GLITCHTIP_DATABASE_URL=postgres://pbf_prod:PASSWORD@postgres:5432/glitchtip
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d glitchtip
```

Create the GlitchTip database once (inside the prod postgres container):

```bash
docker exec -it pbf-prod-postgres-1 psql -U pbf_prod -c "CREATE DATABASE glitchtip;"
```

Issue the SSL cert for errors subdomain:

```bash
sudo certbot --nginx -d errors.printbyfalcon.com --email support@printbyfalcon.com --agree-tos --no-eff-email
```

Set basic-auth for the subdomain:

```bash
sudo apt install -y apache2-utils
sudo htpasswd -c /etc/nginx/.htpasswd_errors admin
sudo systemctl reload nginx
```

Visit `https://errors.printbyfalcon.com` → log in with basic auth → create a GlitchTip user + project "pbf-web" → copy the DSN into `.env.production` as `SENTRY_DSN=...` → `docker compose restart app worker`.

### **Done when**
- [ ] `https://errors.printbyfalcon.com` reachable (behind basic auth)
- [ ] Test error from app surfaces in GlitchTip UI

---

## 8. UptimeRobot (Day 5)

1. Sign up free at [`uptimerobot.com`](https://uptimerobot.com) (50 monitors, 5-min intervals).
2. **Add New Monitor** → **HTTP(s)**.
3. URL: `https://printbyfalcon.com/api/health`
4. Interval: 5 minutes.
5. Add a second monitor for `https://staging.printbyfalcon.com/api/health`.
6. Alert contact: `support@printbyfalcon.com` (and optionally your personal phone as SMS).

### **Done when**
- [ ] Two monitors green
- [ ] Test notification email received

---

## 9. Netdata server metrics (Day 5)

```bash
ssh deploy@VPS
bash <(curl -Ss https://my-netdata.io/kickstart.sh) --dont-wait --stable-channel
# default listens on port 19999 — DO NOT expose publicly; we bind it to localhost
sudo nano /etc/netdata/netdata.conf
# [web]
#   bind to = 127.0.0.1
sudo systemctl restart netdata
```

Access via SSH tunnel from your laptop:

```powershell
ssh -L 19999:localhost:19999 deploy@VPS
# open http://localhost:19999 in your browser
```

Set an RAM-usage alarm at 90% (matches architecture §10):

```bash
sudo nano /etc/netdata/health.d/custom.conf
```

```
 alarm: ram_usage
    on: system.ram
lookup: average -1m
 units: %
 every: 1m
  warn: $this > 85
  crit: $this > 90
   to: support@printbyfalcon.com
```

```bash
sudo systemctl restart netdata
```

### **Done when**
- [ ] Netdata dashboard reachable via SSH tunnel
- [ ] RAM alarm configured
- [ ] Netdata bound to localhost (firewall confirms port 19999 not publicly open)

---

## 10. Nightly backups (Day 6)

The `scripts/backup.sh` is already in the repo. Wire up cron:

```bash
ssh deploy@VPS
chmod +x /var/pbf/repo/scripts/backup.sh /var/pbf/repo/scripts/restore.sh
sudo crontab -u deploy -e
# add this line:
0 3 * * * /var/pbf/repo/scripts/backup.sh >> /var/log/pbf/backup.log 2>&1
```

### Restore drill (Sprint 1 D6-T2)

Critical — an untested backup is a hope, not a backup.

```bash
# 1. wait for the first scheduled dump at 3am, or trigger manually:
/var/pbf/repo/scripts/backup.sh

# 2. create a throwaway Postgres DB in the prod container
docker exec -it pbf-prod-postgres-1 psql -U pbf_prod -c "CREATE DATABASE pbf_restore_drill;"

# 3. restore into it
gunzip -c /var/pbf/backups/pbf-prod-<LATEST>.sql.gz \
  | docker exec -i pbf-prod-postgres-1 psql -U pbf_prod -d pbf_restore_drill

# 4. sanity check row counts
docker exec -it pbf-prod-postgres-1 psql -U pbf_prod -d pbf_restore_drill \
  -c "SELECT schemaname, relname, n_live_tup FROM pg_stat_user_tables ORDER BY n_live_tup DESC LIMIT 20;"

# 5. drop the drill DB
docker exec -it pbf-prod-postgres-1 psql -U pbf_prod -c "DROP DATABASE pbf_restore_drill;"
```

### **Done when**
- [ ] Cron line installed for `deploy`
- [ ] One backup file in `/var/pbf/backups/`
- [ ] Restore drill succeeded — User table row count matches prod

---

## 11. Bring the stacks up on the VPS (Day 7)

```bash
ssh deploy@VPS
cd /var/pbf/repo

# 1. copy the committed example to a real env file, then edit with real secrets
cp .env.production.example .env.production
cp .env.staging.example    .env.staging
nano .env.production   # fill AUTH_SECRET, DB password, SMTP pass, WhatsApp token when available
nano .env.staging

# 2. build + start staging first (it's the canary)
docker compose -f docker/docker-compose.staging.yml --env-file .env.staging up -d --build

# 3. check health
curl -sS http://127.0.0.1:3001/api/health | jq
# visit https://staging.printbyfalcon.com

# 4. if staging looks good, start prod
docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d --build

# 5. check prod
curl -sS http://127.0.0.1:3000/api/health | jq
# visit https://printbyfalcon.com
```

### **Done when**
- [ ] Both stacks healthy (`docker compose ps` shows all containers Up + healthy)
- [ ] `https://staging.printbyfalcon.com` and `https://printbyfalcon.com` serve the "Hello" page in both `/ar` and `/en`
- [ ] `https://printbyfalcon.com/ar/login` renders; admin login works with seeded Owner and force-reset flow appears

---

## 12. CI/CD secrets (Day 8)

In GitHub → repository Settings → **Secrets and variables** → **Actions** → **New repository secret**. Add:

| Name | Value |
|---|---|
| `VPS_HOST` | Your VPS IP |
| `VPS_USER` | `deploy` |
| `VPS_PORT` | `22` |
| `VPS_SSH_KEY` | Contents of the **private** deploy key (`cat ~/.ssh/pbf_deploy`) |

Create a GitHub **Environment** called `staging` → attach these secrets to it → add a required reviewer if you want manual approval on deploys.

### **Done when**
- [ ] Push a trivial commit to `main` → **Deploy to Staging** workflow triggers → staging rebuilds and restarts → `https://staging.printbyfalcon.com` serves the new commit

---

## 13. Final housekeeping (Day 8–9)

- [ ] Rotate the `OWNER_TEMP_PASSWORD` in `.env.production` to a fresh strong value BEFORE the first login (current value was shared in AI chat → treat as compromised). Then log in as Owner and change it via the UI — `mustChangePassword` enforces this.
- [ ] Confirm the sales team's existing WhatsApp number for the support bridge (PRD Open Question #2). Record it in `docs/progress.md` under *Blockers / Open Questions*.
- [ ] Confirm or replace the Arabic store name (PRD Open Question #9). If keeping the transliteration `برينت باي فالكون`, just tick the checkbox — otherwise update `messages/ar.json` → `brand.name`.

---

## Quick-reference: external lead times

| Item | Lead time | Start by |
|---|---|---|
| Meta Business verification | 1–7 days | Day 1 |
| WhatsApp template approval (each) | 3–5 business days | Day 2 |
| Paymob live merchant | 1–3 weeks | Day 1 |
| Paymob sandbox | same day | Day 1 |
| Let's Encrypt SSL | minutes | Day 1–2 |
| DNS propagation | 5–60 min | Day 1 |

If any of these slips past the critical-path dates, flag it in `docs/progress.md` → *Blockers* immediately and I'll re-plan the affected sprint.
