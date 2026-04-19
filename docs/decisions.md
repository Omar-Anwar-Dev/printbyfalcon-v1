# Print By Falcon — Decisions Log (ADRs)

Append-only log of non-trivial product and technical decisions, with rationale and alternatives considered. Lightweight ADR format.

---

## ADR-001: Staged MVP scope (defer CRM, full reporting, Bosta, ETA)
Date: 2026-04-18
Status: Accepted

**Context:** User initially asked for 5 fully-implemented systems on day 1 of production: B2C storefront, B2B portal, CRM, full inventory & operations, and reporting. With 3 devs and a 6-month hard deadline, building all 5 to production polish is realistically 18+ dev-months — risk of shipping 5 mediocre systems instead of 1–2 excellent ones.

**Decision:** Stage the build. MVP (M1) ships only the customer-facing revenue engine plus minimum viable operations:
- B2C storefront, B2B portal, basic inventory, basic invoicing, basic dashboard.

v1.1 adds: full CRM, deeper B2B (RFQ, contracts, multi-user roles), advanced inventory (multi-warehouse, POs, suppliers), proper reporting, Bosta API tracking integration, ETA e-invoice submission, marketing tools.

v2 adds: Arab market expansion (Gulf/Levant), auto-replenishment forecasting.

**Alternatives considered:**
- Build all 5 fully in 6 months — rejected, unrealistic given team size and timeline.
- Cut B2B from MVP, B2C only — rejected, B2B is the highest-revenue segment.

**Consequences:** Five of the user's selected success metrics are still achievable from MVP scope. Risk: if v1.1 doesn't follow within ~4 months of MVP, internal ops bottlenecks (manual CRM, manual reporting) may erode the customer-facing speed gains.

---

## ADR-002: Egypt-only for v1; Arab expansion deferred to v2
Date: 2026-04-18
Status: Accepted

**Context:** Initial vision named "Egyptian and Arab markets" as the target. Current sales are Egypt-only.

**Decision:** Launch v1 in Egypt only — Arabic + English UI, EGP currency, Egyptian payment gateways (Paymob, Fawry), Egyptian shipping operations. Gulf/Levant expansion deferred to v2.

**Alternatives considered:** Multi-country at launch — rejected, adds major complexity (multi-currency, country-specific tax/VAT, regional gateways and couriers). Likely cause of missed launch.

**Consequences:** Cleaner data model and operational scope. v2 expansion will require multi-currency support, country-specific tax rules, and integration with regional gateways/couriers.

---

## ADR-003: ETA e-invoice integration deferred to v1.1; PDF invoices only in MVP
Date: 2026-04-18
Status: Accepted with risk acknowledged

**Context:** Egypt's tax authority (ETA) mandates real-time electronic invoice submission for B2B transactions. ETA-compliant invoices are required for B2B customers to deduct input VAT.

**Decision:** MVP generates auto-generated PDF invoices only; no ETA submission. ETA integration scheduled for v1.1.

**Alternatives considered:** Build ETA integration in MVP — declined by user to reduce scope.

**Consequences (RISK):** B2B customers requiring ETA-compliant invoices for VAT deduction may push back post-launch. If this happens, prioritize ETA integration early in v1.1.

---

## ADR-004: Manual shipping with local couriers; Bosta API deferred to v1.1
Date: 2026-04-18
Status: Accepted

**Context:** User uses local Egyptian couriers, most of which do not provide tracking URLs or APIs.

**Decision:** Manual shipping model in MVP — admin tracks orders through pipeline (Confirmed → Handed to Courier → Out for Delivery → Delivered) with manual status updates. Customer sees status timeline + courier name + courier phone (no tracking URL). Bosta API integration available as optional premium tier in v1.1.

**Alternatives considered:** Force Bosta as primary courier from day 1 — rejected, user has existing local courier relationships.

**Consequences:** Customer experience for tracking is weaker than competitors with API tracking. Mitigated by proactive WhatsApp + email status notifications. Ops team must update status promptly to maintain trust.

---

## ADR-005: Split authentication — WhatsApp OTP for B2C, email + password for B2B
Date: 2026-04-18
Status: Accepted

**Context:** Egyptian users prefer phone-based authentication (WhatsApp specifically over SMS). B2B users prefer traditional email + password (corporate norms, easier recovery, no phone dependency).

**Decision:**
- **B2C:** phone number + WhatsApp OTP (via Meta Cloud API). Persistent 30-day session on trusted devices; new device requires fresh OTP.
- **B2B:** email + password (bcrypt/argon2). Standard email-based password reset.

**Alternatives considered:** Single auth method for both — rejected; B2B recovery via lost-phone scenarios too risky for shared company logins. Phone-only also creates IT-policy friction in some Egyptian SMBs.

**Consequences:** Two auth flows in the codebase. Slightly more complexity, better fit for each segment.

---

## ADR-006: B2B sales-rep-mediated checkout + optional payment gateway
Date: 2026-04-18
Status: Accepted

**Context:** B2B payment terms in Egyptian SMB market are typically negotiated case-by-case by sales reps (PO, credit terms, contract specifics).

**Decision:** B2B checkout offers two paths (admin-configurable per company):
- **"Submit Order for Review"** — order lands in admin queue; sales rep contacts customer to finalize payment + delivery terms out-of-band.
- **"Pay Now"** — Paymob (card) / COD at B2B pricing. *(Originally listed Fawry as a third "Pay Now" method; superseded by ADR-022.)*

Default for new B2B accounts: both options visible.

**Alternatives considered:**
- Force online payment for all B2B — rejected, doesn't match how Egyptian B2B operates.
- Force sales-rep mediation for all B2B — rejected, friction for small/transactional B2B customers.

**Consequences:** Simpler B2B checkout (no required PO upload, no required credit-terms enforcement at checkout). Sales-rep workflow becomes part of MVP critical path (Pending Confirmation queue in admin).

---

## ADR-007: B2B uses single shared login per company in MVP; multi-user with roles in v1.1
Date: 2026-04-18
Status: Accepted

**Context:** B2B customers often have multiple buyers per company. Full multi-user with role/permission systems is complex (~2–3 dev-weeks).

