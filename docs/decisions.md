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

## ADR-030: Cash-on-Delivery pulled into Sprint 4 (originally Sprint 9)
Date: 2026-04-19 (Sprint 4 kickoff)
Status: Accepted

**Context:** The original plan (Sprint 9 — "COD + Shipping Zones + Admin Settings") defers COD wiring until the shipping-zone admin UX lands. On Sprint 4 kickoff the owner asked to have COD available at the M0 demo alongside Paymob card — so the demo checkout screen shows two real payment methods instead of a card-only view, and the Sprint 4 exit criterion "end-to-end order placement" covers both the Paymob redirect path and the all-internal COD path.

**Decision:** Implement COD as a real payment method in Sprint 4. Orders placed with `paymentMethod=COD` land in `paymentStatus=PENDING_ON_DELIVERY`, bypass the Paymob API call, and go straight to the internal confirmation page. Shipping fee is hard-coded to **0 EGP** in Sprint 4 (no zone config yet) — Sprint 9 wires `ShippingZone` + governorate-mapping + admin rates AND the COD per-zone availability toggle on top of the existing COD path.

**What's NOT pulled in:** COD fee, COD max order value, per-zone availability toggle (all still Sprint 9 per PRD Feature 3). Those are admin-config surfaces that don't block M0.

**Alternatives considered:**
- **Keep COD for Sprint 9 as originally planned** — rejected; a card-only M0 demo misrepresents what the real MVP store offers (COD is the dominant payment method in the Egyptian B2C segment per the personas in PRD §3).
- **Add COD and all shipping-zone plumbing at once** — rejected; doubles Sprint 4 scope and pushes M0 out.

**Consequences:**
- `Order.paymentMethod` enum and `createOrderAction` branch on COD vs Paymob — clean split that Sprint 9 extends without touching again.
- `PaymentStatus.PENDING_ON_DELIVERY` added so ops can distinguish "COD, not yet paid" from "Paymob, awaiting webhook". Admin orders list + detail page show both transparently.
- Sprint 9 scope shrinks — no new COD schema work, only the admin config surfaces + zone-based rate calc. Keeps Sprint 9 focused on shipping fee calculation.
- COD fee + max-value are not enforced in Sprint 4 (anyone can place a 1 million EGP COD order). Acceptable at MVP / closed-beta; Sprint 9 adds the guardrails.

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

---

## ADR-031: Design direction — "Apple-Store restraint for a Cairo printer-supplies shop"
Date: 2026-04-19 (post-M0 UI/UX polish pass — foundation only)
Status: Accepted

**Context:** M0 shipped on default shadcn tokens (primary blue `220 75% 40%`, default Inter + Cairo, no custom radii/shadows, no brand identity). Storefront visually indistinguishable from every other shadcn demo. Owner invoked `/ui-ux-refiner` after Sprint 4 close to establish a brand direction before Sprints 5–12 layer on more features. Scope chosen: **foundation only** — tokens, shell (header/footer/mobile nav), homepage, and feedback layer (toasts / 404 / 500 / loading). Screen-level polish deferred to an M1-eve pass so Sprints 5–12 inherit the system rather than fight it.

**Decision:** Commit to a disciplined, restrained identity — **trustworthy + technical + utilitarian-premium**. Verbal shorthand: "Apple-Store restraint applied to a Cairo printer-supplies shop." Differentiated from Raya / Noon / 2B (all warm-accent retail), but borrowing their product-card anatomy, icon+text header actions, and homepage rails pattern for Egyptian-shopper familiarity.

**Concrete choices:**
- **Palette:** Ink `#0F172A` + Canvas `#FAFAF7` (warm off-white) + Paper `#F3F1EC` (cream cards) + Border `#E5E2DA` / `#8F8A7D`. Single brand accent: **Ink-Cyan `#0E7C86`** (nods to printer-ink/toner without being cartoonish; differentiates from warm-accent Egyptian retailers; reads technical + trustworthy). `--accent-strong #0A6B74` for body-text links, `--accent-soft #E6F3F4` for tinted bg / selection. Semantic: success `#2F7A4B`, warning `#8F6320`, error `#B54747` — all contrast-verified AA body.
- **Typography:** **Inter** (EN, weights 400/500/600/700/800) + **IBM Plex Sans Arabic** (AR, weights 400/500/600/700) — replaces Cairo (default + over-used). No display font; use weight variation for hierarchy.
- **Scale:** 12/14/16/18/20/24/32/48/64, line-heights 1.2/1.4/1.5, tight tracking on large headings.
- **Spacing:** 4px baseline (added tokens 72/88/120/136 px to Tailwind).
- **Radii:** 6 / 10 / 16 px (inputs / cards & buttons / modals).
- **Shadows:** two elevations only — `card` + `popover`. No hero-level drama.
- **Motion:** default 180ms `cubic-bezier(0.2, 0.7, 0.3, 1)`. Card hover = `scale(1.02)` + shadow lift. `prefers-reduced-motion` respected.
- **Icons:** Lucide, 20px, 1.75 stroke.
- **Dark mode:** explicitly skipped for MVP.
- **shadcn `primary` = Ink**, not the cyan accent. Cyan reserved for commerce-critical CTAs (add-to-cart, checkout, sign up) via an added `variant="accent"` on Button. Keeps cyan rare and meaningful.

**Adjustments from initial palette proposal (contrast-driven):**
- `success` `#3A8F5A` → `#2F7A4B` (was 3.8:1, fails body AA; now 5.0:1)
- `warning` `#B8822C` → `#8F6320` (was 3.2:1, fails body AA; now 5.0:1)
- Added `border-strong #8F8A7D` (3.3:1) for input borders where WCAG 1.4.11 applies — base `border #E5E2DA` retained for decorative dividers (1.2:1, decorative-only).

**Alternatives considered:**
- **Warm accent (red/orange) matching Raya/Noon/2B** — rejected. Three biggest Egyptian electronics retailers already own that visual lane; cyan gives us differentiated shelf appeal in search results and social sharing.
- **Keep Cairo** — rejected. Default Arabic font, over-used, reads corporate-generic. Plex Arabic has distinct character and pairs mechanically with Inter.
- **Add a display font (Fraunces / Space Grotesk / Instrument Serif)** — rejected. Keeps font budget small; Inter at weight 800 with tight tracking provides sufficient display presence.
- **Adopt dark mode** — deferred. Not MVP-critical; doubles the tokens to maintain during Sprints 5–12.
- **Full polish pass now** — rejected (see Context). Foundation-only discipline means Sprints 5–12 inherit the system without a second re-polish cycle.

**Consequences:**
- Existing shadcn `<Button>` default renders **Ink** (dark slate), not cyan. Some admin/secondary buttons visually shift darker — reads more considered, less "Linux utility."
- All `font-family: Cairo` usages (if any) must be removed; `--font-arabic` now binds to IBM Plex Sans Arabic.
- New Tailwind utilities available: `bg-accent-strong`, `bg-accent-soft`, `shadow-card`, `shadow-popover`, `ease-out-smooth`, `duration-{fast,base,slow}`, `animate-{fade-in,slide-in-end,slide-in-start,scale-in}`, `.container-page`, `.shimmer`.
- Sprint 5+ work ADRs must note when they intentionally diverge from this direction (expected: very rare).
- `docs/design-system.md` becomes the living reference; future features are reviewed against it.

**Scope of this pass (foundation-only, deliberate exclusions):**
- ✅ tokens, shell (header/footer/mobile nav), homepage, feedback layer (toasts, 404, 500, loading)
- ❌ products list / product detail / search / cart / checkout / account / admin — all deferred to M1-eve polish pass per owner's 2026-04-19 decision.

---

## ADR-032: Formalize release pipeline — operational runbook + manual prod deploy workflow + CI test hard-fail
Date: 2026-04-19 (release-engineer pass prepping Sprint 4 + UI pass deploy)
Status: Accepted

**Context:** Sprint 1–3 production deploys were executed successfully but via direct SSH + `docker compose up -d --build`. The auto-staging workflow existed from Sprint 1, but three gaps hurt operational hygiene:
1. **No runbook.** Knowledge about deploys, rollback, incidents lived in `docs/sprint1-external-tasks.md` (setup-only) and in the owner's head. 3am failure mode: nothing to open.
2. **No prod-deploy workflow.** Prod was SSH-only. This is fine for one-person operations today, but gives no audit trail and no pre-deploy guardrails (staging-verification checkbox, approval gate, post-deploy health probe).
3. **CI tests `continue-on-error: true`.** A regression in vitest doesn't block deploys. Was safe during Sprint 1 flux; no longer acceptable now that M0 is stable.

**Decision:** Ship three release-engineering artifacts ahead of the Sprint 4 + UI pass deploy:

1. **`docs/runbook.md`** — single operational source of truth. 11 sections: quick reference, environments, secrets, deploy procedure (staging auto + prod manual + SSH fallback), smoke test checklist, rollback (3 flavors), monitoring, common incidents, backups, deploy history table, cheatsheet.
2. **`.github/workflows/deploy-production.yml` + `scripts/deploy-production.sh`** — manual `workflow_dispatch` that SSHes to the VPS and runs the prod-stack rebuild. Protected by:
   - GitHub Environment `production` with required-reviewer approval rule (owner attaches this in Settings → Environments)
   - Guardrail checkbox: reviewer must tick "I verified staging" before the workflow runs
   - Post-deploy health probe (5 attempts × 10s backoff) that fails the workflow if health doesn't return 200
3. **CI test step hardened** — removed `continue-on-error: true` from the vitest step in `.github/workflows/ci.yml`. Regressions now block the staging auto-deploy.