**Decision:** One login per company in MVP. At checkout, mandatory free-text **"Placed by (name)"** field — appears on invoice and every order history row, providing audit trail without role/permission infrastructure. Multi-user with buyer/approver roles ships in v1.1 alongside CRM.

**Alternatives considered:** Multi-user from MVP — rejected, complexity outweighs MVP value.

**Consequences:** Companies share credentials internally; "Placed by" string is the only attribution. Acceptable for SMB B2B; may push some larger customers to wait for v1.1.

---

## ADR-008: Single Next.js full-stack codebase (vs separate frontend + backend)
Date: 2026-04-18
Status: Accepted

**Context:** 3 devs, 6-month hard deadline, team skilled in React + Node.js + TypeScript. Need SSR for SEO (Egyptian Google search drives B2C traffic). Mobile-first responsive web required, no native mobile app.

**Decision:** Single Next.js 15+ application (App Router, TypeScript) covering:
- Public storefront (SSR for SEO)
- B2B portal (mostly SSR with client-side cart/bulk-order tool)
- Admin panel under `/admin/*` (client-rendered, no SSR needed)
- API routes / Server Actions for backend logic
- Background workers (separate Node process, same codebase) for jobs

**Alternatives considered:**
- NestJS backend + separate React frontend — rejected, doubles deployment surface and dev hours for marginal architectural cleanliness gain at this scale.
- Remix — rejected, smaller ecosystem; Next.js is more familiar.

**Consequences:** Faster iteration, lower DevOps overhead, consolidated team focus. If scale grows beyond ~10k orders/day in v2+, may extract backend into separate service.

---

## ADR-009: PostgreSQL 16 + Prisma ORM
Date: 2026-04-18
Status: Accepted

**Context:** Need primary datastore. Core entities (users, companies, orders, products, inventory) are highly relational. Catalog size 500–2,000 SKUs allows Postgres full-text search to handle product search without a separate engine.

**Decision:** PostgreSQL 16, self-hosted on the same VPS. Prisma as ORM (TypeScript-first, mature, excellent DX with Next.js).

**Alternatives considered:**
- MySQL — viable; Postgres has stronger JSON support and built-in full-text search.
- MongoDB — rejected, would reinvent joins for our relational data.
- Drizzle ORM — viable lighter alternative; Prisma chosen for ecosystem maturity.

**Consequences:** Single-VPS deployment requires careful resource tuning (Postgres + Node + Nginx all on 8 GB RAM). Migration path to managed Postgres exists if needed in v2+.

---

## ADR-010: pg-boss for background jobs (drop Redis)
Date: 2026-04-18
Status: Accepted

**Context:** Background jobs needed for: low-stock email digests, abandoned cart cleanup, OTP/cart cleanup, scheduled tasks. Initially proposed Redis + BullMQ. User preference for minimal complexity, expected traffic 100–500 daily visitors.

**Decision:** pg-boss (Postgres-backed queue) instead of Redis + BullMQ. Sessions stored in DB (Postgres) instead of Redis.

**Alternatives considered:**
- Redis + BullMQ — rejected for MVP; faster but adds another service to manage; unnecessary at expected scale.
- node-cron / setInterval — rejected; not durable across restarts.

**Consequences:** One fewer service to deploy/monitor. Slight performance overhead vs. Redis (negligible at expected scale). Easy migration to Redis in v1.1 if scale grows.

---

## ADR-011: File storage on VPS disk + Hostinger CDN (object storage deferred)
Date: 2026-04-18
Status: Accepted

**Context:** Product images and invoice PDFs need persistent storage. Initially proposed Backblaze B2 object storage. Expected file volume: ~2 GB images (2k SKUs × 5 × 200KB) + ~50 MB/year invoices. KVM2 VPS has 100 GB NVMe.

**Decision:** Store files on the VPS filesystem (`/storage/...`), serve via Nginx with Hostinger CDN for caching. Migration to Backblaze B2 (or similar) in v1.1 if storage approaches ~30 GB.

**Alternatives considered:**
- Backblaze B2 from MVP — rejected, adds vendor and complexity for a problem that doesn't exist at MVP scale.
- Cloudflare R2 — rejected, user excluded Cloudflare.

**Consequences:** Storage coupled to VPS lifecycle; backed up via Hostinger snapshots. If VPS fails catastrophically, files restored from snapshot (with whatever data loss exists between snapshots). Acceptable risk at MVP scale.

---

## ADR-012: Nginx + Certbot (vs Caddy) for reverse proxy + SSL
Date: 2026-04-18
Status: Accepted

**Context:** Need reverse proxy with HTTPS for the Next.js app and admin panel.

**Decision:** Nginx as reverse proxy. Let's Encrypt SSL via Certbot (automated renewal via cron).

**Alternatives considered:** Caddy (one-line auto-SSL) — rejected per user preference for Nginx familiarity and broader ecosystem.

**Consequences:** Slightly more SSL setup work (~30 minutes one-time). Trade-off: more familiar tooling, more debugging help available online.

---

## ADR-013: GlitchTip self-hosted for error tracking
Date: 2026-04-18
Status: Accepted

**Context:** Need error tracking for production. User preference: self-hosted (no SaaS dependency).

**Decision:** GlitchTip — Sentry-API-compatible, lightweight (~500 MB RAM), single container, can share the existing Postgres instance.

**Alternatives considered:**
- Sentry SaaS — rejected per user preference.
- Sentry self-hosted — rejected, requires ~6 GB RAM (Postgres + Redis + ClickHouse), would crowd everything else on the 8 GB VPS.
- pino logs only (no UI) — viable fallback if GlitchTip proves too heavy in practice.

**Consequences:** Sentry-like error tracking without the SaaS bill. Adds ~500 MB RAM footprint. Must be monitored for resource consumption.

---

## ADR-014: Backups — Hostinger snapshots + nightly local pg_dump (no off-site)
Date: 2026-04-18
Status: Accepted with risk acknowledged

**Context:** Need backup strategy. Best-practice recommendation included off-site backup (e.g., nightly pg_dump uploaded to free B2 tier) to survive a vendor-level incident at Hostinger.

**Decision:** Hostinger built-in weekly snapshots + nightly local pg_dump rotation on the VPS itself (last 14 days retained). **No off-site backup.**

**Alternatives considered:**
- Adding off-site upload to Backblaze B2 free tier (10 GB free, ~30-line script) — recommended by architect, declined by user for simplicity.

**Consequences (RISK):** All backups live within Hostinger's infrastructure. If Hostinger has a vendor-level incident (account suspension, regional outage, billing dispute, infrastructure issue), there is **no path to recover data**. This is a known and accepted risk at MVP. **Strongly recommend revisiting before significant data accumulates.**

---

## ADR-015: Staging environment on the same KVM2 VPS as production
Date: 2026-04-18
Status: Accepted with risk acknowledged

**Context:** Phase 3 environment strategy required dev / staging / prod separation. Recommended a separate small VPS (Hostinger KVM1) for staging.

**Decision:** Run staging as a second Docker Compose stack on the same KVM2 VPS as production. Strict separation: separate databases, separate Nginx server blocks, separate domains (e.g., `staging.printbyfalcon.com`), separate `.env` with sandbox API keys (Paymob test mode, WhatsApp test number).

**Alternatives considered:**
- Separate KVM1 VPS for staging (~$5/mo) — recommended, declined to minimize cost.
- No staging environment — rejected; testing payment/WhatsApp on prod is unsafe.

**Consequences (RISK):**
- Memory pressure: two app stacks + two databases on 8 GB RAM may strain during heavy admin use.
- Misconfigured env vars in dev = real customer data risk; requires team discipline.
- A staging-induced VPS crash takes prod down with it.
- Acceptable for MVP at 100–500 daily visitors. Revisit at M1+ if traffic grows.

---

## ADR-016: Three admin roles from day 1 (Owner / Ops / Sales Rep)
Date: 2026-04-18
Status: Accepted

**Context:** Admin panel will be used by the owner, ops team, and sales reps with different responsibilities. Single-role admin systems often cause data accidents as teams grow.

**Decision:** Three roles in MVP:
- **Owner** — full access to everything (catalog, pricing, settings, all data).
- **Ops** — order management, status updates, courier handoff, returns, inventory read; **no access to pricing or revenue data**.
- **Sales Rep** — B2B queues (applications + Pending Confirmation), per-company tier/credit assignments, customer read; **no access to inventory or full revenue data**.

**Alternatives considered:** Single "Admin" role for MVP — rejected, ~1 dev-day cost for 3-role implementation outweighs the risk of data accidents.

**Consequences:** Admin codebase must implement role-based access control from day 1. Granular per-action permissions deferred to v1.1.

---

## ADR-017: Audit trail captured in DB from day 1; UI viewer in v1.1
Date: 2026-04-18
Status: Accepted

**Context:** Every state change (order status, price change, tier assignment, approval, cancellation, inventory movement) needs to be auditable. Retrofitting an audit trail later is painful and loses historical data.

**Decision:** Capture all state changes in an `audit_log` table from day 1, with `user_id + timestamp + entity + action + before/after + optional note`. Admin UI viewer deferred to v1.1; in MVP, audit data is queryable by devs directly via SQL.

**Alternatives considered:** Defer entirely to v1.1 — rejected; ~0.5 dev-day cost in MVP, immense future value.

**Consequences:** Slight DB growth from audit table; manageable at expected volumes. UI viewer in v1.1 unlocks customer-support self-service for "who changed this and when?" queries.

---

## ADR-018: Egyptian shipping handled via 5 admin-configurable zones
Date: 2026-04-18
Status: Accepted

**Context:** Egypt has significant geographic variation in shipping costs (Greater Cairo vs Upper Egypt vs Sinai). Flat-rate-across-Egypt is unfair; per-governorate (27 governorates) is too granular for MVP.

**Decision:** 5 zones — Greater Cairo / Alex+Delta / Canal+Suez / Upper Egypt / Sinai+Red Sea+Remote. Rates, free-shipping threshold, governorate-to-zone mapping, and COD per-zone availability — all admin-configurable.

**Alternatives considered:**
- Single flat rate — rejected, too unfair to remote zones.
- Per-governorate — rejected, too many to manage.
- Dynamic from courier API — rejected, local couriers don't have APIs.

**Consequences:** 5 zones balance fairness vs. operational simplicity. Editable mapping allows rebalancing as ops experience reveals real cost patterns.

---

## ADR-019: Order ID format `ORD-YY-DDMM-NNNNN` (daily-reset serial)
Date: 2026-04-18
Status: Accepted

**Context:** Order IDs need to be human-readable (for support phone calls), professional, and not reveal total order volume to competitors.

**Decision:** Format `ORD-YY-DDMM-NNNNN` where serial number resets daily. Example: 3rd order placed on 17 April 2026 → `ORD-26-1704-00003`.

**Alternatives considered:**
- Annual sequential (`ORD-26-00123`) — simpler but reveals order volume.
- Random short codes — harder to dictate over phone.

**Consequences:** Daily serial reset means support staff can quickly identify recent orders by date embedded in ID. Slight implementation complexity (per-day counter) vs. simple sequential.

---

## ADR-020: Invoice numbering `INV-YY-NNNNNN` (annual sequential)
Date: 2026-04-18
Status: Accepted

**Context:** Egyptian tax authorities generally expect gapless sequential invoice numbers per-year for audit purposes. Annual sequential is the safest bet for future tax audits and ETA integration in v1.1.

**Decision:** Format `INV-YY-NNNNNN` — annual sequential (e.g., `INV-26-000123` for the 123rd invoice of 2026).

**Alternatives considered:** Monthly-reset or daily-reset — rejected, may complicate accounting reconciliation and tax-authority audit expectations.

**Consequences:** Single annual counter per year. Gapless requirement means cancelled-but-numbered invoices must be retained as void records (handled via amendment versioning).

---

## ADR-021: Sprint 1 uses plain Server Actions + custom session table instead of Auth.js
Date: 2026-04-19 (Sprint 1, Day 1)
Status: Accepted