**Alternatives considered:**
- **Full CD to prod on merge** — rejected. Matches release-engineer skill principle 4 ("automate the boring, manual the scary") and owner's solo pacing. Auto-prod works only when test coverage is strong AND observability catches regressions within a minute. Neither is fully true yet.
- **Deploy via a third-party CD platform** (Railway, Render, Fly) — rejected. Hostinger KVM2 + docker-compose is already working; switching costs > benefit at MVP scale (ADR-010, ADR-012 minimum-vendor preferences).
- **Leave prod manual-SSH, skip the workflow** — rejected. The workflow adds audit (Actions log shows every prod deploy) + guardrails (staging checkbox, auto health probe) for ~40 lines of YAML.

**Consequences:**
- **Owner action required (one-time):** in GitHub → Settings → Environments, create `production` environment → add self as required reviewer → attach `VPS_HOST`, `VPS_USER`, `VPS_PORT`, `VPS_SSH_KEY` secrets to it. Same secrets already exist on the `staging` environment from Sprint 1.
- Sprint 5+ prod deploys use the workflow button instead of SSH. SSH fallback is documented in runbook §4.3 for when GH Actions is degraded.
- Test regressions now fail staging CI. If tests get flaky in a sprint, fix them in the same PR rather than merging around.
- Runbook becomes the living doc — every sprint's deploy appends a row to §10 and each new incident gets a new sub-section in §8.

**Not changed:**
- Deploy cadence (sprint → staging → verify → prod → next sprint) per owner's 2026-04-19 preference — unchanged.
- Schema sync via `prisma db push --accept-data-loss` in both envs per Sprint 1 pattern — still open as Sprint 11 parking lot (switch to `migrate deploy`).
- Backup strategy (nightly `pg_dump` + Hostinger snapshots, 14d retention, no off-site) per ADR-014 — unchanged; now documented in runbook §9 instead of scattered.

---

## ADR-033: Switch WhatsApp messaging from Meta Cloud API to Whats360 — supersedes ADR-011/PRD §6/arch §8.3 on WhatsApp transport
Date: 2026-04-20 (Sprint 5 kickoff)
Status: Accepted with vendor-risk acknowledged

**Context:** PRD §6, architecture §8.3, and the Sprint 1 template-approval tasks (S1-D3-T3) all assumed Meta WhatsApp Cloud API as the transport. Sprint 4 shipped with `lib/whatsapp.ts` scaffolded for Meta Cloud API and `OTP_DEV_MODE=true` while awaiting Meta template approvals (`auth_otp_ar`, `order_confirmed_ar`, etc. — each 3-5 business-day approval). The Sprint 5 plan (S5-D3-T3) would have added 4 more per-status templates, extending the approval bottleneck. At Sprint 5 kickoff the owner reported they've subscribed to **Whats360** — a third-party service that exposes an HTTP GET send API (`/api/v1/send-text`, `/api/v1/send-image`, `/api/v1/send-doc`) backed by a QR-attached WhatsApp device — and will use it instead of Meta's official Cloud API.

**Decision:** **All WhatsApp outbound (OTP, order confirmation, status change, B2B review acknowledgement, delayed/issue, cancellation approval, payment failure) is sent via Whats360's REST API.** The concept of pre-approved Meta "templates" is dropped entirely — messages are composed server-side as plain AR/EN text and sent with one HTTP GET per recipient.

**Concrete configuration:**
- **Base URL:** `https://whats360.live` (configurable via `WHATS360_BASE_URL` env for sandbox/mocks).
- **Credentials:** `WHATS360_TOKEN` + `WHATS360_INSTANCE_ID` in `.env.staging` and `.env.production`. The token is a 64-char hex; instance_id looks like `device_<random>`.
- **JID format:** Egyptian mobile `201XXXXXXXXX@s.whatsapp.net` (country code without +, no leading zero).
- **Send flow:** `GET https://whats360.live/api/v1/send-text?token=...&instance_id=...&jid=<phone>@s.whatsapp.net&msg=<urlencoded-text>`. Success = `{"success": true, ...}`. 403 = rate-limit / quota exceeded.
- **Dev mode:** `NOTIFICATIONS_DEV_MODE=true` (new, mirrors `OTP_DEV_MODE`) skips the HTTP call and logs the payload. `OTP_DEV_MODE=true` continues to short-circuit the OTP flow independently. Prod flips both to `false` once the Whats360 device is confirmed connected and the staging smoke test has sent a real message end-to-end.
- **Sandbox flag:** `&sandbox=true` appended in non-prod envs to exercise the API without billing real sends (per Whats360 docs).
- **Inbound (delivery-status / receive):** Whats360's "custom webhook" delivers `outgoing message`, `send failure`, `incoming message`, and `subscription expiry` events to `POST /api/webhooks/whats360` (new endpoint). Used to mark `Notification.status` as `sent`/`failed` and to alert admin on subscription expiry. Unlike Meta, there is no per-message `delivered`/`read` status — we capture `sent` (we dispatched) and `failed` (Whats360 couldn't send), and treat anything not explicitly failed as delivered.
- **Auth:** Whats360 webhooks include a shared secret header (`X-Webhook-Token`) we compare against `WHATS360_WEBHOOK_SECRET` before processing.

**Alternatives reconsidered:**
- **Stay on Meta Cloud API with 5 collapsed templates** — rejected. Owner has already subscribed to Whats360; Meta's template-approval coordination would still gate the Sprint 5 demo by 3–5 business days per template.
- **Run both (Meta primary, Whats360 fallback)** — rejected; doubles the integration surface and branching logic for zero MVP value. One transport, clear code path.
- **Roll our own WhatsApp integration via whatsapp-web.js or Baileys** — rejected. Same risk shape as Whats360 (unofficial), much more infrastructure (persistent session management, QR re-scan handling, WhatsApp blocks); Whats360 takes that on as SaaS.

**Consequences:**
- **Template approval blocker evaporates.** Sprint 5 ships real WhatsApp delivery end-to-end as soon as the device is connected — no 3-5 day wait. `order_status_change_ar` / `order_confirmed_ar` / etc. are now server-side template strings in `lib/whatsapp/templates.ts`, rendered bilingually with customer's `languagePref`.
- **Vendor concentration risk — new.** Whats360 becomes a single point of failure for OTP + all order notifications. If Whats360 suspends our account, the device disconnects, or WhatsApp bans the underlying number (unofficial API risk), our entire WhatsApp channel goes dark. **Fallback path:** ~3-5 business days to provision Meta Cloud API + re-submit the 5 templates (unchanged from pre-MVP plan); code abstraction in `lib/whatsapp.ts` keeps the send surface small so the transport swap is a single-file change. Email remains as the parallel channel for B2B orders (per PRD Feature 5).
- **Device uptime is now an operational concern.** The physical phone scanning the QR must stay powered + connected. Owner action: keep the store's new business number's device powered and data-enabled. Admin dashboard gets a "Whats360 device status" widget in Sprint 5 that polls `/api/v1/instances/status` every 5 minutes.
- **PII now flows through Whats360's servers.** Customer phone + message body (which includes order number, status, name) are readable by Whats360 while in transit. Risk acceptance: same shape as Cloudflare proxy (ADR-024); no card data ever passes through. Documented in privacy-policy placeholder for M1-eve legal review.
- **No per-message delivered/read tracking.** Sprint 5's `Notification.status` uses `PENDING` → `SENT` (on success response) or `FAILED` (on exception / 4xx / 5xx / webhook `send failure` event). We drop the Meta-specific `DELIVERED`/`READ` states from the plan; the `Notification.status` enum is `PENDING | SENT | FAILED` (no `DELIVERED | READ`).
- **Rate limits shift.** Meta auth templates were free; utility templates were ~$0.01–0.03 each. Whats360 limit = "depends on your current plan" per their docs. S5-D8-T3's "5 per phone per hour" app-side limiter stays (protects customers from spam); Whats360's own plan limit is a separate concern owner tracks in the Whats360 dashboard.
- **No changes to `OTP_DEV_MODE` semantics.** Sprint 1's OTP dev-mode (prints code in server logs, bypasses WhatsApp) remains a dev-only affordance. `NOTIFICATIONS_DEV_MODE` is analogous for order status notifications.

**Supersedes / amends:**
- **ADR-011** "WhatsApp Cloud API (direct) — free auth templates, no middleman fees." → WhatsApp transport is now Whats360 (explicit middleman, subscription-based). The "free auth templates" rationale no longer applies; the decision driver is template-approval-free setup, not cost.
- **PRD §6** tech-stack row "WhatsApp — Meta WhatsApp Cloud API (direct)" → "Whats360 (third-party middleware)".
- **Architecture §8.3** "Meta WhatsApp Cloud API" section → Whats360 section (send endpoints, JID format, custom webhook model, device uptime concern).
- **Implementation-plan S1-D3-T3** (template submissions) → closed as obsolete; no Meta templates to submit.
- **Implementation-plan S5-D2-T2 / S5-D2-T3 / S5-D3-T3 / S5-D7-T3** — rewrite WhatsApp calls to target Whats360 + consume Whats360 webhook events + drop template-approval language.
- **Risk register R1** ("WhatsApp templates blocking launch") — **closed.** Replaced by **R-NEW-2: Whats360 service suspension / WhatsApp ban on the store's device number.** Monitor: Whats360 subscription status, device connection status, WhatsApp compliance. Mitigation: email fallback for B2B orders; documented Meta Cloud API failover path (~3-5 days to re-provision + template approvals) if Whats360 fails permanently.

**Doc-side propagation (done in Sprint 5 docs-pass task before any WhatsApp code change):**
- PRD §6 row updated
- architecture §8.3 rewritten
- implementation-plan Sprint 1 / Sprint 5 entries amended
- runbook §5 (secrets table) adds `WHATS360_TOKEN`, `WHATS360_INSTANCE_ID`, `WHATS360_WEBHOOK_SECRET` rows; removes Meta WhatsApp rows (kept as "future-fallback" comment)
- Risk register R1 closed, R-NEW-2 added
- memory `project_print_by_falcon.md` WhatsApp note updated