**Context:** The PRD tech stack table (§6) and the implementation plan (S1-D3-T1) both specify Auth.js (NextAuth v5) — Credentials provider for B2B + a custom WhatsApp OTP provider. During Sprint 1 implementation, wiring Auth.js to cover: (a) DB-backed sessions per ADR-010, (b) a WhatsApp OTP flow that isn't a standard NextAuth provider shape, and (c) the force-reset-on-first-login semantic — required a custom adapter + two custom providers + callback gymnastics, for roughly 2x the code of a direct implementation against the same `Session` / `User` tables.

**Decision:** Implement Sprint 1 auth as plain Server Actions (`loginB2BAction`, `requestB2COtpAction`, `verifyB2COtpAction`, `changePasswordAction`, `logoutAction`) that call directly into `lib/session.ts` (DB-backed 30-day rolling sessions with HttpOnly/Secure/SameSite=Lax cookies, SHA-256-hashed tokens at rest). Auth.js is not installed; the architecture invariants (DB sessions, bcrypt-12, OTP 6-digit SHA-256, rate limiting) are implemented directly and are smaller in total line count than the Auth.js integration would have been.

**Alternatives considered:**
- Auth.js v5 with PrismaAdapter + Credentials + custom OTP provider — rejected; more surface for the same behaviour; the OTP flow doesn't map cleanly to a single provider shape.
- NextAuth v4 — rejected; EOL path, App Router support is compromise-heavy.
- IronSession — viable, simpler than Auth.js, but offers nothing over our own session table.

**Consequences:** We own the session lifecycle — a few hundred lines of `lib/session.ts` + `lib/otp.ts` + action handlers — and have no Auth.js upgrade path to worry about. If we later need OAuth/social providers (not in MVP scope per ADR-007), Auth.js can be added then without disturbing the current code: the custom session table is compatible with Auth.js's Database strategy via its `Session` model. Update `docs/PRD.md §6` and `docs/architecture.md §7` references to Auth.js accordingly (superseded by this ADR for Sprint 1 scope).

---

## ADR-022: Drop Fawry from MVP — payment methods reduced to Paymob (card) + COD
Date: 2026-04-19 (Sprint 1, Day 1)
Status: Accepted with risk acknowledged · Supersedes Feature 3 / §6 / §10 in PRD and §2 / §3 / §6.2 / §8.2 in architecture as they relate to Fawry.

**Context:** The original MVP scope included three B2C payment methods — Paymob (card), Fawry (reference code at outlets), and COD. During Sprint 1 (runbook §5 prep) the owner chose to remove the Fawry direct integration entirely, citing minimum-vendor preference and the maintenance load of a second merchant approval, second sandbox, second webhook surface, second reconciliation cron, and a second support escalation path.

**Decision:** MVP B2C payment methods are now **Paymob (card) + Cash on Delivery only**. The standalone Fawry direct integration (separate merchant account, `FAWRY_*` env vars, `/api/webhooks/fawry` endpoint, dedicated `lib/fawry.ts` module slated for Sprint 9) is dropped from MVP. Sprint 9 is rescoped to "COD + Shipping Zones + Admin Settings" — the Fawry-specific tasks are removed.

**Alternatives considered:**
- **Route Fawry-code payment through Paymob Accept** (option B in the kickoff exchange) — Paymob Accept supports cash-at-Fawry/Aman as a sub-integration, giving the same customer experience without a second merchant relationship. **User declined**, preferring the simpler scope where pay-at-outlet is just not offered in MVP.
- **Keep Fawry direct integration as planned** — declined; vendor reduction priority outweighs the addressable-market concern at MVP scale.

**Consequences (RISK acknowledged):**
- **~30–40% of Egyptian B2C buyers prefer pay-at-Fawry/Aman outlets** (cash-economy, unbanked, or simply preference). MVP loses access to this segment until v1.1 if the user chooses to add Paymob Accept's outlet-payment integration or revives a direct Fawry integration.
- **COD becomes the only cash option for B2C.** Operational load on courier handling cash + reconciliation increases proportionally. Watch metrics post-launch — if COD share > 70%, revisit by adding outlet payment via Paymob Accept (small change: one extra Paymob `integration_id` and a UI option, no new vendor).
- **Sprint 9 capacity freed** (~2 days of dev work removed). Reallocate to either: (a) extra polish on shipping-zone admin UX, (b) pull a Sprint 10 task forward (audit-trail UI viewer is the obvious candidate but is v1.1 scope per ADR-017), or (c) just bank the slack as buffer. Decide at Sprint 9 kickoff.
- **R2 in the risk register is closed** (no Fawry approval to delay). **R-NEW** added: "no outlet-payment option in MVP could suppress B2C adoption in cash-economy segments — monitor COD share + cart-abandonment at checkout payment-method screen."
- Code/docs cleanup completed in this same change set: env var rows, runbook §5, PRD §5/§6/§10, architecture §2/§3/§6.2/§8.2, implementation-plan Sprint 9 + Sprint 11 + S1-D1-T3 + R2.

---

## ADR-023: No CDN in MVP — direct Nginx serving with strong cache headers
Date: 2026-04-19 (Sprint 1, Day 1)
Status: Accepted with risk acknowledged · Supersedes ADR-011's "Hostinger CDN" assumption and §2 / §3 / §8.5 / §9.3 of the architecture as they relate to CDN.

**Context:** PRD Open Question #6 asked whether Hostinger CDN was actually included on the KVM2 plan. Hostinger support confirmed on 2026-04-19: **no CDN on KVM2; they recommend Cloudflare instead.** Cloudflare is excluded by user preference (per ADR-011 and the original tech stack vetting). Both planned options are off the table.

**Decision:** **Do not use any CDN for MVP.** Static assets, product images, and invoice PDFs are served directly by Nginx from the VPS, relying on:
- `Cache-Control: public, immutable, max-age=31536000` on `/storage/` (filenames include hashes)
- WebP-optimized images at 3 sizes (thumb/medium/original) generated by Sharp
- Browser cache + Next.js route ISR (5-min revalidate on catalog pages) doing the heavy lifting

Revisit at **M2** (public launch + marketing campaign) if 30-day p95 storefront TTI exceeds 2 s on 3G mobile (NFR target) OR if traffic exceeds ~2k daily visitors and Netdata shows network-IO pressure.

**Alternatives considered:**
- **Cloudflare (recommended by Hostinger)** — Free tier covers 100% of expected MVP needs at zero cost. Rejected per ADR-011's "no Cloudflare" constraint, which the user reaffirmed when this ADR was written. If the user later relaxes that constraint, Cloudflare is the natural first move (DNS migration + orange-cloud the storefront subdomains; ~30 min of work).
- **Bunny CDN** — ~$1/TB pay-as-you-go, has Middle East PoPs, no commitment. Adds a vendor and a billing relationship. Rejected for MVP minimum-vendor preference; revisit if traffic outgrows direct-serve.
- **Upgrade to Hostinger KVM3/4** to get CDN bundled — cost + uncertain whether CDN is actually included even on higher tiers (Hostinger's marketing varies). Rejected as solving a problem we don't have.
- **AWS CloudFront / Fastly / KeyCDN** — overkill at MVP scale; rejected.

**Consequences:**
- **+30–80 ms latency** on first asset load for users outside Egypt (acceptable — Egyptian buyers are the audience).
- **All asset bandwidth flows through the VPS** — KVM2's NIC is generous; product-image traffic at expected scale is well under 1% of capacity. Netdata `system.net` widget will alert if this changes.
- **No edge cache invalidation problem** — static filenames are content-addressed; "invalidation" is shipping a new filename.
- **PRD Open Question #6 closed** — no CDN deferred to v1.1 or beyond unless metrics justify it.
- **R10 in the risk register closed** — Hostinger CDN coverage no longer an unknown; the answer is "not available, and we don't need one."
- **No code changes required** — `next.config.mjs` `images.remotePatterns` already lists `printbyfalcon.com` directly; Nginx site configs already serve `/storage/` with appropriate cache headers; the architecture's mention of "Hostinger CDN at the edge" is the only doc-side leftover and is updated in the same change set.

---

## ADR-024: Adopt Cloudflare Free as the CDN/DNS edge — supersedes ADR-023 and reverses the "no Cloudflare" part of ADR-011
Date: 2026-04-19 (Sprint 1, Day 1, hours after ADR-023)
Status: Accepted

**Context:** ADR-023 (written ~2 hours earlier today) committed MVP to no CDN after Hostinger confirmed CDN is not on KVM2 and Cloudflare was excluded by ADR-011. The user re-opened the Cloudflare exclusion the same day, asked for an honest recommendation between Cloudflare Free and remaining CDN-less, and accepted the recommendation to adopt Cloudflare Free. The original "no Cloudflare" preference (ADR-011) was a soft preference, not a hard constraint — confirmed in the same exchange.

**Decision:** **Adopt Cloudflare Free tier as the CDN, DNS, DDoS, and TLS edge for `printbyfalcon.com` and all subdomains.** Hostinger DNS is decommissioned for this domain (DNS migrates to Cloudflare nameservers — one-time, ~30 min – 4 h propagation). VPS Nginx remains the origin; Cloudflare proxies (orange-cloud) all four subdomains: root, `www`, `staging`, `errors`.

**Configuration choices (locked in this ADR — do not re-litigate):**
- **SSL/TLS mode:** Full (strict) — Cloudflare ↔ origin uses our existing Let's Encrypt cert.
- **Edge:** Always Use HTTPS, HSTS (max-age 1y, includeSubDomains, preload), Min TLS 1.2, Auto Minify HTML/CSS/JS off (Next.js already minifies; double-minification can break source maps), Brotli on, Early Hints on, HTTP/3 on.
- **Caching:** Standard. Page Rules / Cache Rules:
  1. `*/api/*` → bypass cache.
  2. `*/storage/*` → cache everything; edge TTL 1 year; respect origin headers (we already send `Cache-Control: public, immutable, max-age=31536000`).
  3. `*/_next/static/*` → cache everything; edge TTL 1 month.
- **Network:** IPv6 on, gRPC on, WebSockets on, 0-RTT on.
- **Security:** Bot Fight Mode on, Browser Integrity Check on, Schema Validation on, Replace insecure JS libraries on. **All three DDoS protection layers (SSL/TLS, Network, HTTP) are always-active on Free.** Email Address Obfuscation off (interferes with B2B contact forms). Hotlink Protection off (admin uploads images by URL during testing). **WAF Managed Rules** (which ADR-024 v1 listed as a Free benefit) — **discovered to be Pro-only on 2026-04-19 during runbook execution; ADR-024 amended same day**. Free quota of 5 Custom Rules and 1 Rate Limiting Rule reserved for Sprint 11 production-hardening (block common attack paths, rate-limit auth POST routes — the existing nginx + DB-backed rate limiter already covers the immediate need).
- **Origin lockdown:** VPS firewall (`ufw`) tightened to accept :80/:443 from Cloudflare's published IP ranges only, plus our deploy IP for emergency direct access. Prevents origin-bypass attacks. Updated whenever Cloudflare publishes new ranges (cron pulls https://www.cloudflare.com/ips-v4 + ips-v6 weekly).
- **Real client IP:** Nginx `real_ip` module restores `$remote_addr` from `CF-Connecting-IP` so existing nginx rate-limit (auth_limit zone) and our DB-backed rate limiter both see the actual client IP. App-side `requestMeta()` reads `cf-connecting-ip` first, then falls back to `x-forwarded-for`.

**Alternatives reconsidered and rejected:**
- **No CDN (ADR-023)** — leaves real performance + security wins on the table for an exclusion that turned out to be soft.
- **Bunny CDN** — requires a billing relationship; pay-as-you-go cost is small but non-zero; Cloudflare Free dominates at this scale.
- **Cloudflare Pro** ($20/mo) — adds image polishing + advanced WAF + better analytics. Unnecessary for MVP traffic; revisit at M2 if needed.

**Consequences:**
- **CDN PoPs in Cairo** → expected 80–150 ms TTI improvement on first asset load for Egyptian users (the actual target audience).
- **DDoS protection** at Cloudflare-tier scale, free.
- **Origin IP hidden** behind Cloudflare proxy — defense-in-depth.
- **Free tier ceilings to watch:** 5 Page Rules (we use 3, room for 2 future); free WAF Managed Rules only; no image optimization (Sharp already does this).
- **HTTPS plaintext is visible to Cloudflare** at the proxy. Customer PII (name, phone, address, OTP code in transit, B2B password in transit) flows through Cloudflare. **Card data is unaffected** — Paymob hosted iframe means cards never touch our servers. Accepted risk; standard for ~20% of internet sites; user explicitly considered this when accepting the recommendation.
- **Vendor risk** — Cloudflare US-based. If blocked or our account suspended, site goes dark. Mitigation: orange-cloud → grey-cloud flip in Cloudflare panel reverts to direct Hostinger DNS in 5–10 min; documented in runbook §6 fallback section.
- **DNS migration** — one-time switch in Hostinger panel from Hostinger nameservers to Cloudflare nameservers. Existing DNS records preserved (Cloudflare imports them on add-site). Up to 24 h propagation; in practice 30 min – 4 h.
- **Code changes:** `lib/request-ip.ts` helper added; `app/actions/auth.ts` `requestMeta()` uses it. Nginx site configs gain `set_real_ip_from <CF range>` + `real_ip_header CF-Connecting-IP` directives. Two committed files updated; runbook captures the VPS-side `ufw` lockdown and the cron that refreshes Cloudflare IP ranges.
- **PRD §6 / §7 / §10**, **architecture §1 / §2 / §3 / §8.5 / §9.3 / §11**, **runbook §6**, **memory `project_print_by_falcon.md`**, **`progress.md`** all updated to reflect the new edge.
- **ADR-023 superseded.** ADR-011's "Cloudflare excluded" assertion is partially superseded — Cloudflare IS used for CDN/DNS/TLS edge, NOT for object storage (Cloudflare R2 still excluded; VPS filesystem remains the storage backend per the unchanged half of ADR-011).
- **R10 stays closed** under this superseding ADR; the resolution flips from "no CDN" to "Cloudflare Free CDN."

---

## ADR-025: Re-introduce Fawry pay-at-outlet via Paymob Accept's sub-integration — partially amends ADR-022
Date: 2026-04-19 (Sprint 1, Day 1, hours after ADR-022)
Status: Accepted

**Context:** ADR-022 dropped Fawry from MVP citing the cost of a second merchant relationship (separate KYC, separate webhook surface, separate sandbox, separate reconciliation, etc.). On Paymob sandbox provisioning the user discovered Paymob auto-created **two integration IDs** in the same merchant account: one for cards and one for Fawry pay-at-outlet via Paymob Accept. The "second vendor" cost that drove ADR-022 doesn't exist in this path — it's a single Paymob merchant account, single KYC, single sandbox, single webhook, single dashboard.

**Decision:** **Re-introduce pay-at-Fawry/Aman as a B2C payment option, but routed through Paymob Accept's `INTEGRATION_ID_FAWRY` sub-integration — NOT a direct Fawry merchant relationship.** Customer experience matches the original Feature 3 promise (select "ادفع فوري" → receive reference code → pay at any Fawry/Aman outlet); operationally we still have one Paymob webhook, one merchant account, one set of credentials to rotate.

The B2C payment options return to: **Paymob card + Paymob-Fawry pay-at-outlet + Cash on Delivery.**

**Alternatives reconsidered:**
- **Stick with ADR-022 (no Fawry at all)** — rejected; the cost driver of ADR-022 evaporated when Paymob provisioned the sub-integration for free.
- **Build direct Fawry merchant integration anyway** — rejected; redundant now that Paymob handles it. Same customer experience, half the operational surface.

**Consequences:**
- **PRD Feature 3 reverts** to listing Fawry as a B2C payment method (with the clarification: routed via Paymob, not a direct Fawry merchant integration). Mahmoud's user story re-includes the Fawry option. Change log noted.
- **Sprint 9 scope re-amends:** the original "Fawry integration" tasks (S9-D4-T1, S9-D4-T2 — were ~2 days) are not restored. Instead a **single ~0.5-day task** is added: surface the existing Paymob `INTEGRATION_ID_FAWRY` as a checkout option (one extra payment-method radio button + one branch in `createOrder` action that picks `INTEGRATION_ID_CARD` vs `INTEGRATION_ID_FAWRY`). The Paymob webhook handler does NOT need a second branch — Paymob normalizes both into the same `transaction_id` callback. The ~1.5 days of S9 capacity reallocated in ADR-022 (governorate bulk-edit, COD reconciliation report, promo polish) **stay as nice-to-haves** — not removed.
- **Env vars renamed** for clarity: `PAYMOB_INTEGRATION_ID` → `PAYMOB_INTEGRATION_ID_CARD`; new `PAYMOB_INTEGRATION_ID_FAWRY`. `PAYMOB_IFRAME_ID` stays singular (same iframe handles both methods, the `integration_id` in the payment-key request is what differentiates).
- **R-NEW-1 (cash-economy adoption suppression)** — **closed** by this ADR; pay-at-outlet is back without adding a vendor.
- **No additional KYC, contracts, agreements, sandboxes, or merchant approvals** required. The same Paymob sandbox keys (provisioned 2026-04-19) cover both integrations.
- **Architecture §8.1 amended** to reflect dual integration via single Paymob account; §8.2 (already a "descoped from MVP" note) amended to point at this ADR.
- **Runbook §4 Done-when** updated: now requires both `PAYMOB_INTEGRATION_ID_CARD` and `PAYMOB_INTEGRATION_ID_FAWRY` in `.env.staging`.
- **No new Fawry-specific risk introduced** — Paymob is the single point of failure for both card and outlet payments. If Paymob outage, card AND Fawry options both unavailable; COD remains as fallback. Acceptable concentration risk at MVP scale.

---

## ADR-027: Categories support unlimited nesting (supersedes architecture §5.2 "max 2 levels for MVP")
Date: 2026-04-18 (Sprint 2, Day 1)
Status: Accepted

**Context:** Sprint 2 kickoff exchange — the owner asked that categories be editable, addable, deletable, AND that categories be nestable inside other categories. The architecture doc (§5.2) originally capped the MVP tree at 2 levels to keep the admin UI simple. The schema's `parentId` self-relation already supports arbitrary depth; the cap was a UX convention, not a schema constraint.

**Decision:** Remove the 2-level cap from the Category model. Unlimited nesting is supported end-to-end:
- **DB:** `Category.parentId` nullable self-FK; `buildTree`/`flattenTree` helpers in `lib/catalog/category-tree.ts` assemble depth-aware trees for rendering.
- **Admin:** category list renders as indented tree; edit form's "parent" picker is the flattened tree with self+descendants greyed out (anti-cycle guard at the UI layer, reinforced server-side in `updateCategoryAction` with an explicit ancestor-walk).
- **Storefront:** the header's category menu shows top-level categories with first-level children in the dropdown; deeper levels are reachable via each category's own page (subcategories rendered as chips at the top of the product list). Breadcrumbs on the product detail show category + parent only for MVP screen simplicity.

**Deletion policy (same kickoff exchange):** for every catalog entity that references others (Brand, Category, Product, PrinterModel), delete is only allowed when no dependent rows exist. The UI surfaces an Archive button as the always-safe soft-delete — `status=ARCHIVED` hides from the storefront but preserves references, is reversible, and keeps order-history/audit-log integrity.

**Alternatives considered:**
- **Keep 2-level cap** — rejected; the owner's ask makes tree depth a real requirement, and the schema cost was zero (self-relation already in place).
- **Fixed 3-level cap** (Department / Category / Subcategory) — rejected; arbitrary caps invite "just one more level" escape hatches later. Schema allows any depth; UI caps *display* indentation at 3 levels for legibility but doesn't block data.

**Consequences:**
- One new file (`lib/catalog/category-tree.ts`) + depth-aware admin UIs.
- Every dependent-check (brand/category/printer-model delete) now routes through a "has_dependents" branch that surfaces a clear message in both locales.
- Architecture §5.2 line "Tree structure (max 2 levels for MVP)" is superseded by this ADR.

---

## ADR-028: Storage bind-mount to /var/pbf/storage on host (replaces Sprint 1 named volume)
Date: 2026-04-18 (Sprint 2, Day 1)
Status: Accepted

**Context:** Sprint 1 defined `pbf_prod_storage`/`pbf_staging_storage` as named Docker volumes mounted at `/storage` inside the app+worker containers. The Nginx config shipped in Sprint 1 already uses `alias /var/pbf/storage/` for the `/storage/` location block, which targets the host filesystem — not the Docker-managed volume at `/var/lib/docker/volumes/pbf-prod_pbf_prod_storage/_data/`. These pointed at different bytes; Sprint 1 didn't exercise this because no images existed yet. Sprint 2 starts writing product images, so the misalignment would have caused 404s at Nginx the moment the first image went live.

**Decision:** Switch both stacks to a bind mount:
- prod: `/var/pbf/storage:/storage`
- staging: `/var/pbf/staging/storage:/storage`

The host directories already exist (runbook §1.7 Sprint 1 housekeeping creates `/var/pbf/storage` + `/var/pbf/staging/storage` at VPS setup). Named volumes `pbf_prod_storage`/`pbf_staging_storage` are removed from the compose files' `volumes:` blocks (left as comments for history).

**Alternatives considered:**
- **Change Nginx config to point at `/var/lib/docker/volumes/...`** — rejected; that path is Docker-version-specific and not a documented public interface.
- **Run Nginx inside Docker and share the named volume** — rejected; Sprint 1 already chose host Nginx for certbot/Cloudflare-IP-lockdown reasons (runbook §2 + §6), and moving Nginx into Docker would unpick more than it fixes.
- **Serve /storage/ via Next.js route in prod** — rejected; duplicates the logic, adds latency, loses Cache-Control simplicity.

**Consequences:**
- One-time VPS action when deploying Sprint 2: `docker compose -f docker/docker-compose.prod.yml down` then `up -d` (named-volume data is empty so nothing to migrate). Runbook §11 note added.
- Dev works unchanged — `./storage` relative path + `app/storage/[...path]/route.ts` fallback.
- Architecture §2 bullet "File storage" now clearly states "VPS host filesystem `/var/pbf/storage/` — bind-mounted into app/worker containers; served directly by Nginx." (Previously ambiguous.)

---

## ADR-029: Bilingual FTS uses `simple` config + app-side searchVector maintenance (no DB triggers)
Date: 2026-04-19 (Sprint 3, Day 1)
Status: Accepted

**Context:** Sprint 3 requires full-text search across bilingual product content (`name_ar`, `name_en`, `description_ar`, `description_en`, `sku`) plus brand names (joined through `Brand`). Postgres ships with language-specific text-search configs (`english`, `french`, ...) but **no `arabic` config**. Using `english` on Arabic text would run through the English stemmer and produce garbage. The architecture doc (§5.2) assumed a plain tsvector column without specifying how to maintain it; the implementation plan (S3-D1-T1) mentions a "trigger to auto-update on insert/update" which would make the FTS setup re-apply on every `prisma db push` (ADR-021 pattern).

**Decision:**
- **Text-search config: `'simple'`** for all columns, in both languages. It tokenizes on whitespace + punctuation and lowercases but does NOT stem — the safest default when you need to handle AR and EN in the same vector and can't run two configs. English loses stemming quality (searching "toners" won't match "toner") — accepted trade-off at MVP scope; the 200-SKU-class catalog is too small for stemming to move the needle.
- **Maintenance: app-side, not DB-side.** `lib/catalog/search-vector.ts::updateProductSearchVector(productId)` runs a single `UPDATE "Product" p SET "searchVector" = ... FROM "Brand" b WHERE ...` after every `createProductAction`, `updateProductAction`, and CSV seed write. Brand renames trigger `updateSearchVectorsForBrand(brandId)` which bulk-updates every product in that brand. **No Postgres triggers** — they'd need to be re-applied after each `db push` and we'd have to store them in a raw-SQL init script anyway.
- **Weights:** A for sku + name_ar + name_en (exact/near-exact match wins); B for brand.name_ar + brand.name_en; C for description_ar + description_en. Queries use `ts_rank_cd` with the default weights `{0.1, 0.2, 0.4, 1.0}`.
- **Index:** `CREATE INDEX ... USING GIN ("searchVector")` — created by `scripts/post-push.ts` which runs after `prisma db push` and before `prisma/seed.ts` in the container startup command. That same script also creates `pg_trgm` GIN indexes on `Product.nameAr`, `Product.nameEn`, `Product.sku`, and `PrinterModel.modelName` for short-query + fuzzy fallback (used when `plainto_tsquery` returns 0 hits and the term is <3 chars, or when the user is typing a partial printer model).
- **Backfill:** `post-push.ts` rewrites every product's `searchVector` on boot. Idempotent — same input produces same bytes. Cost at MVP scale is sub-second.