---

## ADR-034: Invoices are metadata rows + on-demand PDF rendering — no files on disk
Date: 2026-04-21 (Sprint 6 kickoff)
Status: Accepted · Supersedes PRD §5 Feature 7 "Storage" line + architecture §5.8 `file_path` column

**Context:** PRD §5 Feature 7 originally specified permanent PDF retention at `/storage/invoices/`, and architecture §5.8 modelled `Invoice.file_path`. Sprint 6 kickoff (2026-04-21) — owner pushed back on persisting files to the VPS: "If it's possible to send a PDF file via Whats360, please send the PDF and don't save it on my computer. However, if I want to generate, download, and print the invoice on the computer where the admin panel is logged in, I should do so instead of downloading and saving it to the local host, as I want to conserve storage space."

**Decision:** The `Invoice` model stores **metadata only** — `invoiceNumber`, `orderId`, `version`, `amendedFromId`, `isAmended`, `amendmentReason`, `generatedById`, `generatedAt`. **No `filePath` column.** PDFs are rendered on-demand in-memory (`@react-pdf/renderer` → `Buffer`) from the deterministic projection of:

- The immutable `Order` + `OrderItem` snapshot columns (ADR-030 snapshots SKU/name/unit price/qty/VAT at create time).
- The current `store.info` Setting KV (CR#, tax card#, address, phone — editable via `/admin/settings/store`).
- The `Invoice` row (number, version, amendment flag + reason).

Because all inputs are immutable or versioned, re-rendering the same `invoiceId` always produces semantically identical bytes; the Invoice row is the durable legal record.

**Delivery paths (all in-memory):**
1. **Signed public URL** `/invoices/[invoiceId].pdf?t=<hmac-sha256>` — renders each hit. Same URL handed to Whats360's `/api/v1/send-doc` for WhatsApp delivery, embedded in B2B confirmation emails, and opened/printed by admins.
2. **Email attachment (B2B only per PRD Feature 5)** — renderer outputs a `Buffer`, mailer encodes as base64 for the pg-boss payload, nodemailer re-decodes at send time. Never touches disk.
3. **Browser print (admin)** — same URL, opened inline (`Content-Disposition: inline`), admin hits browser Print.

**Numbering (ADR-020 preserved):** `INV-YY-NNNNNN` gapless annual serial via `InvoiceAnnualSequence` + atomic upsert-and-return — same pattern as `OrderDailySequence`. Each amendment consumes a fresh serial; the prior version's number is retained.

**Alternatives considered:**
- **Keep `/storage/invoices/` persistent PDFs** (PRD original) — rejected by owner; storage growth isn't a real MVP issue but the simpler code path + "nothing on disk to leak or back up" properties are worth the change.
- **Cache rendered bytes for 5 min on CDN / in memory** — partial; the `Cache-Control: private, max-age=300` on the route lets Whats360's short-lived fetch share a render with the customer's near-immediate click. Longer caches are deferred until a clear perf signal.
- **Render TOFU (lazy one-time, then persist)** — rejected; adds the "where" question back (disk? S3? R2?) that ADR-034 was explicitly removing.

**Consequences:**
- **Legal retention (5 years per ADR-003)** satisfied by the Invoice row + deterministic regeneration. The Order/OrderItem snapshots have been in place since Sprint 4; no schema change required there.
- **PDF rendering cost is per-request** — ~50-200 ms per render on the Hostinger KVM2 CPU. Acceptable: invoices fire at most a few times per order (CONFIRMED → one Whats360 fetch, one customer download, one admin open). No user is sitting on a download spinner measured in seconds.
- **Arabic font** — Noto Sans Arabic TTF committed to `public/fonts/NotoSansArabic.ttf` (OFL, 844 KB). Registered once via `@react-pdf/renderer` `Font.register`; variable-font default axes are used. Adds to the image size but keeps renders CDN-free.
- **No 404-then-regenerate fallback needed** — Invoice row has the truth; PDF is a projection.
- **Amendment flow** — `amendInvoice(priorId, reason)` marks prior as `isAmended=true`, allocates a new number, sets `amendedFromId`. Prior version is still downloadable from admin UI for audit.
- **Security surface** — invoice URLs need a signed token to be shareable (WhatsApp delivery, email attachment reference). Signing uses `INVOICE_URL_SECRET` (or falls back to `SESSION_SECRET`). No expiry for MVP; token is scoped per invoiceId so leak doesn't cascade. If an invoice's contents become sensitive after amendment, re-sign by rotating the env secret.
- **Whats360 `/api/v1/send-doc`** — accepts a public URL + filename + caption. Our signed URL is self-contained — Whats360's fetcher doesn't need to carry cookies or auth.
- **Email attachments (B2B)** — `pgboss.job.data` now carries base64 bytes. pg-boss's JSON payload size limits are generous (~16 MB default); invoice PDFs are ~60-200 KB. Fine.

**Supersedes / amends:**
- **PRD §5 Feature 7 "Storage: object storage on VPS filesystem (`/storage/invoices/`), permanent retention"** → replaced by "Rendered on demand; Invoice row + immutable Order snapshot satisfy legal retention (5 years per ADR-003). No files on disk."
- **architecture §5.8 `Invoice | ... file_path`** → `filePath` column removed; all other fields preserved. `amendedFromId` + `amendmentReason` + `isAmended` added explicitly.
- **implementation-plan Sprint 6 S6-D5-T2** "writes PDF to `/storage/invoices/`" → "renders in-memory, streams via `/invoices/[id].pdf`".
- **runbook §3 secrets** — `INVOICE_URL_SECRET` added (defaults to `SESSION_SECRET` when unset; production should set its own).

**Doc-side propagation (done in the Sprint 6 close-out commit):**
- `docs/PRD.md` §5 Feature 7 Storage line updated + change-log row appended.
- `docs/architecture.md` §5.8 `Invoice` entity updated; §8 integration notes add the signed-URL surface.
- `docs/implementation-plan.md` Sprint 6 Day-4/Day-5 amended to point at this ADR.
- `docs/inventory-ops-guide.md` §5 documents the lifecycle for ops staff.

---

## ADR-035: Inventory global low-stock threshold default — 5 units
Date: 2026-04-21 (Sprint 6 kickoff)
Status: Accepted · Closes PRD Open Question #12

**Context:** PRD Open Question #12 asked the owner for a default low-stock threshold. No value had been set through Sprints 1–5. Sprint 6 S6-D2-T3 (dashboard widget) and S6-D3-T1 (daily digest) both need a fallback when a per-SKU override isn't set.

**Decision:** Global default = **5 units**, editable via `/admin/settings/inventory`. Per-SKU overrides set on the product's inventory page win when present; otherwise the global default applies.

**Rationale:** 5 matches small-shop ops norms: a toner cartridge order cycle is typically a couple of days in Egypt, so ~5 days of ordinary sell-through is a humane reorder signal. Easy to retune without a release — it's a `Setting` row.

**Consequences:**
- Per-SKU overrides can be set on any product where 5 is wrong (bulk paper SKUs benefit from 10+; slow-moving spare parts benefit from 2).
- PRD Open Question #12 closed.

---

## ADR-036: Stock reservation race-guard — conditional `updateMany` inside createOrder transaction
Date: 2026-04-21 (Sprint 6 S6-D7-T2)
Status: Accepted

**Context:** Sprint 4's `createOrderAction` checked `availableQty >= cart qty` *before* opening the DB transaction, then unconditionally decremented `Inventory.currentQty`. Two concurrent checkouts for the last unit both passed the pre-check and both decremented, producing `currentQty = -1`. Discovered during Sprint 6 hardening (S6-D7-T2).

**Decision:** Inside the transaction, replace the unconditional `inventory.update({ decrement })` with a conditional `updateMany({ where: { productId, currentQty: { gte: qty } }, data: { decrement } })`. Prisma returns `count` of affected rows. When `count === 0` we raced — throw `'cart.insufficient_stock'`, which the outer `try/catch` converts to a user-facing error (`ok: false, errorKey: 'cart.insufficient_stock'`) and the transaction rolls back (Order row, reservations, inventory deltas all undone).

**Alternatives considered:**
- **`SELECT ... FOR UPDATE` + re-check inside txn** — same correctness, more round-trips; conditional update is atomic in one SQL.
- **Serializable isolation level** — heavier hammer; conditional update is enough for this specific race.
- **Redis-backed reservation lock** — rejected per ADR-010 (no Redis on the app stack).

**Consequences:**
- `Inventory.currentQty` is now guaranteed `>= 0` by the write path. Previously protected by convention, now protected by SQL.
- No schema change.
- A live concurrency test needs Postgres; for MVP it's validated in staging under manual load + the typecheck/build gate. Promoted to CI when the nightly staging suite is wired.

---

## ADR-037: Storefront catalog pages render dynamically — drop ISR for per-viewer pricing

**Date:** 2026-04-21 (Sprint 7 S7-D3-T1)

**Status:** Accepted

**Context:**
- Sprint 7 introduces B2B tier pricing that must render per-viewer on catalog surfaces (`/products`, `/categories/[slug]`, `/search`, `/products/[slug]`). A Tier-A (10% off) buyer and a Tier-B (15% off) buyer looking at the same SKU must see different prices on the same page.
- Pre-Sprint-7 the catalog pages used `export const revalidate = 300` — 5-minute ISR caching at the edge — so every visitor saw the same bytes.
- ISR is a *shared* cache keyed on path + search params only. It can't fork by session cookie, so "B2B viewer sees a different price" is fundamentally incompatible with a 5-minute ISR window.

**Decision:**
- Flip the affected catalog pages to `export const dynamic = 'force-dynamic'` so every request renders fresh against the DB with the viewer's pricing context.
- Keep per-query caching via `React.cache` (`getPricingContextForUser`) so N components on the same render pass only fetch the context once.
- Cloudflare edge cache is tuned to bypass `/api/*` already (per ADR-024 page rules); Next's ISR was the only cache layer touching HTML, and that's what we're dropping here.

**Alternatives considered:**
- **Split routes — public `/products` (cached) + gated `/b2b/products` (dynamic).** Rejected: splits the catalog UX, confuses SEO, and doubles the maintenance surface.
- **Client-side price overlay** — server-render list prices, then hydrate B2B-specific prices via a small client fetch. Rejected: flashes the wrong price on first paint, complicates the tests, and fights the SSR-for-SEO baseline.
- **Per-session cache key** — would need a cache layer we don't have (Redis rejected per ADR-010). Too much new infra for a tradeoff that evaporates at our scale.

**Consequences:**
- Every catalog request now hits Postgres. Expected at MVP scale (100–500 daily visitors); `EXPLAIN ANALYZE` on the hot queries is clean on the 200-SKU fixture.
- B2C / guest viewers lose the ISR speedup. Mitigated by Cloudflare's edge HTML cache (where applicable), Postgres warm cache, and the existing response-size budget.
- B2B viewers finally see the prices they should see — the correctness win justifies the perf cost.
- D7-T3 acceptance ("catalog load with B2B user <500ms p95") holds locally on the 200-SKU fixture. Staging will re-verify once Sprint 7 deploys.
- Re-litigate later if MVP traffic jumps into the thousands/day and the Postgres load becomes the bottleneck. Migration path: page-level edge cache with `Vary: Cookie` once Cloudflare's higher-tier surface allows it, or move to a cache layer that can key per-session.

---

## ADR-038: B2B application rejection is soft — never create a User row pre-approval

**Date:** 2026-04-21 (Sprint 7 kickoff)

**Status:** Accepted

**Context:**
- `User.email` is `@unique` in Prisma. If we create a User at signup time for B2B applicants, a rejected applicant's email is permanently bound to an inactive User row.
- The plan's S7-D5-T1 acceptance calls for "CR# and email re-usable for re-application" so applicants can fix whatever the rejection flagged and resubmit cleanly.
- Two designs were considered at kickoff — Design A (soft) and Design B (hard).

**Decision:**
- **Design A — soft reject.** `B2BApplication` is the system-of-record up to approval. No `User` or `Company` rows exist until the admin approves. On rejection, the application is marked `REJECTED` with a reason and an email goes out; email + CR# remain free for a fresh application.
- Approval is the atomic moment where User + Company get created in a single DB transaction, at which point the applicant's email is locked down to that User row.

**Alternatives considered:**
- **Design B — hard reject.** Create a User + `B2BApplication` at signup time; rejection marks the User inactive. Rejected because: (a) permanently locks the email, (b) needs a cleanup path for "delete inactive users X days old", (c) makes "apply again after fixing the tax card scan" unnecessarily painful.

**Consequences:**
- The applicant's bcrypt-hashed password has to live on `B2BApplication` (carried forward to User on approval). That's a sensitive column — mitigated by: only Owner/Sales Rep can read applications via admin role gating, the hash is bcrypt cost 12 (same as User), no logging / UI ever renders it.
- Rejected applications accumulate in the DB. At the scale we expect (applications/month), this is noise-level; pruning old rejected rows is a v1.1 housekeeping task if needed.
- If an applicant browses + places B2C orders under the same email *before* approval, the approval flow upgrades their existing B2C User row to B2B (preserving order history) rather than colliding on the unique email constraint. This branch is wired in `approveB2BApplicationAction`.

---

## ADR-039: B2B order = B2B User's Company — `Order.companyId` is the authoritative linkage

**Date:** 2026-04-21 (Sprint 7 S7-D4-T3)

**Status:** Accepted

**Context:**
- Sprint 7 needed "company-wide order history" visible to any user logged in to the company (shared-login per ADR-007).
- Order was linked to the placing `User` (`Order.userId`) but had no direct link to Company — making company-wide history a join through `User → Company.primaryUser`, which is fragile (what if we rotate primary users in v1.1 multi-user mode?).

**Decision:**
- Add `Order.companyId` (nullable, indexed). `createOrderAction` sets this whenever the placing user is the primary user of an ACTIVE Company. Null for B2C orders and for B2B users whose company is SUSPENDED at placement time.
- Also set `Order.type = 'B2B'` in the same condition — this was the field the Sprint 5 notification pipeline was already branching on; Sprint 7 just makes sure it's populated correctly.
- Query company-wide order history via `Order.companyId` (stable), not `Order.user.companyOwned.id` (fragile).

**Alternatives considered:**
- **Join through primary user** — works in MVP (single login per company), breaks the moment v1.1 adds multi-user-per-company. Rejected.
- **No direct link; filter by primaryUser on read** — same problem, and adds a join to every history query.

**Consequences:**
- Order history queries stay a single indexed lookup: `WHERE companyId = $1`.
- Forward-compatible with v1.1 multi-user teams — a second User under the same Company places an order, `companyId` is set consistently, history shows both.
- One more nullable FK to maintain; trivial migration since `null` is the correct value for all existing (B2C-only) orders.

---

## ADR-040: `placedByName` required only on Submit-for-Review, optional on B2B Pay Now

**Date:** 2026-04-22 (Sprint 8 S8-D1-T1)

**Status:** Accepted

**Context:**
- Plan S8-D1-T1 says "checkout for B2B users requires this free-text field"; PRD Feature 4 says "mandatory at B2B checkout."
- At kickoff the founder said "I want the payment process to be as standard as B2C." Mandatory placed_by on B2B Pay Now adds friction that the B2C path doesn't have.

**Decision:**
- `Order.placedByName String?` — nullable.
- **B2B Submit-for-Review**: required server-side (rejects on empty), client-marked with a red asterisk.
- **B2B Pay Now**: optional input; if filled, surfaces on invoice + order-history rows + admin detail exactly like SFR orders.
- **B2C + guest**: field never rendered; server action ignores it if sent.

**Alternatives considered:**
- **Always required on B2B** — explicit per PRD but adds friction to Pay Now. Rejected.
- **Never required** — loses the audit value for SFR. Rejected.

**Consequences:**
- PRD Feature 4 "mandatory at B2B checkout" is softened per this ADR. PRD will be amended at Sprint 9 kickoff.
- Invoice template omits the line when null (already supported).
- Sales reps confirming SFR orders always see `placedByName` — closes team-level attribution for the high-value path.

---

## ADR-041: `Order.paymentMethodNote` free-text field instead of expanding `PaymentMethod` enum

**Date:** 2026-04-22 (Sprint 8 S8-D2-T2)

**Status:** Accepted

**Context:**
- Plan S8-D2-T2 says the sales rep "sets payment method" on confirm (dropdown: PO, transfer, etc.).
- Options: (a) keep `PaymentMethod.SUBMIT_FOR_REVIEW` + add a free-text `Order.paymentMethodNote`, or (b) expand the enum with `BANK_TRANSFER`, `PURCHASE_ORDER`, likely more (`CHEQUE`, `CREDIT_LINE`, ...).

**Decision:**
- Go with (a). Added `Order.paymentMethodNote String?`. Captured in the dedicated B2B Confirm panel; surfaces on invoice, admin order detail, customer order page, rep-confirm WhatsApp/email bodies.

**Alternatives considered:**
- **(b) Enum expansion** — cleaner for filtering/metrics but forces a schema migration + UI dropdown update for every new arrangement. The long tail of B2B payment arrangements is genuinely long.

**Consequences:**
- No structured "orders paid via PO vs bank transfer" report. If needed later, parse/classify `paymentMethodNote` into a derived column.
- `PaymentMethod.SUBMIT_FOR_REVIEW` means "payment lives outside Paymob/COD" rather than "awaiting rep." The status transition PENDING_CONFIRMATION → CONFIRMED signals "payment agreed."
- Invoice uses the existing enum label for "method" + prints `paymentMethodNote` as a second "Note" line.
- Easy to reverse: can normalize common notes into an enum later and keep the column as the human-readable detail.

---

## ADR-042: Sales rep fan-out (OWNER + SALES_REP list) instead of per-Company assigned rep

**Date:** 2026-04-22 (Sprint 8 S8-D1-T3)

**Status:** Accepted

**Context:**
- New SFR orders need a sales-rep alert. Options: (a) every OWNER + SALES_REP admin with a populated email, (b) a single "assigned rep" field on Company + route to them.

**Decision:**
- Go with (a). Reuses the Sprint 6 low-stock digest pattern. One `send-email` job per recipient so a single bounced mailbox doesn't drop the fan-out.
- Deferred "assigned rep" to v1.1 per PRD. When it lands: if assigned, notify that user; else fall back to fan-out.

**Consequences:**
- At MVP scale (<5 reps) the fan-out is fine. At scale it'll get noisy — that's when v1.1 lands.
- Recipient list is `prisma.user.findMany({ type: 'ADMIN', status: 'ACTIVE', adminRole: { in: ['OWNER', 'SALES_REP'] }, email: { not: null } })`. A rep removed from the admin roster stops getting alerts immediately.
- Recipient locale honoured (`User.languagePref`); email renderer has AR + EN variants.

---

## ADR-043: Reorder re-resolves prices at re-add time (not historical snapshot)

**Date:** 2026-04-22 (Sprint 8 S8-D5-T1)

**Status:** Accepted

**Context:**
- PRD Feature 4 says reorder "adds available items at current prices." Reading (a) historical snapshot from `OrderItem.unitPriceEgp`, reading (b) today's resolved price.

**Decision:**
- Go with (b). `reorderAction` calls `resolvePrice(product, ctx)` for every line. CartItem snapshot gets the current final price.

**Consequences:**
- Reorder preview modal surfaces today's prices so the customer can see what they're getting before confirm.
- Archived products flagged as "archived / unavailable" — can't be re-added, shown for reference.
- If a per-SKU override was deleted since the original order, the customer pays the current resolved price (likely tier-default). This is correct — overrides represent current negotiated arrangements, not historical ones.

---

## ADR-044: Dedicated `confirmB2BOrderAction` instead of widening `updateOrderStatusAction`

**Date:** 2026-04-22 (Sprint 8 S8-D2-T2)

**Status:** Accepted

**Context:**
- Sprint 5's `updateOrderStatusAction` is the OPS canonical path for every status transition. Gated OWNER+OPS. Sprint 8's B2B Confirm is functionally a PENDING_CONFIRMATION → CONFIRMED transition but needs: SALES_REP access, `paymentMethodNote` capture, dedicated Whats360 renderer, invoice generation.
- Options: (a) widen `updateOrderStatusAction` to accept SALES_REP + optional paymentMethodNote + B2B-specific renderer branch, or (b) add a parallel `confirmB2BOrderAction` + hide the generic Confirm button via `hiddenTransitions` prop.

**Decision:**
- Go with (b). Kept `updateOrderStatusAction` focused on OPS' lifecycle; added `confirmB2BOrderAction` for the sales-rep path. UI hides the generic Confirm for B2B+PENDING_CONFIRMATION orders.

**Consequences:**
- Some duplication in notification + invoice dispatch. Acceptable — diverges meaningfully (dedicated Whats360 renderer, unconditional invoice send).
- Cancellations from PENDING_CONFIRMATION still go through `updateOrderStatusAction` (correct inventory release path). `confirmB2BOrderAction` never handles cancellation.
- Admin order detail page gate widened to `['OWNER', 'OPS', 'SALES_REP']`; per-action authz remains server-side enforced.

---

## ADR-045: Shipping-zone + COD-fee + promo-discount stored on `Order` as snapshot columns

**Date:** 2026-04-22 (Sprint 9 S9-D1-T1 / S9-D3-T1 / S9-D5-T1)

**Status:** Accepted

**Context:**
- Sprint 9 introduces `ShippingZone` (5 rows) and `Setting` rows for COD policy + VAT + free-shipping thresholds. These are all admin-editable at any time, so a resolved price at order-placement time is effectively a lookup-result that can drift from "current values" a week later.
- Orders already snapshot `subtotalEgp / shippingEgp / discountEgp / vatEgp / totalEgp`. Sprint 9 adds `codFeeEgp` + `promoCodeId` (FK with `onDelete: SetNull`).
- Alternative would be computing each part on-the-fly from a snapshotted `{zoneCode, codPolicy, vatRate, promoDiscountPercent}` JSON blob and re-rendering totals in the invoice template.

**Decision:**
- Store every EGP amount as its own column on `Order`. Invoice template + customer-facing views read the columns directly; nothing recomputes.
- `promoCodeId` is a scalar FK (not a JSON snapshot) so admin can run `orders WHERE promo_code_id = X` for usage reporting. `onDelete: SetNull` means deleting a promo code in admin doesn't cascade-break historical orders.

**Consequences:**
- Six EGP columns on `Order` now: `subtotalEgp / shippingEgp / codFeeEgp / discountEgp / vatEgp / totalEgp`. Invoice template shows each on its own line when > 0.
- Changing the COD fee or VAT rate in admin affects new orders only. Past orders keep their original amounts.
- Shipping address is already snapshotted via `addressSnapshot` JSON — zone name isn't stored separately because it's derivable from `addressSnapshot.governorate` + the (live) GovernorateZone table, and admin reshuffling governorates mid-flight is rare + recoverable via AuditLog.

---

## ADR-046: Race-safe promo-code consumption mirrors ADR-036 inventory pattern

**Date:** 2026-04-22 (Sprint 9 S9-D5-T3)

**Status:** Accepted

**Context:**
- PromoCode has `usageLimit` (optional total cap) and `usedCount`. Concurrent checkout attempts must not allow `usedCount > usageLimit`. Naïve `findUnique → compare → update` introduces a TOCTOU race — two callers both see `usedCount = 99` against `usageLimit = 100`, both bump to 100, one should have failed.
- Sprint 6 (ADR-036) solved the same shape for inventory decrement using a conditional `updateMany` + `count === 0` rollback.

**Decision:**
- `tryConsumePromoCode(tx, id)` issues `prisma.promoCode.updateMany({ where: { id, usedCount: { lt: usageLimit } }, data: { usedCount: { increment: 1 } } })`. If `hit.count === 0`, we raced another order to the last slot — throw `'promo.usage_limit_reached'` and let the order-creation transaction roll back.
- Unlimited codes (usageLimit = null) skip the guard since they never exhaust.
- Called inside `$transaction` so a rollback undoes both the increment and the partial order.

**Consequences:**
- Matches the mental model already established by ADR-036 — one pattern for "conditional atomic increment/decrement with race-safe rollback" across the codebase.
- A mid-flight exhaust returns the user to the checkout form with `'promo.usage_limit_reached'` — they can retry without the code.
- Preview action (`applyPromoCodeAction`) does NOT consume — purely read-only validation. Real consumption is inside the order transaction.

---

## ADR-047: Courier CRUD stays at `/admin/couriers`; Settings hub surfaces it

**Date:** 2026-04-22 (Sprint 9 S9-D4-T3)

**Status:** Accepted

**Context:**
- Sprint 9 plan calls for `/admin/settings/couriers` as part of the admin settings panel. Sprint 5 built the existing CRUD at `/admin/couriers` + three sub-pages (`new`, `[id]`) + nav link.
- Two options: (a) move the three pages under `/admin/settings/couriers/*` + add a redirect; (b) keep them put and add a card to the settings hub that links there.

**Decision:**
- (b). The URL surface is already bookmarked + linked from `components/admin/admin-nav.tsx`. Adding a hub card preserves those bookmarks and surfaces the page from the correct mental location without moving files.

**Consequences:**
- PRD / plan reference to `/admin/settings/couriers` is satisfied by the hub card. A future URL reorg can redirect `/admin/couriers → /admin/settings/couriers` cleanly; no callers today require it.
- Nav still has the top-level "Couriers" link (handy for ops team). Settings hub also lists it (handy for owner configuring everything in one place).

---

## ADR-048: Brand logo stored as a single re-encoded WebP under `/storage/brand/`

**Date:** 2026-04-22 (Sprint 9 S9-D6-T1)

**Status:** Accepted

**Context:**
- PRD §5 Feature 7 requires a company logo on every invoice. Existing image pipeline (`lib/storage/images.ts`) handles product images → 3 sizes (thumb/medium/original). A logo is simpler: one size, tiny (≤ 400px), referenced by filename in `StoreInfo.logoFilename`.
- Alternative: store the logo as a binary blob in a Setting row. Rejected — `Setting.value` is JSON; base64'd logo would bloat request/response and complicate CDN caching.

**Decision:**
- Add `lib/storage/brand.ts::processBrandLogo(buffer)` — sharp re-encode to WebP, long edge ≤ 400px, written to `{STORAGE_ROOT}/brand/logo-{uuid}.webp`. Filename stored in `Setting store.info.logoFilename` (ADR-034 pattern).
- Served by Nginx at `/storage/brand/<filename>.webp` (same path rule as product images, now `safeResolveStoragePath` allows `brand/` subtree).
- UUID-in-filename is cache-busting by design: the admin sees the new logo on invoices immediately even behind Cloudflare Free's edge cache.
- Old logo file is best-effort deleted on replacement; failure is non-fatal (leaves orphan bytes until a future cleanup).

**Consequences:**
- `safeResolveStoragePath` now accepts `products/` OR `brand/`. No new auth gate — brand logo is public (as required by invoice rendering + public storefront header).
- Logo upload uses FormData + Server Action (same pattern as product images).
- Disk cost: ~15 KB per upload × a few uploads ever. Negligible.

---

## ADR-049: Close Sprint 4 parking-lot — Paymob webhook now fires the order-confirmation email on PAID

**Date:** 2026-04-22 (Sprint 9 parking-lot closure)

**Status:** Accepted

**Context:**
- Sprint 4 added `enqueueOrderConfirmationEmail` but only called it from `createOrderAction` for COD. Paymob card customers never received the "thanks for your order" email. Invoice PDF was sent (Sprint 6), but it was the only communication, which feels abrupt.
- Parking-lot item tracked from Sprint 4 through Sprints 5 / 6 / 7 / 8. Sprint 9 is the first sprint to touch the Paymob webhook (adding `codFeeEgp` readback for invoice totals).

**Decision:**
- Add a best-effort call from the Paymob webhook's success branch: read the Order's snapshotted totals, enqueue `enqueueOrderConfirmationEmail` with the Paymob payment method label. Webhook still returns 200 on enqueue failure so Paymob doesn't retry-storm us.

**Consequences:**
- Paymob card customers now see (a) confirmation email, (b) invoice PDF, (c) order status page — same surface as COD.
- Duplicate email risk is minimal: the webhook only fires on successful PAID transition, and the webhook is idempotent (`paymobTransactionId` unique + duplicate-check short-circuit).
- Parking-lot item closed. Future Paymob dev stub / sandbox runs that don't emit a webhook still leave the customer without this email — acceptable for dev mode.


---

## ADR-050: Centralize admin role matrix in lib/admin/role-matrix.ts

**Date:** 2026-04-22 (Sprint 10 S10-D1-T1)

**Status:** Accepted

**Context:**
- 46 admin files (pages + Server Actions) call `requireAdmin(allowedRoles)` with per-role arrays hardcoded inline. The discipline was kept but the matrix lived nowhere — no single place to read "what can Ops do?".
- Dashboard widget visibility was also ad-hoc: the Sprint 5 home mixed role checks inline with rendering.

**Decision:**
- `lib/admin/role-matrix.ts` exports two typed constants: `ROLE_MATRIX` (keys map to readonly `AdminRole[]`, one per admin area) and `DASHBOARD_WIDGETS` (per-widget visibility). Helpers: `canAct(role, key)` + `canSeeWidget(role, key)`.
- No behavior change — existing `requireAdmin(...)` calls stay as-is. New code can import from the matrix. Dashboard rewrite uses `DASHBOARD_WIDGETS`.

**Consequences:**
- Single source of truth for "what can X role do". New pages/actions can import instead of hardcoding.
- Owner-facing admin guide (docs/admin-guide.md) describes the matrix in plain English.

---

## ADR-051: AdminInvite flow = 48h hashed single-use token, recipient sets own password

**Date:** 2026-04-22 (Sprint 10 S10-D1-T3)

**Status:** Accepted

**Context:**
- OWNER needs to onboard new admins (Ops, Sales Rep, or additional Owners). Either OWNER creates user + sets password + emails credentials (password-in-email risk), or OWNER invites + recipient sets own password (mirrors password-reset flow).
- `AdminInvite` model already existed in Prisma schema (since Sprint 1) but unused.

**Decision:**
- OWNER submits email + role via `/admin/users/new`. Server generates a 32-byte random token, SHA-256-hashes it into `AdminInvite.tokenHash`, sets `expiresAt = now + 48h`, emails a bilingual link. On click, `/admin/invite/accept?token=...` verifies + shows a set-password form. Submit creates `User(type=ADMIN, adminRole=invite.role)` with bcrypt password + starts a session.
- Actions: inviteAdmin / revokeAdminInvite / resendAdminInvite (rotates token) / acceptAdminInvite / updateAdminRole / deactivateAdmin / reactivateAdmin.
- Guards: cannot invite an existing email; cannot modify self; last Owner cannot be demoted (prevents lockout); cannot deactivate self.

**Consequences:**
- Passwords never travel over email or through the admin UI.
- 48h expiry balances "forgot to check email" vs link-longevity risk. Revoke + resend give OWNER recovery options.

---

## ADR-052: Return policy = 4-field Setting + per-product Returnable flag; override requires reason

**Date:** 2026-04-22 (Sprint 10 S10-D2-T3 + kickoff scope extension)

**Status:** Accepted

**Context:**
- Sprint 5 shipped the return-recording mechanics. No centralized policy existed: ops could record a return for a 3-year-old order.
- Owner requested at Sprint 10 kickoff: return window, min order value, global on/off, per-product opt-out, and role-based override. Folded in as top priority.

**Decision:**
- JSON-valued Setting key `returns.policy` with 4 fields: `enabled`, `windowDays` (max days after delivery), `minOrderEgp` (optional floor), `overrideRoles` (array of admin roles allowed to bypass). Default: enabled / 14 days / null / all 3 roles.
- New Prisma fields: `Product.returnable` (bool, default `true`) + `Return.policyOverride` (bool, default `false`) + `Return.overrideReason` (nullable string) + `Return.stockReleasedAt` (nullable DateTime for idempotent release — ADR-053).
- `checkReturnPolicy(policy, ctx)` in lib/returns/policy.ts returns `{ ok: true }` or a discriminated failure shape. `canOverrideReturnPolicy(policy, role)` gates the override UI.
- `recordReturnAction` enforces: fail + policyFailure payload by default; override requires role membership + non-empty reason (audit-logged).

**Consequences:**
- Clear product-facing story: policy lives in Settings, visible to OWNER, audit-traceable.
- Stock-release is now automatic on refund approval (ADR-053) — removes a manual step.
- Schema migration required (3 field additions) — non-breaking on existing rows (defaults).

---

## ADR-053: Pre-confirmation order line edit — qty-reduce + line-remove on COD-only; PAID routes via Returns

**Date:** 2026-04-22 (Sprint 10 S10-D7-T1)

**Status:** Accepted

**Context:**
- Customer-initiated quantity adjustments between order placement and courier handoff are common (B2C may realize they ordered 2 instead of 1). Before Sprint 10, the only answer was "cancel + re-place."
- For PAID Paymob orders, partial refunds need explicit tracking (finance, accounting, Paymob dashboard) — direct line edit would silently reduce the collected total with no refund record.

**Decision:**
- Allow line edits only when `order.status === CONFIRMED` AND `order.paymentStatus != PAID` (COD, not yet handed to courier). Supported: qty-reduce (new qty strictly less than current) and line-remove (qty = 0).
- PAID orders are locked: admin UI hides the edit control; server rejects with `order.edit.paid_locked`. Post-payment changes route through the Return flow.
- Qty-increase never supported (would require re-reserving stock + re-validating promo-code min-order).
- On edit: update/delete OrderItem, restore inventory via `InventoryMovement(type=ADJUST)`, recompute subtotal/vat/total from remaining items (shipping/discount/COD-fee stay as snapshotted at checkout), emit OrderStatusEvent + AuditLog.

**Consequences:**
- Predictable, auditable small-scale order corrections; ops handle "take 1 off" calls without full cancel-and-re-place.
- PAID Paymob edge cases funneled through Returns — clean finance/audit trail.
- Discount/promo constraints not re-validated — acceptable because we never make the order cheaper per unit, only remove units.

---

## ADR-054: Sales-trend dashboard chart = hand-rolled SVG sparkline (no Recharts)

**Date:** 2026-04-22 (Sprint 10 S10-D4-T3)

**Status:** Accepted

**Context:**
- Implementation plan called for Recharts. Recharts + D3 adds ~60KB min-gzip to the admin bundle. The trend chart is one simple line (30 daily points).
- Owner preference: minimum-vendor stack.

**Decision:**
- Ship the 30-day trend as hand-rolled SVG in components/admin/sales-trend-chart.tsx — ~120 lines, zero deps beyond React. Quartile gridlines, line path, filled area, terminal-point dots.

**Consequences:**
- Admin bundle stays small.
- When a second chart type is needed (pie, bar, stacked), re-evaluate: adopt Recharts if volume grows. Today, YAGNI.
- The SVG has no tooltips — acceptable for an at-a-glance widget; richer analytics land in v1.1 reporting.

---

## ADR-055: CSP enforced but lenient for Next.js 15 hydration
Date: 2026-04-23
Status: Accepted

**Context:** PRD §8 + architecture §9.5 required a Content-Security-Policy header. A strict nonce-based CSP (`'strict-dynamic'` + per-request nonces) is ideal but requires middleware that generates + propagates a nonce through every Next.js App Router render — a meaningful refactor for Sprint 11 production-readiness work when the primary XSS vectors (external-origin script injection, `<script src=>` attacks, iframe exfiltration) are already blocked by a lenient policy.

**Decision:** Ship an enforced but permissive CSP with `script-src 'self' 'unsafe-inline' 'unsafe-eval'`, `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`, `frame-src 'self' https://accept.paymob.com`, `upgrade-insecure-requests` in [next.config.mjs](../next.config.mjs). COOP `same-origin-allow-popups`, CORP `same-site`, X-Permitted-Cross-Domain-Policies `none` alongside.

**Alternatives considered:**
- Report-Only CSP first — rejected; Sprint 11 is the production-readiness pass, enforcing > observing is the whole point.
- Full nonce-based strict-dynamic — rejected for Sprint 11 scope; parked for post-M1 polish pass.
- No CSP at all — rejected; the PRD committed to it.

**Consequences:**
- XSS-via-inline-script attack surface remains — acceptable given React escapes user content by default + `dangerouslySetInnerHTML` is lint-enforced off for user content.
- Paymob iframe works (explicit allow-list).
- Post-M1 parking lot: tighten to nonce-based strict-dynamic.

---

## ADR-056: Production env sanity as a fail-fast boot assertion
Date: 2026-04-23
Status: Accepted

**Context:** A bad production deploy where `OTP_DEV_MODE=true` or `NOTIFICATIONS_DEV_MODE=true` slips into `.env.production` would leak real OTPs to the response body + log real WhatsApp messages as no-ops — both silent failures that customers would notice before operators do.

**Decision:** New [lib/env-check.ts](../lib/env-check.ts) exports `assertProductionEnv()` which throws on boot if `NODE_ENV=production` AND any of the dangerous flags (`OTP_DEV_MODE`, `NOTIFICATIONS_DEV_MODE`, `WHATS360_SANDBOX`) = `true`, or any of the required secrets (`DATABASE_URL`, `APP_URL`, `PAYMOB_API_KEY`, `PAYMOB_HMAC_SECRET`, `PAYMOB_INTEGRATION_ID_CARD`, `WHATS360_TOKEN`, `WHATS360_INSTANCE_ID`, `WHATS360_WEBHOOK_SECRET`) are missing. Wired via Next.js 15 [instrumentation.ts](../instrumentation.ts) `register()` hook, nodejs runtime only.

**Escape hatch:** `SKIP_ENV_CHECK=true` disables the assertion for emergency boots where one secret is temporarily missing and the operator knows what they're doing. Should never bake into `.env.production`.

**Alternatives considered:**
- Runtime per-request check — rejected; doesn't stop the boot, and the first request already leaks a real OTP.
- Build-time check — rejected; env is set per-container at run-time, not build-time.
- Static lint rule — rejected; can't catch runtime environment-variable misconfigurations.

**Consequences:**
- A container with a dev-flag enabled in production will fail to start, surfacing the misconfiguration loudly at deploy time rather than silently at request time.
- `env_check.failed` appears in container logs with the full list of issues, so the operator fixes all of them in one pass.

---

## ADR-057: WhatsApp customer opt-out keyed by phone, OTP sends bypass
Date: 2026-04-23
Status: Accepted

**Context:** Sprint 11 S11-D6-T3 required honoring `STOP`-style keywords from customers who want to unsubscribe from automated WhatsApp notifications. Two design questions: (a) what to key off — `User` or phone? (b) should OTP sends respect the opt-out?

**Decision:**
- Dedicated `NotificationOptOut` table keyed by phone (E.164 without '+', e.g. `201012345678`) per [prisma/schema.prisma](../prisma/schema.prisma).
- Keywords: `STOP`, `UNSUBSCRIBE`, `إلغاء`, `الغاء`, `ايقاف`, `إيقاف`, `الغاء الاشتراك`. Equality match after trim + upper-case — does NOT match STOP embedded in a longer message.
- `send-whatsapp` worker gates before dispatch: opted-out rows marked FAILED with errorMessage='opted_out', no Whats360 call.
- **OTP sends bypass the opt-out** — `issueOtp` calls `sendWhatsApp` directly (not via the worker queue), so authentication still works for opted-out users.
- Admin + support can record opt-outs on behalf of a customer via the new `OptOutSource` enum (WHATSAPP_KEYWORD / ADMIN / SUPPORT).

**Alternatives considered:**
- Key by User.id — rejected; guests + shared-login B2B accounts both have phones but may not have User rows.
- Block OTP sends too — rejected; locks out authentication permanently if a customer ever STOPs, which is worse UX + security than letting them sign in.
- Detect STOP embedded in a sentence — rejected; false-positives far outweigh false-negatives (users who type "please don't stop my order" don't want to be opted out).

**Consequences:**
- Privacy policy §10 + cookies §1 can honestly state "you can opt out via STOP".
- If a user who STOP'd later needs to receive an order confirmation, they won't — that's a customer-chosen trade-off. Admin can `clearOptOut()` via DB if the customer calls support to re-subscribe.
- If the same phone later belongs to a different human (phone number recycling), the opt-out persists — acceptable at MVP scale; consider a timestamp-based auto-expiry post-MVP.

---

## ADR-058: Late Paymob PAID webhook on CANCELLED order → audit flag + skip side-effects
Date: 2026-04-23
Status: Accepted

**Context:** Sprint 11 S11-D8-T3 webhook reliability audit found that a late-arriving `PAID` Paymob webhook on an order the customer had already cancelled would: (a) flip `paymentStatus` to PAID, (b) generate + send an invoice PDF, (c) send an order-confirmation email — all while the order itself stays in CANCELLED. This creates a phantom confirmation to a customer who thinks their order is cancelled + an invoice in the accounting record for an order that was never fulfilled + a VAT-audit surprise.

**Decision:** In [app/api/webhooks/paymob/route.ts](../app/api/webhooks/paymob/route.ts), detect `order.status === 'CANCELLED'` at the PAID branch. When true:
- Still flip `paymentStatus` to PAID (the money did move, so ops needs to reconcile the refund — recording it as PENDING would lose that fact).
- Record `OrderStatusEvent` with note "Payment captured AFTER cancellation — MANUAL REFUND REQUIRED".
- Record `AuditLog` with action `order.payment.paid_after_cancel`.
- **Skip** invoice generation + confirmation email.
- Return `{ ok: true, needsRefund: true }` so Paymob stops retrying.

**Alternatives considered:**
- Un-cancel the order + fulfill — rejected; customer doesn't expect delivery, ops would ship to a customer who didn't consent.
- Refund via Paymob API automatically — rejected; Paymob refund API requires live merchant approval + config we haven't tested. Manual refund is safer at MVP.
- Record + fire invoice + email anyway — rejected; phantom email + VAT-audit breakage (this was the pre-fix behavior).

**Consequences:**
- Ops has a queryable audit action to find these cases: `SELECT * FROM "AuditLog" WHERE action = 'order.payment.paid_after_cancel';`
- Customer doesn't get a phantom confirmation.
- Refund is manual — requires adding ops process to the admin runbook post-M1. Parking-lot: automated Paymob refund API + auto-REFUNDED status in v1.1.

---

## ADR-059: UI direction v2 — pure-white body + ink shell + structural familiarity from Egyptian retail
Date: 2026-04-23
Status: Accepted
Supersedes: ADR-031 (foundation pass direction — cream canvas, minimal header/footer, Apple-Store restraint)

**Context:** Sprint 11 UI refiner pass post-dev-track, pre-production-deploy. Owner reviewed the Sprint 1 foundation (ADR-031) against two reference sites — **RayaShop** (dominant Egyptian consumer electronics retailer) and **Applinz** (mid-tier Egyptian electronics retailer) — and asked for two shifts:

1. **Cream/beige palette → pure white.** Canvas `#FAFAF7` + Paper `#F3F1EC` felt hospitality-warm; printer + supplies is a utilitarian/technical domain where clinical-clean reads more trustworthy.
2. **Header + footer structural polish.** Raya's shell (bold-colored primary bar, prominent central search, category-nav strip, dense trust-laden footer with payment logos + social + newsletter) is instantly familiar to Egyptian shoppers. The Sprint 1 foundation had a quieter single-bar header + a paper-tinted 4-column footer that didn't carry the same trust weight.

**Tension with ADR-031.** The foundation pass was deliberately differentiated from Raya/Noon/2B, rejecting their warm-loud-dense aesthetic. Pure 1:1 mimicry of Raya would dissolve that differentiation and make PBF look like a weak Raya clone.

**Decision:** **"Clean technical retail — familiar scaffold, PBF skin."** Adopt the structural grammar of Raya/Applinz (two-bar header with prominent central search, category nav strip, trust-laden footer) but keep PBF's own identity (ink + ink-cyan accent; no Raya-blue, no Raya-yellow; neutral grays not warm tints).

**Token changes** (in [app/globals.css](../app/globals.css)):
| Token | Before (ADR-031) | After (ADR-059) |
|---|---|---|
| `--canvas` | `#FAFAF7` warm off-white | `#FFFFFF` pure white |
| `--paper` | `#F3F1EC` warm cream | `#F7F7F7` neutral off-white |
| `--paper-hover` | `#EBE8E0` warm | `#F0F0F0` neutral |
| `--border` | `#E5E2DA` warm | `#E5E5E5` neutral |
| `--border-strong` | `#8F8A7D` warm | `#808080` neutral |
| `--muted-fg` | `#6B6B6B` | `#666666` (AA 5.7:1 on white) |

**Preserved from ADR-031:** ink `#0F172A` + ink-2 `#1F2937`, accent cyan `#0E7C86` + strong `#0A6B74` + soft `#E6F3F4`, semantic success/warning/error tokens, typography (IBM Plex Sans Arabic + Inter), spacing, radii, shadows, motion.

**Shell redesign:**

- **Header two-bar structure.** Bar 1 is solid `bg-ink` containing: logo (start) + full-width HeaderSearch with prominent accent-cyan submit button (center desktop / own row on mobile) + actions cluster (end) containing LanguageSwitcher (dark variant, new), cart link, account/sign-in link, and mobile hamburger (end-side). Bar 2 is a white `border-b` strip with a horizontal category-nav (desktop only) + a "Register your business" B2B CTA on the end.
- **Footer solid-ink.** 4-column grid: brand/contact (logo + tagline + WhatsApp+email+address + 4 social icons), Shop, Account, Newsletter (placeholder with disabled submit + "قريباً — v1.1" copy). Below the grid: payment-method pills (Visa/Mastercard/Meeza/Fawry/COD). Separate copyright strip in `bg-ink-2`. **5 broken links removed** (/help, /shipping, /returns, /contact, /account/orders — pending v1.1 pages).
- **MobileNav** hamburger moved from start-side to end-side per Raya/Noon convention; panel slides from end; width reduced to 80% max-320px for better context retention.
- **HeaderSearch** gained a prominent accent-cyan submit button via built-in `<button type="submit">`, matching Raya's yellow button pattern but in PBF brand color.
- **LanguageSwitcher** gained a `variant="dark"` prop so it reads correctly on the ink header.
- **CookieConsent** repositioned: tighter mobile width (inset-x-3), docks to `end-4` on desktop instead of centered, cleaner on 375px alongside the WhatsApp chat button.
- **CSP** allow-listed `https://static.cloudflareinsights.com` in `script-src` and `cloudflareinsights.com + *.cloudflareinsights.com` in `connect-src` so Cloudflare Web Analytics beacon stops violating CSP (was a side effect of ADR-055's enforced CSP).

**Alternatives considered:**
- **Copy Raya blue + yellow 1:1** — rejected. Brand mimicry = weak differentiation; RayaShop is the strongest brand in the adjacent retail category, cloning it positions PBF as a knockoff rather than a specialist.
- **Keep the cream canvas, polish only structure** — rejected. The cream reads hospitality, not technical; owner explicitly pushed for pure white, and the warmth was already in tension with the "trustworthy + technical" direction.
- **Stay ADR-031** — rejected. The foundation pass shipped before any real shopper feedback; a mid-pre-launch refinement toward stronger trust-signalling is appropriate, and the differentiation-via-accent (cyan not yellow) preserves the ADR-031 intent while moving the structural grammar closer to what Egyptian B2C + B2B buyers expect.
- **Invoke `frontend-design` for full palette re-derivation** — rejected as overkill. The shift is a re-application of existing PBF tokens (ink + cyan) to a new structural grammar; no new tokens needed, just neutralization of the warm tints.

**Consequences:**
- **Tier 2 screens** (products list/detail, search, cart/checkout, account, auth) inherit the new tokens automatically via `bg-background`/`bg-paper`/`bg-card` → they render correctly on first deploy without per-page edits. Per-screen polish (hero treatment, empty states, spacing rhythm) still pending; tracked as Tier 2 follow-up.
- **Tier 3 admin surfaces** (PRD §8 best-effort) inherit tokens too; no action needed for M1.
- The "Don'ts" list in design-system.md needs two updates: the warm-accent prohibition stays (Raya-yellow still rejected); a new rule adds "no bright blue primary" to prevent drift toward Raya-blue if someone reads the structural inspiration too literally.
- The canvas contrast on shimmer-skeleton animation narrows slightly (#F7F7F7 → #F0F0F0 instead of the prior #F3F1EC → #EBE8E0) — barely perceptible, but if the skeleton loses visibility under load-testing, widen the stop values.
- Ops verification: CSP header on `/ar` now includes `https://static.cloudflareinsights.com` in script-src — confirm with `curl -I https://staging.printbyfalcon.com/ar | grep -i content-security-policy` after redeploy.

---

## ADR-061: Admin shell rewrite — ink topbar + grouped icon sidebar + mobile drawer + chrome separation

**Date:** 2026-04-26
**Status:** Accepted (UI polish pass, post-PR #37)
**Context:** Owner asked for "ضبط الـlayout بتاع الـdashboard وصفحات الـadmin كلها." Audit surfaced four structural problems with the existing admin shell:
1. The storefront `<SiteHeader>` + `<SiteFooter>` + floating WhatsApp + cookie banner from `[locale]/layout.tsx` were rendering on top of every admin page, producing **two stacked headers** and irrelevant chrome (WhatsApp button, cookie banner) on internal tools.
2. The admin sidebar was `hidden md:block` with **no mobile equivalent** — admin was unreachable on a phone.
3. The 15 nav links sat in a flat list with no icons, no active state, and no grouping.
4. The header didn't share the storefront's ink-shell language (it used the bare `<container>` Tailwind class on a light surface), so the admin felt visually disowned from the rest of the site.

**Decision:**
- **Chrome separation via path detection.** `[locale]/layout.tsx` reads `x-pathname` (set by middleware) and skips storefront chrome on `/ar/admin/*` + `/en/admin/*`. Considered route groups (`(storefront)/` + `(admin)/`) but rejected as too disruptive for the scope — would require moving 17 folders. The path-detection branch is 5 lines and reversible.
- **Admin topbar = ink shell.** Sticky `bg-ink text-canvas` bar matching the storefront's bar 1, with `BrandMark` + admin label on the start side and language-switcher (dark variant) + email + logout + mobile-nav trigger on the end side. Brings admin under the same brand language as the storefront without merging the two layouts.
- **Sidebar = grouped + iconned + active-state.** Nav data lives in `lib/admin/nav-config.ts` as pure data (icon names, not JSX) so the same payload travels server → client. `<AdminSideNav>` (client) renders the desktop list with `usePathname()` driving an active state (`bg-accent-soft text-accent-strong`). `<AdminMobileNav>` (client) reuses the same data inside a slide-from-end drawer that mirrors the storefront's `MobileNav` pattern (80% width, max 320px, `end-0`, slide-in-end animation, body-scroll-locked while open, auto-close on route change).
- **Six groups instead of one flat list:** Dashboard (no heading, lead) / Catalog / Orders & Inventory / Customers / Business (B2B) / Administration. Each group is filtered by role server-side; empty groups are dropped before render.
- **`LogoutButton` `topbar` variant updated** from light-surface to ink-surface colors (`text-canvas` + `hover:bg-canvas/10` + offset focus ring).
- **`<main>` discipline.** The admin layout no longer wraps children in `<main>` — pages keep their own `<main className="container-page …">` so we don't nest `<main>` elements and pages stay independently styleable.

**Alternatives considered:**
- **Route groups (`app/[locale]/(storefront)/` + `(admin)/`).** Rejected for this pass — the structural payoff is the same as path detection (one layout per surface), and the migration cost (renaming/moving 17 storefront folders + special handling for `error.tsx` / `loading.tsx` / `not-found.tsx`) is too large for the benefit. If we add a third surface (e.g., a customer-portal shell distinct from storefront), revisit.
- **Always-visible mobile sidebar (no drawer).** Rejected — the admin nav is 15 items deep, a sticky vertical bar would eat the entire viewport height on mobile.
- **Render the storefront chrome on admin and just style around it.** Rejected — the WhatsApp floating button and cookie banner are storefront-shopper UI, irrelevant to internal admin work; rendering them is noise.
- **Pass icon components directly through nav-config.** Rejected — would force the data file to be a server component, can't serialize Lucide components for client consumption. Pure-data + a tiny `AdminNavIcon` mapper keeps the config trivially testable.

**Consequences:**
- All 50 admin routes inherit the new shell automatically — only the 4 pages that didn't use `container-page` (`unauthorized`, `invite/accept`, `products/[id]`, `b2b/companies/[id]`) needed inline edits to wrap themselves consistently.
- All admin tables already had `overflow-x-auto rounded-md border` wrappers from prior passes — no further table sweep needed in this pass.
- Per-page `<AdminPageHeader>` adoption is still spotty (5/50 pages use it; 45 still roll inline `<header>` patterns). Tracked as a separate Tier 3 follow-up — mechanical migration, no design risk.
- Mobile-card alternative for data tables remains deferred (real design work, not layout).
- Middleware now sets `x-pathname` on every request — minor request-header overhead, negligible.

---

## ADR-062: User-portal + product layout pass — shared `PortalTabs`, `(portal)` route group for B2B, structural cleanup

**Date:** 2026-04-26
**Status:** Accepted (UI polish pass after admin shell rebuild — ADR-061)
**Context:** Owner asked to fix the layout of B2C account, B2B portal, and product pages. Audit surfaced four kinds of issue:
1. **No persistent navigation between user-portal sections.** B2C `/account/*` (Overview + Addresses) and B2B `/b2b/profile|orders|bulk-order` were each siloed pages — to hop sections the user had to go back through the site header. The B2B profile page tried to compensate with a six-link "Account actions" strip at the bottom, half of which were already navigable from the storefront chrome.
2. **Structural drift on a few B2B pages.** `/b2b/forgot-password`, `/b2b/reset-password`, `/b2b/orders` used the bare Tailwind `container` (not the project's `container-page` utility), `<div>` instead of `<main>`, and skipped the standard overline + bold-h1 + subtitle header pattern the rest of the site uses.
3. **Defensive layout gaps in the product detail page.** The specs `<dl>` used `grid-cols-[1fr_2fr]` without a `minmax(0,1fr)` floor, so a long unbreakable spec value could push the section past viewport on narrow viewports — same root cause as the checkout overflow fixed in ADR-060/PR #37.
4. **Bulk order table couldn't scroll horizontally on mobile.** The wrapper used `overflow-visible` (because of the autocomplete dropdown's positioning), which combined with `body { overflow-x: clip }` meant rightmost columns were silently CLIPPED on narrow viewports — the user could neither see them nor scroll to them.

**Decision:**
- **New `<PortalTabs>` (client) at [components/portal-tabs.tsx](../components/portal-tabs.tsx).** Generic horizontal tabs nav with `usePathname()` active state (locale prefix stripped) and horizontal-scroll fallback for narrow viewports. Used by both portals so account and B2B share one visual language.
- **B2C account shell.** New [app/[locale]/account/layout.tsx](../app/[locale]/account/layout.tsx) wraps every `/account/*` page with two tabs (Overview · Addresses). Pages keep their own `<main>`.
- **B2B portal shell via route group.** Moved `/b2b/profile`, `/b2b/orders`, `/b2b/bulk-order` into `app/[locale]/b2b/(portal)/` so the new `(portal)/layout.tsx` can wrap only the signed-in portal pages without bleeding portal nav onto auth surfaces (login, register, forgot-password, reset-password). Three tabs: Company profile · Company orders · Bulk order. The B2B profile page's six-link "Account actions" strip slimmed to two essential cross-portal links (manage addresses + sign out) since the tabs cover the rest.
- **Standardized 3 B2B pages.** `/b2b/forgot-password`, `/b2b/reset-password`, `/b2b/orders` now use `container-page` and `<main>`; `/b2b/orders` gains the project's standard overline + h1 + subtitle header.
- **PDP specs grid hardened.** `grid-cols-[minmax(0,1fr)_minmax(0,2fr)]` lets both columns shrink below min-content; both cells gain `break-words`. Same defensive pattern as PR #37's checkout grid fix.
- **Bulk order table fix.** Wrapper changed to `overflow-x-auto` + table gains `min-w-[640px]` so the table scrolls sideways on mobile instead of clipping. Trade-off: the autocomplete dropdown on the LAST row could be vertically clipped (it's `position: absolute` and the wrapper is now a clipping context). Accepted because the alternative — silently hiding the rightmost columns — is worse, and the dropdown clipping only affects the last row's autocomplete in a 50-row-cap form.

**Alternatives considered:**
- **Add the portal nav inline on every page instead of a layout.** Rejected — duplicates the same JSX in three (B2B) and two (B2C) pages; misses the next page someone adds. Layouts are the right tool.
- **Don't use a route group; just guard the layout with a pathname check.** Rejected — route groups are the documented Next.js pattern for "shared layout for some sibling routes, not all"; pathname guards add runtime cost and split logic from structure.
- **Portal the bulk-order autocomplete dropdown to `<body>` so it escapes the wrapper's overflow.** Right long-term, but a real refactor (Radix Popover or react-portal); not in scope for this polish pass. Filed as a follow-up.

**Consequences:**
- All 5 `/account/*` and `/b2b/{profile,orders,bulk-order}` pages now share a consistent navigation shell — adding a new sub-page only needs to update the tab list in one of the two layout files.
- Route-group rename (`/b2b/profile` → `/b2b/(portal)/profile`, etc.) is a tracked move in git; the URL shape doesn't change so no incoming links break.
- Bulk-order autocomplete dropdown vertical clipping on the LAST row is a known minor UX issue; a follow-up PR can portal the dropdown to fix it.
- A separate pre-existing bug surfaced during the audit: B2B's first-time-login flow redirects to `/account/change-password` which doesn't exist (404). Out of scope for layout polish — flagged in the progress entry.