**Alternatives considered:**
- **Postgres trigger that updates searchVector on INSERT/UPDATE of Product or Brand.** Rejected — `db push` drops and recreates tables in some scenarios, and the trigger would need to be re-declared every boot via raw SQL anyway (same maintenance surface, worse locality — developers reading the action code can't see what populates the vector).
- **Generated column (`GENERATED ALWAYS AS ... STORED`).** Rejected — can't reference other tables (Brand) in a generated column, and we want brand names to be searchable. Self-column-only generated column would leave brand out of FTS ranking.
- **`english` config for English columns + `simple` for Arabic, combined via `||`.** Considered; rejected for MVP simplicity. Stemming gain on a 500-SKU-class catalog is marginal; revisit if search quality metrics show clear miss patterns on pluralized English queries.
- **External search engine (Meilisearch, Typesense, Elasticsearch).** Rejected per ADR-009 — Postgres FTS is adequate for 500–2k SKUs; adding a second search service violates the minimum-vendor principle.

**Consequences:**
- **No `arabic_stem` is available** — users searching "حبرات" (toners, plural) won't match "حبر" (toner, singular). Acceptable at MVP; can add custom dictionary or swap to pg_trgm-only for AR if post-launch metrics say so.
- **Brand rename is O(n_products_in_brand)** — usually <50 rows, single SQL statement. Measured in tests at <20ms for 50 products.
- **`post-push.ts` is now part of the container startup critical path** — if it fails, the container exits and Docker restart loops. Same failure mode as `db push` and `seed.ts`, which already had this property.
- **Trigram indexes add disk overhead** (~2x the indexed column bytes per index; ~200 KB at 2k SKUs). Negligible at MVP scale.
- **Future-proofing:** when we later want per-language FTS (or switch to BM25-via-pgroonga), the `PRODUCT_SEARCH_VECTOR_EXPR` is a single place to change — every writer goes through `lib/catalog/search-vector.ts`.

---

## ADR-026: Add Valkey container scoped to GlitchTip — does NOT violate ADR-010
Date: 2026-04-19 (Sprint 1, Day 1, during runbook §7 execution)
Status: Accepted

**Context:** During GlitchTip first-boot we hit `ConnectionError: failed to lookup address information: Temporary failure in name resolution` from `django_vcache` calling out to a Redis-compatible cache. GlitchTip v6.1.5 (current latest) made Valkey/Redis a hard requirement for caching + rate-limiting + session storage — older docs we wrote against (v4.x patterns) didn't reflect this. Web-only deployment without a cache backend simply doesn't boot.

**Decision:** Add a Valkey container (`valkey/valkey:7-alpine`, `--save "" --appendonly no` for memory-only mode) to `docker-compose.prod.yml`, scoped exclusively to the GlitchTip service via the docker-compose internal network. The Print By Falcon application (Next.js + worker) **does not get a Redis URL and cannot reach Valkey** — pg-boss + DB-backed sessions remain in place per ADR-010.

**Why this does NOT violate ADR-010:**
- ADR-010's intent was avoiding Redis as **a service that our app stack depends on** (one less thing to monitor, one less point of failure for the customer-facing flow).
- Valkey here is a transitive dependency of a third-party self-hosted service (GlitchTip). It's similar to how Postgres is a dependency of GlitchTip (and we already share Postgres) — we're not building Redis-dependent code.
- If Valkey crashes, GlitchTip degrades or stops accepting events; the Print By Falcon app stack is **completely unaffected** (it doesn't even know Valkey exists).
- If we ever swap GlitchTip for a different error tracker, Valkey goes with it.

**Resource cost:** Valkey-7 alpine in memory-only mode uses ~50 MB RAM. Within the 1.3 GB headroom budget per architecture §10.

**Alternatives considered:**
- **Pin to GlitchTip v4** (which pre-dates the Valkey requirement) — rejected. v4 is unmaintained; security patches go to v6+.
- **Switch to a different self-hosted error tracker** (Sentry self-hosted, BugSink, errsole) — rejected. Sentry self-hosted requires ~6 GB RAM (per ADR-013 we already evaluated); GlitchTip + Valkey at ~550 MB total is still the minimum-resource Sentry-compatible option.
- **Use SaaS (Sentry.io free)** — rejected per ADR-013 (no SaaS dependency preference).

**Consequences:**
- New Valkey container added to prod stack only (staging stack unchanged — staging app reports errors to prod GlitchTip via the shared DSN).
- New volume `pbf_prod_valkey_data` (functionally empty since we use memory-only mode, but defined for forward-compat).
- `glitchtip` service now depends on `valkey: service_healthy` in addition to `postgres`.
- `glitchtip` service `command` overridden to `./manage.py migrate --noinput && ./bin/start.sh` so future GlitchTip image upgrades auto-apply schema changes (no more manual `docker exec ... migrate` after bumps).
- `LOG_LEVEL: INFO` explicitly set in glitchtip service's `environment:` (Python logging requires uppercase; Pino doesn't care).
- Architecture §10 resource budget table updated to add Valkey row (~50 MB).
- GlitchTip celery-beat worker container intentionally **not** added to MVP — error ingestion + display works without it; email digests + cleanup tasks deferred to M2 if needed.

**Risk:** None new. Concentration risk on the prod stack increases marginally (one more container to monitor), but Valkey is operationally simple (no persistence, single-process) and well-known.
