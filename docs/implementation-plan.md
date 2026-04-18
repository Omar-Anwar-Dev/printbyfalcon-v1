# Print By Falcon — Implementation Plan

## Overview

- **Team:** 3 developers, full-time, ready Day 1
- **Sprint cadence:** 2 weeks (10 working days, Mon–Fri)
- **Total sprints:** 12 main sprints + 2-week launch buffer
- **Assumed start date:** Monday **2026-04-20**
- **Hard deadline (M1 production launch):** **2026-10-18** (6 months from project kickoff)
- **Working week assumption:** Monday–Friday. Push back if your team uses Sun–Thu (Egypt standard); the dates would shift accordingly.
- **Holiday-aware sprints:**
  - **S1:** Fri May 1 = Labor Day → 9 working days
  - **S3:** Likely **Eid al-Adha ≈ May 26–30** → ~6–7 working days (reduced scope or push to S4)
  - **S7:** Thu Jul 23 = Revolution Day → 9 working days
  - **Buffer:** Oct 6 = Armed Forces Day (already in buffer window)
- **Devs labeled D1 / D2 / D3** for clarity. Roles cross over as needed; D1 leans frontend/UI, D2 leans backend/infrastructure, D3 leans integration/cross-cutting.

---

## Release Milestone Mapping

| Milestone | Target | Definition of Done | Sprint mapping |
|---|---|---|---|
| **M0 — Internal demo** | End of **Sprint 4** (~Fri 2026-06-12) | B2C end-to-end flow working on staging with Paymob test mode, basic admin orders panel, catalog browse | S1–S4 |
| **M1 — Production launch (closed beta)** | End of **Sprint 12** (~Fri 2026-10-02) | All 9 MVP features acceptance-criteria-met. Live merchant accounts. WhatsApp templates approved. 5 friendly B2C testers + 3 friendly B2B companies onboarded. Real orders processed. | S5–S12 |
| **M2 — Public launch** | ~Fri 2026-11-06 (4 weeks after M1) | Open registration; marketing campaign begins; success metrics tracked from this date forward. | Outside MVP |

---

## Sprint 1 — Foundation
**Dates:** 2026-04-20 → 2026-05-01 (9 working days; Fri May 1 = Labor Day)
**Goal:** Repo, infrastructure, auth scaffolding, monitoring, and external integration applications all kicked off.
**Demo at sprint end:** "Hello world" running on staging via HTTPS; B2B login + B2C OTP-dev-mode flow visible; monitoring dashboards live; Paymob merchant application submitted; WhatsApp templates submitted to Meta. *(Fawry application removed per ADR-022.)*

### Day 1 (Mon Apr 20)
- **S1-D1-T1** [S] (D1) Initialize Next.js 15 project (App Router, TypeScript, Tailwind, ESLint, Prettier, husky pre-commit). *Acceptance:* `npm run dev` works locally. *Risk:* low.
- **S1-D1-T2** [S] (D2) Provision Hostinger KVM2 VPS: install Docker + Docker Compose, configure UFW firewall (allow 22/80/443 only), create deploy user. *Acceptance:* SSH access works, Docker version prints. *Risk:* low.
- **S1-D1-T3** [S] (D3) Submit **Paymob merchant application** with: commercial registry, tax card, bank account details, owner ID, business website description. *Acceptance:* application ID received. *Risk:* HIGH (1–3 week external lead time — critical path). *(Fawry application removed per ADR-022.)*
- **S1-D1-T4** [XS] (Owner — non-dev) Confirm + provide: final domain name, sales team's existing WhatsApp number (for support bridge), commitment to procure NEW WhatsApp business phone number this sprint.

### Day 2 (Tue Apr 21)
- **S1-D2-T1** [M] (D1) Set up Prisma; initial schema with `User`, `Session`, `Setting`, `RateLimit`, `AuditLog` tables; first migration. *Acceptance:* `prisma migrate dev` succeeds; entities visible in Prisma Studio. *Dep:* T1.
- **S1-D2-T2** [M] (D2) Postgres 16 in Docker on VPS, tuned for 1 GB RAM allocation (`shared_buffers=256MB`, `effective_cache_size=512MB`). Nginx + Certbot reverse proxy. *Acceptance:* `psql` connects from VPS; Let's Encrypt cert issued. *Dep:* T2.
- **S1-D2-T3** [M] (D3) Procure new WhatsApp Business phone number; create Meta Business Account; enable WhatsApp Cloud API; verify business. *Acceptance:* test API call (`/me`) returns 200. *Risk:* medium — Meta verification can take 24h–7 days.

### Day 3 (Wed Apr 22)
- **S1-D3-T1** [M] (D1) Set up Auth.js (NextAuth v5) with **Credentials** provider for B2B (email + bcrypt). *Acceptance:* test seeded admin can log in via local API call.
- **S1-D3-T2** [L] (D2) Docker Compose stack for **production** AND **staging** on the same VPS: Next.js (prod + staging), Postgres (prod + staging), Nginx config with separate server blocks, env file separation (`.env.production`, `.env.staging`). *Acceptance:* both stacks start; `staging.<domain>` and main domain resolve correctly. *Dep:* T2 (D2).
- **S1-D3-T3** [L] (D3) Submit **WhatsApp message templates** to Meta for approval: `auth_otp_ar`, `order_confirmed_ar`, `order_status_change_ar`, `b2b_pending_review_ar`, `payment_failed_ar` (5 templates). *Acceptance:* all 5 in "Pending review". *Risk:* HIGH (3–5 business day approval — critical path for Sprint 5).

### Day 4 (Thu Apr 23)
- **S1-D4-T1** [M] (D1) GitHub Actions CI: lint + typecheck + unit tests on PR; on merge to `main`, build + deploy to staging via SSH. *Acceptance:* test PR triggers CI; merge deploys to staging. *Dep:* T1, T2 (D2).
- **S1-D4-T2** [M] (D2) GlitchTip self-hosted (separate Docker container, shares Postgres). Integrate Sentry SDK into Next.js + worker (skeleton). *Acceptance:* test exception in dev appears in GlitchTip UI. *Dep:* T2 (D2).
- **S1-D4-T3** [M] (D3) i18n setup with **next-intl**: locales `ar` (default) + `en`, route prefixes `/ar/...` `/en/...`, language switcher component, message catalogs scaffold (`messages/ar.json`, `messages/en.json`). *Acceptance:* both locales render a "hello" page correctly. *Dep:* T1.

### Day 5 (Fri Apr 24)
- **S1-D5-T1** [M] (D1) Auth.js **custom WhatsApp OTP provider** (skeleton): generates OTP, hashes + stores in `WhatsAppOtp` table, in dev mode logs OTP to console (real send wired up after template approval). *Acceptance:* dev-mode flow logs an OTP and verifies it. *Dep:* D3-T1.
- **S1-D5-T2** [M] (D2) UptimeRobot configured against `/api/health`; Netdata installed on VPS; firewall hardening review. *Acceptance:* uptime check pings; Netdata dashboard accessible (admin-only basic auth).
- **S1-D5-T3** [M] (D3) Tailwind + shadcn/ui base setup with RTL configuration via logical properties (`ps-`/`pe-` etc). First base components: `Button`, `Input`, `Card`, `Dialog`. *Acceptance:* components render correctly in both AR (RTL) and EN (LTR). *Dep:* T3 (D4).

(Sat Apr 25, Sun Apr 26 — weekend)

### Day 6 (Mon Apr 27)
- **S1-D6-T1** [M] (D1) Session middleware: load session from cookie, attach `user` to request context. Cookie: `HttpOnly`, `Secure`, `SameSite=Lax`, 30-day rolling expiry, refreshed on each request. Logout endpoint invalidates the session row. *Acceptance:* session persists across page loads; logout clears it. *Dep:* D3-T1.
- **S1-D6-T2** [L] (D2) Nightly `pg_dump` cron + 14-day rotation script on VPS (`/backups/pbf-{env}-{date}.sql.gz`). **Test full restore** to a fresh DB. *Acceptance:* backup file created last night; restore drill succeeds. *Risk:* medium (must validate restore works, not just dump).
- **S1-D6-T3** [M] (D3) Pino structured JSON logging in Next.js + worker; log rotation config via Docker; PII redaction patterns (passwords, OTP codes, tokens, full card numbers). *Acceptance:* logs rotate daily; no PII in sample logs.

### Day 7 (Tue Apr 28)
- **S1-D7-T1** [M] (D1) Rate-limit DB-backed sliding-window helper (`RateLimit` table). Apply to: OTP request endpoint (3/phone/30min), B2B login (5/email/15min), password reset (3/email/1h). *Acceptance:* 4th OTP request in 30min returns 429.
- ~~**S1-D7-T2** Verify Hostinger CDN~~ — **resolved 2026-04-19, ADR-023**: CDN unavailable on KVM2; MVP ships without CDN. No follow-up task.
- **S1-D7-T3** [L] (D3) Public layout shell: header (logo, search bar placeholder, language switcher, account dropdown, cart icon), responsive breakpoints (`sm`/`md`/`lg`/`xl`), footer. Cairo font for AR, Inter for EN, preloaded via `next/font`. *Acceptance:* renders correctly at 320px, 768px, 1024px, 1440px in both languages. *Dep:* D5-T3.

### Day 8 (Wed Apr 29)
- **S1-D8-T1** [M] (D1) **Login page** for B2B (email + password, with i18n + RTL). **B2C "Sign In" page** (phone entry → OTP entry — uses dev mode for now). *Acceptance:* manual flows work end-to-end in dev mode. *Dep:* D6-T1, D5-T1.
- **S1-D8-T2** [M] (D2) Worker process scaffold: pg-boss queue setup with shared Postgres, sample heartbeat job runs every 60s, worker container in Docker stack alongside the app. *Acceptance:* worker logs heartbeat in production stack. *Dep:* D2-T2.
- **S1-D8-T3** [M] (D3) zod validation library setup; first schemas (auth payloads, common phone/email/name validators); error message i18n mapping (zod issue codes → AR/EN strings). *Acceptance:* invalid inputs produce localized error messages.

### Day 9 (Thu Apr 30)
- **S1-D9-T1** [M] (D1) Admin login page + role-gating middleware on `/admin/*` (redirect to `/admin/login` if unauthenticated). Seed first **Owner** admin user via migration with temp password (Owner provides via Open Question #7). *Acceptance:* unauthenticated `/admin` redirects; Owner can log in.
- **S1-D9-T2** [M] (D2) Hostinger SMTP integration via nodemailer (worker job `send-email`). Test transactional email with simple template. *Acceptance:* test email arrives in inbox.
- **S1-D9-T3** [S] (D3) Documentation: `README.md` for dev environment setup, Docker Compose commands cheat sheet, env variable list. *Acceptance:* a fresh dev can clone + start the project in <30 minutes following the README.

(Fri May 1 — Labor Day, off)

### Sprint 1 Exit Criteria
- ✅ Both staging and production stacks deployable via single Docker Compose command
- ✅ Auth.js B2B email/password flow + B2C OTP dev-mode flow working
- ✅ CI runs lint + typecheck + tests on PRs; merges deploy to staging
- ✅ HTTPS via Let's Encrypt; "hello world" + auth shells reachable at staging URL
- ✅ GlitchTip captures errors; UptimeRobot pings; Netdata dashboard live
- ✅ Nightly pg_dump runs; restore drill verified
- ✅ WhatsApp templates submitted (in Meta review queue)
- ✅ Paymob merchant application submitted (Fawry dropped per ADR-022)
- ✅ All 3 devs onboarded; local dev environments running

---

## Sprint 2 — Catalog Foundation
**Dates:** 2026-05-04 → 2026-05-15 (10 working days)
**Goal:** Catalog data model, bilingual product pages rendered via SSR, image upload pipeline, admin product CRUD with 50 test SKUs seeded.
**Demo at sprint end:** Browse 50 test products bilingually; view detailed product pages; admin can create/edit/archive products and upload images.

### Day 1 (Mon May 4)
- **S2-D1-T1** [M] (D1) Prisma schema: `Brand`, `Category`, `Product` (with bilingual columns: `name_ar`, `name_en`, `description_ar`, `description_en`, `specs_jsonb`, `base_price_egp`, `vat_exempt`, `authenticity` enum, `status`), migrations. *Acceptance:* migration runs; entities visible.
- **S2-D1-T2** [M] (D2) Storage filesystem layout: `/storage/products/{product_id}/{size}-{filename}`. Nginx config to serve `/storage/...` with appropriate cache headers. *Acceptance:* test image served via HTTPS with `Cache-Control: max-age=31536000, immutable`.
- **S2-D1-T3** [M] (D3) `sharp` image processing pipeline: on upload, generate `thumb-` (200px), `medium-` (800px), `original-` (max 1600px) all in WebP. Original delete after processing. *Acceptance:* test upload produces 3 sized files.

### Day 2 (Tue May 5)
- **S2-D2-T1** [L] (D1) Admin product CRUD pages (list, create, edit, archive) at `/admin/products`. Form: bilingual fields, brand select, category select, base price, VAT exempt toggle, authenticity radio. *Acceptance:* admin can create + edit + archive a product. *Dep:* D1-T1.
- **S2-D2-T2** [M] (D2) Prisma schema: `ProductImage` (product_id, filename, position, alt_ar, alt_en) + admin endpoints to upload + reorder + delete images. *Acceptance:* admin can attach 5 images to a product, reorder them. *Dep:* D1-T3.
- **S2-D2-T3** [M] (D3) Admin: `Brand` and `Category` CRUD pages (bilingual fields, slug auto-generated). *Acceptance:* CRUD works.

### Day 3 (Wed May 6)
- **S2-D3-T1** [L] (D1) Public product **listing page** at `/(storefront)/products` (paginated grid, 20/page, sort dropdown). SSR-rendered. *Acceptance:* page lists all active products with images, names, prices in both locales.
- **S2-D3-T2** [L] (D2) Public **product detail page** at `/(storefront)/products/[slug]` (SSR). Layout: gallery, title, description, specs, price, stock placeholder, add-to-cart button (placeholder), related products placeholder. *Acceptance:* renders correctly with full bilingual content.
- **S2-D3-T3** [M] (D3) Category browsing UI: `/(storefront)/categories/[slug]` filters products to that category. *Acceptance:* category page filters correctly.

### Day 4 (Thu May 7)
- **S2-D4-T1** [M] (D1) Product card component (reused on listing, search results, related products). Skeleton loading state. *Acceptance:* card renders with correct AR/EN.
- **S2-D4-T2** [M] (D2) `next/image` configuration for storage URLs; lazy loading; WebP serving with fallback. *Acceptance:* Lighthouse image score >90.
- **S2-D4-T3** [M] (D3) Admin: bulk image upload UI (drag-drop multiple files for one product, auto-process via `sharp`). *Acceptance:* uploading 5 images at once works.

### Day 5 (Fri May 8)
- **S2-D5-T1** [M] (D1) Mobile-responsive product detail page: image swipe gallery (touch + mouse), sticky add-to-cart on mobile. *Acceptance:* tested on Chrome DevTools mobile mode at 320px, 375px, 414px.
- **S2-D5-T2** [M] (D2) Prisma schema: `PrinterModel` (brand, model, slug). Admin CRUD for printer models. *Acceptance:* CRUD works.
- **S2-D5-T3** [M] (D3) Prisma schema: `ProductCompatibility` (printer_model_id ↔ product_id many-to-many). Admin UI on product edit page to assign compatible printer models (multi-select). *Acceptance:* assignments save and display.

(Weekend)

### Day 6 (Mon May 11)
- **S2-D6-T1** [M] (D1) Public product detail page: show "Compatible printers" section (lists `PrinterModel`s linked to this product). *Acceptance:* compatible printers visible on consumable products. *Dep:* D5-T3.
- **S2-D6-T2** [M] (D2) Catalog data import script (CSV → DB) for seeding 50 test SKUs. *Acceptance:* `npm run seed:catalog -- test.csv` populates 50 products with images. *Dep:* D2-T1, D2-T2.
- **S2-D6-T3** [M] (D3) Admin: product list with filters (status, brand, category, authenticity) + search by SKU/name. *Acceptance:* filters and search work.

### Day 7 (Tue May 12)
- **S2-D7-T1** [M] (D1) Storefront category navigation menu (header dropdown showing top-level categories). *Acceptance:* menu renders + navigates correctly.
- **S2-D7-T2** [M] (D2) Sitemap generation at `/sitemap.xml` (products + categories, both locales). *Acceptance:* `curl /sitemap.xml` returns valid sitemap with all active products. *Dep:* D3-T1.
- **S2-D7-T3** [M] (D3) Product schema markup (`schema.org/Product`) on product detail page for SEO. *Acceptance:* Google Rich Results Test passes.

### Day 8 (Wed May 13)
- **S2-D8-T1** [M] (D1) Robots.txt at `/robots.txt`. Meta tags (`og:title`, `og:image`, `og:description`, canonical URLs). *Acceptance:* OpenGraph preview correctly in social-link debugger.
- **S2-D8-T2** [M] (D2) Catalog seed data team coordination: define CSV format, share template with data team, kick off SKU + image collection for the full 500–2000 catalog. *Acceptance:* template shared; data team has timeline. *Risk:* HIGH — this is the project's biggest non-dev risk.
- **S2-D8-T3** [M] (D3) Bilingual switching UX: language toggle persists in cookie + URL; switching works on every page. *Acceptance:* switching from `/ar/products/x` goes to `/en/products/x`.

### Day 9 (Thu May 14)
- **S2-D9-T1** [M] (D1) E2E test setup with Playwright; first tests: browse products, view detail, switch language. *Acceptance:* tests run in CI.
- **S2-D9-T2** [M] (D2) Performance pass on listing + detail pages: query optimization, index review, image loading. *Acceptance:* Lighthouse Performance >85 on 3G mobile profile.
- **S2-D9-T3** [M] (D3) Accessibility pass: ARIA labels on interactive elements, semantic HTML, keyboard navigation, color contrast audit. *Acceptance:* axe-core scan reports zero serious issues.

### Day 10 (Fri May 15)
- **S2-D10-T1** [M] (D1) Bug fixes from internal QA (catch obvious issues before sprint demo). *Acceptance:* QA punch list cleared.
- **S2-D10-T2** [M] (D2) Update production stack with sprint deliverables; run smoke tests. *Acceptance:* staging mirrors latest code; manual smoke passes.
- **S2-D10-T3** [S] (D3) Sprint demo prep + retrospective notes. *Acceptance:* demo script runnable end-to-end.

### Sprint 2 Exit Criteria
- ✅ 50 test SKUs visible on storefront with bilingual content + images
- ✅ Product detail pages SSR-rendered with full content + compatibility list
- ✅ Admin CRUD works for products, brands, categories, printer models, compatibility
- ✅ Image upload pipeline works (3 sizes auto-generated, WebP)
- ✅ Sitemap + robots + schema markup live
- ✅ E2E tests in CI; Lighthouse Performance >85
- ✅ Catalog seeding effort kicked off with data team

---

## Sprint 3 — Smart Search + Catalog Polish
**Dates:** 2026-05-18 → 2026-05-29 (likely **6–7 working days** due to Eid al-Adha ≈ May 26–30; verify dates with Owner)
**Goal:** Postgres full-text search across bilingual content; printer-model cross-reference; full filter suite; out-of-stock display; mobile polish.
**Demo at sprint end:** searchable, filterable catalog at 200+ test SKUs; printer-model search returns correct compatibles.

> **Risk note:** Eid al-Adha holidays will cut this sprint short. **Plan reduced scope** OR push the 3 less-critical tasks (D8/D9/D10) to Sprint 4 buffer. Do not commit to all 10 days.

### Day 1 (Mon May 18)
- **S3-D1-T1** [L] (D1) Postgres full-text search: add `search_vector tsvector` column to `Product`, GIN index, trigger to auto-update on insert/update. Combine `name_ar + name_en + description_ar + description_en + sku + brand_name` into the vector with appropriate weights. *Acceptance:* `EXPLAIN` shows GIN index used; sample query returns ranked results.
- **S3-D1-T2** [M] (D2) Search input component in header (autocomplete dropdown showing top 5 results live). *Acceptance:* typing returns instant suggestions.
- **S3-D1-T3** [M] (D3) Search results page at `/(storefront)/search?q=...` with pagination + filters sidebar. *Acceptance:* page renders results with score-based relevance.

### Day 2 (Tue May 19)
- **S3-D2-T1** [L] (D1) Filter UI: brand multi-select, category multi-select, authenticity (Genuine/Compatible), price range slider, in-stock-only toggle. URL-based filter state (shareable links). *Acceptance:* filters URL-encode and re-decode correctly.
- **S3-D2-T2** [M] (D2) Backend: filter query implementation with Prisma (combined with FTS). *Acceptance:* query performance <500ms p95 for typical filter combinations.
- **S3-D2-T3** [M] (D3) **Printer-model search:** entering a printer model name redirects to a results view showing compatible consumables, sorted by relevance. *Acceptance:* searching "HP LaserJet M404" returns toner CF259A et al. *Dep:* S2-D5-T3.

### Day 3 (Wed May 20)
- **S3-D3-T1** [M] (D1) Sort options: Relevance / Price ascending / Price descending / Newest. Persist sort in URL state. *Acceptance:* sort changes results order.
- **S3-D3-T2** [M] (D2) Empty state UI for no results (helpful suggestions: try fewer filters, search by printer model, contact us). *Acceptance:* renders gracefully on empty results.
- **S3-D3-T3** [M] (D3) Stock status indicator on product cards (placeholder — real stock from S6): "In Stock" / "Low Stock" / "Out of Stock" badges. *Acceptance:* badges render with sample data.

### Day 4 (Thu May 21)
- **S3-D4-T1** [M] (D1) Out-of-stock display on product detail: hide "Add to Cart", show badge, keep page accessible (preserves SEO). *Acceptance:* OOS product detail page renders correctly.
- **S3-D4-T2** [M] (D2) Search performance audit: GIN index analysis, query plan review, ensure <500ms p95. *Acceptance:* `EXPLAIN ANALYZE` confirms index use; load test simulates 10 concurrent searches.
- **S3-D4-T3** [M] (D3) Mobile filter UX: full-screen filter modal on mobile (avoids cramped sidebar). *Acceptance:* filter modal works on 375px screen.

### Day 5 (Fri May 22)
- **S3-D5-T1** [M] (D1) "Compatible printers" section on consumable detail page is clickable: each printer leads to a list of all consumables for that printer. *Acceptance:* navigation works both directions.
- **S3-D5-T2** [M] (D2) Catalog seed: import 200 SKUs from data team (assuming they have at least that many ready). *Acceptance:* 200 products live with images. *Dep:* data team progress.
- **S3-D5-T3** [M] (D3) Admin: improved product list with filters + search + bulk archive action. *Acceptance:* admin can find and bulk-archive products.

(Weekend)

### Day 6 (Mon May 25) — *last day before likely Eid holiday*
- **S3-D6-T1** [M] (D1) Bug fixes from internal QA (search edge cases, RTL bugs in filter UI, mobile layout issues). *Acceptance:* QA punch list cleared.
- **S3-D6-T2** [M] (D2) Storefront performance pass: lazy-load below-the-fold images, code-split heavy components. *Acceptance:* Lighthouse Performance >90 on 3G.
- **S3-D6-T3** [M] (D3) E2E tests for search + filters. *Acceptance:* tests in CI.

### Days 7–10 (Tue May 26 – Fri May 29) — *contingency for Eid holiday*
- If team works through, schedule:
  - **S3-D7-T1** [M] Sprint demo prep + buffer for catch-up
  - **S3-D7-T2** [M] Pre-stage Sprint 4 setup (B2C account flows scaffold)
- **If Eid takes 4 days off,** these tasks slip to Sprint 4 D1.

### Sprint 3 Exit Criteria
- ✅ Full-text search works in both languages, returns results <500ms p95
- ✅ All filters work (brand, type, compatibility, authenticity, price, stock)
- ✅ Printer-model cross-reference search returns compatible consumables
- ✅ Out-of-stock UX shows badge, preserves SEO
- ✅ 200+ SKUs live on storefront
- ✅ Mobile filter UX polished
- ✅ Search + filters covered by E2E tests

---

## Sprint 4 — B2C Accounts + Cart + Checkout + Paymob → **M0**
**Dates:** 2026-06-01 → 2026-06-12 (10 working days)
**Goal:** Full B2C registration via WhatsApp OTP, guest checkout, cart with stock reservation, Paymob test-mode integration, end-to-end order placement. **M0 milestone delivered at end of sprint.**
**Demo at sprint end:** End-to-end B2C order placement on staging with Paymob test card; order created in DB; confirmation page shown.

### Day 1 (Mon Jun 1)
- **S4-D1-T1** [M] (D1) Verify WhatsApp OTP template `auth_otp_ar` is **approved by Meta** (should be by now); wire up live sending via Cloud API in `requestB2COtp` Server Action. *Acceptance:* real OTP arrives on test phone via WhatsApp. *Risk:* HIGH — if not approved, escalate to Meta support.
- **S4-D1-T2** [L] (D2) Prisma schema: `Address` (owner_user_id or owner_company_id, governorate enum, city, area, street, building, apartment, notes, is_default). *Acceptance:* migration runs.
- **S4-D1-T3** [M] (D3) B2C **registration flow** UI: phone entry → OTP entry → name + (optional) email → account created. Localized error states. *Acceptance:* user can register end-to-end. *Dep:* T1.

### Day 2 (Tue Jun 2)
- **S4-D2-T1** [L] (D1) **Cart** Prisma schema: `Cart`, `CartItem`. Server Actions: `addToCart`, `updateCartItem`, `removeFromCart`. Session-based for guests, user-based for logged-in. *Acceptance:* server actions work via dev console.
- **S4-D2-T2** [M] (D2) `Address` Server Actions (`addAddress`, `updateAddress`, `deleteAddress`, `setDefaultAddress`) + `/account/addresses` UI. *Acceptance:* user can manage up to 5 addresses.
- **S4-D2-T3** [M] (D3) Cart UI: drawer-style on desktop, full page on mobile. Quantity controls, remove, subtotal display. *Acceptance:* drawer opens with current cart; mutations work. *Dep:* T1.

### Day 3 (Wed Jun 3)
- **S4-D3-T1** [L] (D1) **Stock soft reservation** logic on `addToCart`: insert `InventoryReservation` (type=cart, expires_at = now + 15min). Worker job `cleanup-expired-cart-reservations` runs every 5 min (pg-boss). *Acceptance:* old reservations are cleaned up; available qty reflects holds. *Dep:* D1-T2 (which creates Inventory ahead in S6 — but here we'll add a placeholder Inventory table just for cart logic; full inventory features come in S6).
- **S4-D3-T2** [M] (D2) Prisma schema: minimal `Inventory` table (`product_id PK`, `current_qty`) — full inventory features in S6 but we need this for cart/checkout. Seed `current_qty=100` for all 200 test products. *Acceptance:* products have stock; can be reserved/released.
- **S4-D3-T3** [M] (D3) `/checkout` page: SSR with cart contents, address selector (uses `/account/addresses`), shipping placeholder (full zones in S9). *Acceptance:* page renders; can advance.

### Day 4 (Thu Jun 4)
- **S4-D4-T1** [L] (D1) Prisma schema: `Order`, `OrderItem`, `OrderStatusEvent`. Order ID generator (daily-reset serial: `ORD-26-DDMM-NNNNN`). *Acceptance:* migration; order ID generates correctly across day boundary.
- **S4-D4-T2** [L] (D2) `createOrder` Server Action: validates payload, re-checks stock, creates Order in transaction, decrements inventory placeholder, inserts OrderStatusEvent (`Confirmed`), inserts AuditLog. Returns redirect URL. *Acceptance:* test order created; status event recorded. *Dep:* T1.
- **S4-D4-T3** [M] (D3) Paymob integration setup: API credentials stored in env (test mode), client wrapper for `payment_intent` + iframe URL generation. *Acceptance:* dev test creates a payment intent.

### Day 5 (Fri Jun 5)
- **S4-D5-T1** [L] (D1) Paymob webhook handler at `POST /api/webhooks/paymob`: HMAC verification, idempotency check (by Paymob `transaction_id`), update `Order.payment_status`, enqueue `notify-order-confirmed` and `generate-invoice` jobs. *Acceptance:* test webhook updates order status. *Dep:* D4-T2.
- **S4-D5-T2** [M] (D2) Order confirmation page at `/order/confirmed/[id]` (poll order status, show success when paid). *Acceptance:* page polls + transitions on payment success.
- **S4-D5-T3** [M] (D3) Email confirmation template (basic, MVP polish later) sent via worker. *Acceptance:* email arrives after test payment.

(Weekend)

### Day 6 (Mon Jun 8)
- **S4-D6-T1** [L] (D1) Stock validation pre-checkout: re-validate at submit, show clear error with "adjust quantity" affordance if any item is short. *Acceptance:* simulating out-of-stock during checkout shows friendly error. *Dep:* D3-T1.
- **S4-D6-T2** [L] (D2) `/account` overview page: profile info, addresses, order history list (placeholder for orders). *Acceptance:* page renders for logged-in user.
- **S4-D6-T3** [M] (D3) Order history detail page at `/account/orders/[id]`: shows order info, status (just `Confirmed` for now), items, prices. *Acceptance:* page renders. Full timeline in S5.

### Day 7 (Tue Jun 9)
- **S4-D7-T1** [M] (D1) **Guest checkout** flow: `/checkout` allows non-authenticated users to enter phone, name, address inline (no account creation). *Acceptance:* guest can complete an order.
- **S4-D7-T2** [M] (D2) Post-order "Save your order → create account" prompt on confirmation page (one-click creates account from collected phone). *Acceptance:* one-click works.
- **S4-D7-T3** [M] (D3) Auth.js: profile page allows updating name, language preference. *Acceptance:* updates persist.

### Day 8 (Wed Jun 10)
- **S4-D8-T1** [M] (D1) Reservation → firm hold transition on order placement (cart reservations become order reservations, expires_at lifted). *Acceptance:* placing order from cart locks stock until terminal state. *Dep:* D3-T1, D4-T2.
- **S4-D8-T2** [M] (D2) Admin orders list at `/admin/orders` (basic — list + filter by status + date + customer name + order ID search). *Acceptance:* admin sees the test orders.
- **S4-D8-T3** [M] (D3) Bug fixes from internal QA pass on cart + checkout. *Acceptance:* cleanly executes the happy path.

### Day 9 (Thu Jun 11)
- **S4-D9-T1** [M] (D1) E2E test: full B2C order flow (browse → add to cart → guest checkout → Paymob test card → confirmation). *Acceptance:* test runs in CI.
- **S4-D9-T2** [M] (D2) Daily reconciliation worker job (cron, hourly): finds orders with `payment_status='pending'` older than 1 hour, queries Paymob for actual status, updates accordingly. *Acceptance:* job runs; test scenario reconciles correctly.
- **S4-D9-T3** [M] (D3) Localized order confirmation email template (AR + EN versions). *Acceptance:* both render correctly.

### Day 10 (Fri Jun 12) — **M0 demo day**
- **S4-D10-T1** [M] (D1) Polish + final bug bash on the M0 demo flow. *Acceptance:* demo runs cleanly end-to-end.
- **S4-D10-T2** [M] (D2) Deploy to staging; verify staging mirrors local. *Acceptance:* staging M0 demo works.
- **S4-D10-T3** [S] (D3) **M0 internal demo** to stakeholders. Capture feedback. *Acceptance:* demo delivered; feedback logged.

### Sprint 4 Exit Criteria
- ✅ B2C registration via WhatsApp OTP works end-to-end (real WhatsApp messages)
- ✅ Guest checkout works
- ✅ Cart with stock soft holds (15-min TTL) + reservation cleanup
- ✅ Paymob test-mode payment end-to-end (intent + iframe + webhook)
- ✅ Order created in DB with correct ID format, status timeline starts at `Confirmed`
- ✅ Order confirmation email sent
- ✅ Admin orders list shows real orders
- ✅ E2E test for full B2C order flow in CI
- ✅ **M0 demo delivered**

---

## Sprint 5 — Order Tracking + Notifications + Admin Order Mgmt
**Dates:** 2026-06-15 → 2026-06-26 (10 working days)
**Goal:** End-to-end order tracking pipeline with WhatsApp + email notifications, admin order management with bulk status updates and courier handoff.
**Demo at sprint end:** B2C orders flow through the full pipeline (`Confirmed → Handed to Courier → Out for Delivery → Delivered`); customer receives WhatsApp updates at each step; admin can bulk-update statuses.

### Day 1 (Mon Jun 15)
- **S5-D1-T1** [M] (D1) Public order detail page (`/account/orders/[id]`) shows status timeline (vertical, with timestamps + notes per event). *Acceptance:* timeline renders for orders with multiple events.
- **S5-D1-T2** [M] (D2) Prisma schema: `Courier` (id, name, phone, position, active). Admin CRUD for couriers list. *Acceptance:* admin can add/edit/disable couriers.
- **S5-D1-T3** [M] (D3) Server Action `updateOrderStatus(orderId, newStatus, courierData?)` — role-gated (Owner/Ops). Validates state transitions. Inserts OrderStatusEvent + AuditLog. Enqueues notification job. *Acceptance:* status updates work via API.

### Day 2 (Tue Jun 16)
- **S5-D2-T1** [L] (D1) Admin order detail page (`/admin/orders/[id]`): full info, status action panel (state-machine-aware buttons), courier handoff modal (courier select, waybill, expected delivery date with auto-suggest from zone defaults). *Acceptance:* status changes work via admin UI; modal flows correctly.
- **S5-D2-T2** [M] (D2) Worker job `notify-status-change`: sends WhatsApp via Meta Cloud API using approved template. Records `Notification` row. *Acceptance:* test status change sends WhatsApp message to test phone.
- **S5-D2-T3** [M] (D3) WhatsApp delivery webhook at `POST /api/webhooks/whatsapp` (Meta delivery status callbacks): updates `Notification.status` (`sent`, `delivered`, `read`, `failed`). *Acceptance:* webhook updates statuses.

### Day 3 (Wed Jun 17)
- **S5-D3-T1** [M] (D1) Admin order list bulk actions: select multiple orders → "Mark as Handed to Courier" with shared courier assignment modal. *Acceptance:* 5 orders updated in single action.
- **S5-D3-T2** [M] (D2) Admin: customer-visible **order notes** field (separate from internal notes). Customer-visible note shows on the order detail page. *Acceptance:* notes show correctly on each side.
- **S5-D3-T3** [M] (D3) Order status notification template logic: per-status WhatsApp templates (`order_packed_ar`, `order_handed_ar`, `order_out_for_delivery_ar`, `order_delivered_ar`) — ensure all are submitted to Meta if not already. *Acceptance:* templates approved or in queue.

### Day 4 (Thu Jun 18)
- **S5-D4-T1** [M] (D1) Customer-side "Cancel Order" button (only available pre-`HandedToCourier`). Submits cancellation request → admin queue. *Acceptance:* request submitted; status doesn't change yet.
- **S5-D4-T2** [M] (D2) Admin: cancellation queue + approve/deny action (`processCancellation`). On approve: state → `Cancelled`, release stock reservation, refund placeholder (manual in MVP). *Acceptance:* approval flow works.
- **S5-D4-T3** [M] (D3) Email notification job mirror (sends transactional email for B2B orders — for now wired up for all orders, refined in S7 to be B2B-only). *Acceptance:* test email sent.

### Day 5 (Fri Jun 19)
- **S5-D5-T1** [M] (D1) Admin order list: filters by status, date range, customer type (B2C only at this point), payment method, zone. *Acceptance:* filters work in combination.
- **S5-D5-T2** [M] (D2) Admin order list: search by order ID / customer phone / customer name. *Acceptance:* search returns matches.
- **S5-D5-T3** [M] (D3) Sample dataset: simulate 30 orders across statuses for demo + testing. *Acceptance:* dataset seeded.

(Weekend)

### Day 6 (Mon Jun 22)
- **S5-D6-T1** [M] (D1) Order detail page polish: courier name + phone displayed prominently with click-to-call on mobile. *Acceptance:* clicking courier phone on mobile opens dialer.
- **S5-D6-T2** [M] (D2) Notification opt-out per-status admin setting (toggle off "Confirmed" notification, etc.). *Acceptance:* toggle off skips that template.
- **S5-D6-T3** [M] (D3) Audit log infrastructure complete: every status change, every cancellation decision, every admin action recorded. *Acceptance:* sample admin actions show up in `audit_log` table.

### Day 7 (Tue Jun 23)
- **S5-D7-T1** [M] (D1) "Delayed / Issue" exception state: admin sets with required note; customer sees clear message + reason. *Acceptance:* delayed state notifies customer + shows on order page.
- **S5-D7-T2** [M] (D2) Returns log table + admin UI to record returns (no self-serve; admin enters reason, items, refund decision). *Acceptance:* admin can record a return.
- **S5-D7-T3** [M] (D3) WhatsApp delivery failure handling: if message fails (recipient blocked, invalid number, etc.), retry once, then mark notification failed and admin alert. *Acceptance:* simulated failure surfaces alert.

### Day 8 (Wed Jun 24)
- **S5-D8-T1** [M] (D1) Order detail page: invoice download placeholder button (full PDF generation in S6). *Acceptance:* button visible.
- **S5-D8-T2** [M] (D2) E2E test: order placement → admin updates status → customer sees notification + status change. *Acceptance:* test runs in CI.
- **S5-D8-T3** [M] (D3) Notification rate-limiting safeguards: max 5 messages per phone per hour (prevents spam if status oscillates). *Acceptance:* 6th message in hour is queued/skipped.

### Day 9 (Thu Jun 25)
- **S5-D9-T1** [M] (D1) Bug fixes from internal QA. *Acceptance:* punch list cleared.
- **S5-D9-T2** [M] (D2) Performance review: order list pagination, query optimization, ensure admin list loads fast even with 1000 orders simulated. *Acceptance:* admin list <500ms p95 with 1000 orders.
- **S5-D9-T3** [M] (D3) Documentation: ops runbook for order processing workflow. *Acceptance:* doc reviewed.

### Day 10 (Fri Jun 26)
- **S5-D10-T1** [M] (D1) Sprint demo polish + deploy to staging. *Acceptance:* end-to-end demo runs cleanly.
- **S5-D10-T2** [M] (D2) Smoke tests on staging. *Acceptance:* all critical paths pass.
- **S5-D10-T3** [S] (D3) Sprint demo + retrospective. *Acceptance:* demo delivered.

### Sprint 5 Exit Criteria
- ✅ Order status pipeline works end-to-end: `Confirmed → Handed to Courier → Out for Delivery → Delivered`
- ✅ Exception states: `Cancelled`, `Returned`, `Delayed/Issue`
- ✅ Customer receives WhatsApp notification on every status change (for B2C)
- ✅ Admin can bulk-update statuses with shared courier assignment
- ✅ Admin order list with filters + search + bulk actions
- ✅ Cancellation flow (customer request → admin approve/deny)
- ✅ Returns recording UI in admin
- ✅ Audit log capturing all state changes

---

## Sprint 6 — Inventory + Invoicing + Out-of-Stock Polish
**Dates:** 2026-06-29 → 2026-07-10 (10 working days)
**Goal:** Full inventory management (receive, adjust, low-stock alerts), automated PDF invoice generation with amendment versioning, polished out-of-stock UX.
**Demo at sprint end:** Admin receives stock; product detail page shows accurate stock levels; B2C order completes with auto-generated PDF invoice (Arabic, downloadable + emailed + WhatsApp link).

### Day 1 (Mon Jun 29)
- **S6-D1-T1** [L] (D1) Prisma schema: extend `Inventory` (`current_qty`, `low_stock_threshold`); add `InventoryReservation` (full type/expiry semantics); add `InventoryMovement` (type enum, qty_delta, reason, ref_id, user_id). *Acceptance:* migration runs.
- **S6-D1-T2** [M] (D2) Server Actions: `receiveStock`, `adjustInventory` (role-gated). Insert `InventoryMovement` per operation. *Acceptance:* admin actions update qty + log movement.
- **S6-D1-T3** [M] (D3) Admin inventory page (`/admin/inventory`) with per-product current qty + low-stock threshold setting. *Acceptance:* page renders with inventory list.

### Day 2 (Tue Jun 30)
- **S6-D2-T1** [M] (D1) Receive stock UI (modal): qty + note. Adjust stock UI (modal): delta + reason (dropdown: damaged, theft, count correction, returned). *Acceptance:* both flows work.
- **S6-D2-T2** [M] (D2) Per-SKU stock movement history view in admin (timeline of all movements). *Acceptance:* history shows for sample products.
- **S6-D2-T3** [M] (D3) Low-stock dashboard widget on admin home: list of SKUs below threshold (global default + per-SKU override). *Acceptance:* widget shows correct items.

### Day 3 (Wed Jul 1)
- **S6-D3-T1** [M] (D1) Worker job `low-stock-digest` (cron, daily at 08:00 EET): emails admin a summary of low-stock SKUs. *Acceptance:* test run sends digest email.
- **S6-D3-T2** [M] (D2) Setting (`Setting` table): global low-stock threshold default, configurable from admin settings page. *Acceptance:* setting persists; respected by alerts.
- **S6-D3-T3** [M] (D3) Stock indicator on product detail page (B2C: vague — "In Stock" / "Low Stock" / "Out of Stock"; B2B: exact qty when logged in — placeholder until B2B in S7). *Acceptance:* B2C indicator works.

### Day 4 (Thu Jul 2)
- **S6-D4-T1** [L] (D1) **PDF invoice template** with react-pdf (Arabic-only, RTL): company header (name, logo, address, CR#, tax card#, phone), customer block, invoice number, date, order ID, line items (Arabic name + SKU + qty + unit price + line total), subtotal/discount/shipping/VAT 14%/total, payment method + status. *Acceptance:* sample invoice renders.
- **S6-D4-T2** [M] (D2) Worker job `generate-invoice`: triggered on order `Confirmed` state, renders PDF, writes to `/storage/invoices/`, creates `Invoice` row. *Acceptance:* invoice file generated; `Invoice.file_path` set.
- **S6-D4-T3** [M] (D3) Invoice numbering generator (`INV-YY-NNNNNN` annual sequential, gapless). Concurrency-safe (uses Postgres advisory lock or sequence). *Acceptance:* concurrent test creates sequential numbers without gaps.

### Day 5 (Fri Jul 3)
- **S6-D5-T1** [M] (D1) Invoice download button on customer order detail page; admin re-download button on admin order detail. *Acceptance:* both download actions work.
- **S6-D5-T2** [M] (D2) Invoice attached to confirmation email + WhatsApp message includes link to invoice PDF (signed URL with expiry). *Acceptance:* test order's email arrives with invoice.
- **S6-D5-T3** [M] (D3) Invoice amendment flow: admin clicks "Regenerate Invoice" (with reason note); creates `Invoice` v2 row; new PDF rendered with **"Amended"** watermark. Previous version retained. *Acceptance:* amendment creates v2 invoice.

(Weekend)

### Day 6 (Mon Jul 6)
- **S6-D6-T1** [M] (D1) Catalog seed: import another batch of SKUs from data team — target 500 cumulative. *Acceptance:* 500 SKUs live.
- **S6-D6-T2** [M] (D2) Stock reservation hardening: race-condition test (two concurrent customers add last unit). *Acceptance:* one succeeds, one fails gracefully.
- **S6-D6-T3** [M] (D3) Admin: per-SKU low-stock threshold override UI on product detail. *Acceptance:* override saves and used.

### Day 7 (Tue Jul 7)
- **S6-D7-T1** [M] (D1) Out-of-stock product still discoverable via search (preserves SEO). *Acceptance:* OOS products in search results with badge.
- **S6-D7-T2** [M] (D2) Order placement re-validates stock at `createOrder` (race-condition guard). *Acceptance:* concurrent order placements one fails gracefully.
- **S6-D7-T3** [M] (D3) Worker job `cleanup-expired-otps` (cron, hourly): deletes expired OTP rows. *Acceptance:* run shows expired rows deleted.

### Day 8 (Wed Jul 8)
- **S6-D8-T1** [M] (D1) Inventory CSV import for bulk receive (admin uploads CSV with SKU + qty + note). *Acceptance:* sample CSV imports correctly.
- **S6-D8-T2** [M] (D2) E2E test: out-of-stock flow (add to cart → product goes OOS → checkout error). *Acceptance:* test passes.
- **S6-D8-T3** [M] (D3) E2E test: order placement → invoice generated → customer downloads invoice. *Acceptance:* test passes.

### Day 9 (Thu Jul 9)
- **S6-D9-T1** [M] (D1) Bug fixes from internal QA. *Acceptance:* punch list cleared.
- **S6-D9-T2** [M] (D2) Performance + storage audit: invoice files growing as expected; image storage growing as expected; disk usage trend acceptable. *Acceptance:* monitoring confirms healthy growth.
- **S6-D9-T3** [M] (D3) Documentation: invoice template format reference, inventory ops procedures. *Acceptance:* docs reviewed.

### Day 10 (Fri Jul 10)
- **S6-D10-T1** [M] (D1) Sprint demo polish + staging deploy. *Acceptance:* demo runs clean.
- **S6-D10-T2** [M] (D2) Smoke tests on staging. *Acceptance:* all critical paths pass.
- **S6-D10-T3** [S] (D3) Sprint demo + retrospective. *Acceptance:* demo delivered.

### Sprint 6 Exit Criteria
- ✅ Inventory operations: receive, adjust, automatic decrement on Confirmed
- ✅ Stock movement audit log per SKU
- ✅ Low-stock dashboard widget + daily email digest + admin-configurable thresholds
- ✅ Out-of-stock UX: badge on product cards, no add-to-cart, still discoverable
- ✅ PDF invoice auto-generated on `Confirmed` (Arabic, includes all required fields)
- ✅ Invoice numbering gapless annual sequential
- ✅ Invoice amendment flow with versioning + "Amended" watermark
- ✅ Invoice delivered via email + WhatsApp link + downloadable on order page
- ✅ 500+ SKUs live

---

## Sprint 7 — B2B Accounts + Approval + Pricing Tiers
**Dates:** 2026-07-13 → 2026-07-24 (9 working days; Thu Jul 23 = Revolution Day)
**Goal:** B2B signup flow, admin approval queue with tier/credit assignment, B2B login, negotiated pricing visible throughout the catalog.
**Demo at sprint end:** Submit B2B application → admin approves with Tier B → B2B user logs in → catalog shows discounted prices throughout.

### Day 1 (Mon Jul 13)
- **S7-D1-T1** [L] (D1) Prisma schema: `Company`, `B2BApplication`, `PricingTier`, `CompanyPriceOverride`. Migration. Seed 3 default tiers (A, B, Custom). *Acceptance:* migration; tier rows visible.
- **S7-D1-T2** [M] (D2) Public B2B signup page (`/b2b/register`): bilingual form with required + optional fields per PRD. zod validation. Submits to `submitB2BApplication` Server Action. *Acceptance:* test application submits successfully.
- **S7-D1-T3** [M] (D3) Auth.js: differentiate B2B login (email + password) from B2C (phone + OTP) — separate routes (`/b2b/login` vs `/login`) with appropriate flows. *Acceptance:* both flows work for their user types.

### Day 2 (Tue Jul 14)
- **S7-D2-T1** [L] (D1) Admin B2B applications queue (`/admin/b2b/applications`): list pending applications, view details, approve/reject buttons. Approval modal: select pricing tier (A/B/Custom) + credit terms (none/Net-15/Net-30/Custom). *Acceptance:* approval flow creates Company + activates User.
- **S7-D2-T2** [M] (D2) On approval: send B2B welcome email with login link + temporary password (force-reset on first login). *Acceptance:* test approval triggers email.
- **S7-D2-T3** [M] (D3) Pricing resolution helper: given (user, product), returns the user's price (custom override → tier discount → base price). Reusable across catalog/cart/checkout. *Acceptance:* unit tests pass for all 3 paths.

### Day 3 (Wed Jul 15)
- **S7-D3-T1** [L] (D1) Negotiated pricing displayed on **catalog cards + product pages + cart + checkout** for logged-in B2B users (using the resolution helper). *Acceptance:* B2B test user sees Tier B prices throughout. *Dep:* D2-T3.
- **S7-D3-T2** [M] (D2) Pricing tier badge on company profile + admin company view (e.g., "Tier B — 15% off"). *Acceptance:* badge visible.
- **S7-D3-T3** [M] (D3) Custom per-SKU pricing UI for Tier C companies (in admin company detail page): table to add/edit/remove SKU-specific overrides. *Acceptance:* overrides save and apply.

### Day 4 (Thu Jul 16)
- **S7-D4-T1** [M] (D1) Stock visibility for B2B logged-in users: shows exact qty on product detail (per ADR-003 stock display rules). *Acceptance:* B2B user sees "47 units available"; B2C sees "In Stock".
- **S7-D4-T2** [M] (D2) Company profile page (`/b2b/profile`): view company info, tier badge, addresses, contacts. Edit contacts (CR#/tax card# read-only). *Acceptance:* page renders + contact edits save.
- **S7-D4-T3** [M] (D3) Order history scoped to company (all orders under the shared login). *Acceptance:* B2B user sees company-wide history.

### Day 5 (Fri Jul 17)
- **S7-D5-T1** [M] (D1) B2B application rejection flow: admin enters reason; applicant gets email with reason; CR#/email re-usable for re-application. *Acceptance:* rejection flow works.
- **S7-D5-T2** [M] (D2) **Sales Rep role** wiring: only Owner + Sales Rep see B2B applications queue. *Acceptance:* Ops user gets 403; Sales Rep + Owner can access.
- **S7-D5-T3** [M] (D3) Notification: B2B emails are sent in addition to WhatsApp (now the email channel is B2B-only — refine the worker job from S5-D4-T3 accordingly). *Acceptance:* B2C orders trigger only WhatsApp; B2B trigger both.

(Weekend)

### Day 6 (Mon Jul 20)
- **S7-D6-T1** [M] (D1) "Sign up your company" CTA in storefront header for unauthenticated users. *Acceptance:* CTA visible.
- **S7-D6-T2** [M] (D2) Browse-as-B2C-while-pending: applicants who haven't been approved yet can still browse + checkout at standard prices via B2C flow. *Acceptance:* pending applicant can complete a B2C order.
- **S7-D6-T3** [M] (D3) Admin company list (`/admin/b2b/companies`): view all approved companies, sort by revenue / order count, edit tier/credit terms. *Acceptance:* page renders + edit works.

### Day 7 (Tue Jul 21)
- **S7-D7-T1** [M] (D1) E2E test: B2B signup → admin approval → B2B login → see Tier B pricing → place order. *Acceptance:* test runs in CI.
- **S7-D7-T2** [M] (D2) B2B password reset flow (separate from B2C): email → reset link → new password. *Acceptance:* full flow tested.
- **S7-D7-T3** [M] (D3) Performance: pricing resolution caching at request level (avoid N+1 queries on catalog page). *Acceptance:* catalog load with B2B user <500ms p95.

### Day 8 (Wed Jul 22)
- **S7-D8-T1** [M] (D1) Bug fixes from internal QA. *Acceptance:* punch list cleared.
- **S7-D8-T2** [M] (D2) Sample data: 3 test companies across tiers for demo. *Acceptance:* data seeded.
- **S7-D8-T3** [M] (D3) Documentation: sales rep workflow guide (approval procedure, tier philosophy). *Acceptance:* doc reviewed.

(Thu Jul 23 — Revolution Day, off)

### Day 9 (Fri Jul 24)
- **S7-D9-T1** [M] (D1) Sprint demo polish + staging deploy. *Acceptance:* demo runs clean.
- **S7-D9-T2** [M] (D2) Smoke tests on staging. *Acceptance:* all critical paths pass.
- **S7-D9-T3** [S] (D3) Sprint demo + retrospective. *Acceptance:* demo delivered.

### Sprint 7 Exit Criteria
- ✅ B2B signup form live and functional
- ✅ Admin approval queue with tier + credit terms assignment
- ✅ B2B login (email + password) works; password reset works
- ✅ Negotiated pricing displayed throughout catalog/cart/checkout for B2B users
- ✅ Tier C custom per-SKU overrides
- ✅ Company profile page
- ✅ Company-wide order history
- ✅ B2B notifications: WhatsApp + email
- ✅ Browse-as-B2C-while-pending works for applicants

---

## Sprint 8 — B2B Portal + Submit-for-Review + Bulk Order + Reorder
**Dates:** 2026-07-27 → 2026-08-07 (10 working days)
**Goal:** Complete B2B portal experience: dual-option checkout, bulk order tool, one-click reorder, "Placed by" attribution, sales rep Pending Confirmation queue.
**Demo at sprint end:** B2B user submits order via Submit-for-Review → sales rep gets queue notification → confirms → flows through pipeline.

### Day 1 (Mon Jul 27)
- **S8-D1-T1** [L] (D1) Add `Order.placed_by_name` field; checkout for B2B users requires this free-text field. *Acceptance:* B2B order has placed_by_name populated.
- **S8-D1-T2** [L] (D2) B2B checkout shows BOTH options: "Submit Order for Review" + "Pay Now" (default for new B2B accounts). *Acceptance:* both buttons render for B2B; B2C sees only standard payment options.
- **S8-D1-T3** [M] (D3) Server Action `submitForReviewOrder`: creates Order in `Pending Confirmation` state. Enqueues `notify-b2b-pending-review` (customer) + `notify-sales-rep-new-order` (sales rep alert). *Acceptance:* test order lands in Pending Confirmation.

### Day 2 (Tue Jul 28)
- **S8-D2-T1** [L] (D1) Admin **Pending Confirmation queue** (`/admin/b2b/pending-confirmation`): list, view details, "Confirm" action (with note field). *Acceptance:* sales rep can confirm an order.
- **S8-D2-T2** [M] (D2) On `confirmB2BOrder`: state → `Confirmed`, set payment method (admin selects from dropdown: PO, transfer, etc.), enqueue invoice generation + customer notification. *Acceptance:* full flow works.
- **S8-D2-T3** [M] (D3) Sales rep dashboard widget: Pending Confirmation count + click-through. *Acceptance:* widget renders.

### Day 3 (Wed Jul 29)
- **S8-D3-T1** [L] (D1) Per-company checkout configuration in admin (company detail page): "Show both options" / "Submit for Review only" / "Pay Now only". Default = both. *Acceptance:* setting changes B2B user's checkout view.
- **S8-D3-T2** [M] (D2) Optional **PO reference** text field at B2B checkout (always available; saved to order). Shown on invoice. *Acceptance:* PO reference appears on test order + invoice.
- **S8-D3-T3** [M] (D3) "Placed by" name shown on invoice + order history rows + admin order detail. *Acceptance:* visible everywhere expected.

### Day 4 (Thu Jul 30)
- **S8-D4-T1** [L] (D1) **Bulk order tool** UI at `/b2b/bulk-order`: dynamic table with rows of (SKU autocomplete + qty input + live unit price + line total + remove). Add new row, duplicate row, clear all. Keyboard-friendly tabbing. *Acceptance:* user can quickly add 10 SKUs.
- **S8-D4-T2** [M] (D2) Bulk order: live stock validation per row (warns if requested qty exceeds available). *Acceptance:* over-ordering shows warning; doesn't block.
- **S8-D4-T3** [M] (D3) Bulk order: "Add All to Cart" button (single action, all valid rows added). *Acceptance:* cart contains all bulk items afterward.

### Day 5 (Fri Jul 31)
- **S8-D5-T1** [L] (D1) **One-click reorder** action on each past order in order history. Adds available items to cart at current prices. *Acceptance:* reorder works.
- **S8-D5-T2** [M] (D2) Reorder modal pre-confirmation: shows which items are now out-of-stock or discontinued; user confirms or skips. *Acceptance:* modal renders correctly with mixed scenarios.
- **S8-D5-T3** [M] (D3) Bulk order autocomplete uses Postgres FTS for SKU/name search (fast, debounced). *Acceptance:* typing returns suggestions <300ms.

(Weekend)

### Day 6 (Mon Aug 3)
- **S8-D6-T1** [M] (D1) E2E test: B2B Submit-for-Review flow end-to-end. *Acceptance:* test runs in CI.
- **S8-D6-T2** [M] (D2) E2E test: B2B Pay Now flow with Paymob test card. *Acceptance:* test runs.
- **S8-D6-T3** [M] (D3) Polish: bulk order tool keyboard shortcuts (Tab to next, Enter to add row). *Acceptance:* power-user flow tested.

### Day 7 (Tue Aug 4)
- **S8-D7-T1** [M] (D1) Empty cart state for B2B users: shows "Recently ordered" reorder cards + "Browse catalog" CTA. *Acceptance:* renders with sample data.
- **S8-D7-T2** [M] (D2) B2B-specific notification templates approved by Meta (if not already): order pending review, order confirmed by rep. *Acceptance:* templates approved.
- **S8-D7-T3** [M] (D3) Sales rep workflow polish: clicking a Pending Confirmation order opens admin detail with prominent "Confirm" CTA. *Acceptance:* UX feels intentional.

### Day 8 (Wed Aug 5)
- **S8-D8-T1** [M] (D1) Bug fixes from internal QA. *Acceptance:* punch list cleared.
- **S8-D8-T2** [M] (D2) Performance: bulk order page handles 50 rows without lag. *Acceptance:* tested with 50 rows.
- **S8-D8-T3** [M] (D3) Sample data: 3 B2B test companies + 20 simulated orders across mixed states. *Acceptance:* data seeded.

### Day 9 (Thu Aug 6)
- **S8-D9-T1** [M] (D1) Documentation: B2B user guide (signup process, bulk order, reorder, Submit-for-Review explanation). *Acceptance:* doc reviewed.
- **S8-D9-T2** [M] (D2) Documentation: sales rep procedure (handling Pending Confirmation queue). *Acceptance:* doc reviewed.
- **S8-D9-T3** [M] (D3) Hardening: ensure all B2B server actions enforce company scoping (no cross-company data leaks). *Acceptance:* security audit passes for B2B routes.

### Day 10 (Fri Aug 7)
- **S8-D10-T1** [M] (D1) Sprint demo polish + staging deploy. *Acceptance:* demo runs clean.
- **S8-D10-T2** [M] (D2) Smoke tests on staging. *Acceptance:* all critical paths pass.
- **S8-D10-T3** [S] (D3) Sprint demo + retrospective. *Acceptance:* demo delivered.

### Sprint 8 Exit Criteria
- ✅ B2B checkout shows both "Submit for Review" and "Pay Now" options (admin-configurable per company)
- ✅ Submit-for-Review flow: order → Pending Confirmation queue → sales rep confirms → flows normally
- ✅ "Placed by (name)" mandatory at B2B checkout, visible on invoice + order history
- ✅ PO reference field optional at checkout
- ✅ Bulk order tool: rapid SKU entry, live stock + price, add-all-to-cart
- ✅ One-click reorder from any past order, with out-of-stock pre-warnings
- ✅ Sales rep dashboard widget for Pending Confirmation count
- ✅ B2B notification templates approved + delivered

---

## Sprint 9 — COD + Shipping Zones + Admin Settings
**Dates:** 2026-08-10 → 2026-08-21 (10 working days)
**Goal:** Cash on Delivery flow, 5-zone shipping system, admin settings panel for all configurables, basic promo codes. *(Fawry integration removed per ADR-022; ~2 days of capacity freed — see Day 4 / Day 7 / Day 8 below.)*
**Demo at sprint end:** Both payment methods (Paymob card, COD) work end-to-end across all 5 shipping zones; admin can configure rates, COD policy, couriers, VAT, promo codes, store info from settings panel.

### Day 1 (Mon Aug 10)
- **S9-D1-T1** [L] (D1) Prisma schema: `ShippingZone` (5 zones seeded), `GovernorateZone` mapping (27 governorates seeded), settings extension. *Acceptance:* migration + seed; default mappings reasonable.
- **S9-D1-T2** [M] (D2) Address form updated: governorate becomes a select with all 27 Egyptian governorates; other location fields (city, area, etc.) stay as text. *Acceptance:* governorate select shows all options.
- **S9-D1-T3** [M] (D3) Shipping zone resolution helper: address governorate → zone → rate (using `Setting.free_shipping_threshold` if cart ≥ threshold). *Acceptance:* resolution returns correct rate.

### Day 2 (Tue Aug 11)
- **S9-D2-T1** [L] (D1) Checkout: shipping cost displayed dynamically based on selected address (uses zone resolution). Free shipping notification when threshold met. *Acceptance:* changing address updates shipping cost.
- **S9-D2-T2** [M] (D2) Admin settings page (`/admin/settings/shipping`): edit rate per zone, free-shipping threshold (B2C and B2B), governorate-to-zone mapping. *Acceptance:* settings persist; checkout uses new values.
- **S9-D2-T3** [M] (D3) Cash on Delivery: payment method option in checkout when zone allows COD. Admin setting `Setting.cod_policy`: enabled toggle + fee (fixed amount or %) + max order value + per-zone availability. *Acceptance:* COD shows/hides appropriately.

### Day 3 (Wed Aug 12)
- **S9-D3-T1** [M] (D1) COD flow at checkout: customer selects → order placed in `Confirmed` state with `payment_method='COD'`, `payment_status='pending_collection'`. *Acceptance:* COD orders create correctly.
- **S9-D3-T2** [M] (D2) Admin: COD orders in admin marked clearly; on Delivered status, admin marks payment received → `payment_status='paid'`. *Acceptance:* full COD lifecycle works.
- **S9-D3-T3** [M] (D3) Admin settings page (`/admin/settings/cod`): edit COD policy (fee, max value, per-zone toggle). *Acceptance:* settings persist.

### Day 4 (Thu Aug 13)
- ~~**S9-D4-T1** Fawry integration~~ — **removed (ADR-022)**.
- ~~**S9-D4-T2** Fawry webhook~~ — **removed (ADR-022)**.
- **S9-D4-T3** [M] (D3) Admin settings page (`/admin/settings/couriers`): editable courier partners list (CRUD). *Acceptance:* CRUD works.
- **S9-D4-T4** [M] (D1) **(Reallocated capacity)** Shipping admin polish: governorate-to-zone bulk-edit UX (drag/drop or multi-select grouping) so the operator doesn't click 27 dropdowns at first run. *Acceptance:* governorate mapping editable in <2 minutes.
- **S9-D4-T5** [M] (D2) **(Reallocated capacity)** COD reconciliation report: admin view listing orders in `payment_status=pending_collection` grouped by courier with totals — ops uses this when collecting cash from couriers. *Acceptance:* report renders + filterable by date.

### Day 5 (Fri Aug 14)
- **S9-D5-T1** [L] (D1) Prisma schema: `PromoCode` (code, type, value, min_order, usage_limit, used_count, valid_from, valid_to, active). Admin CRUD page. *Acceptance:* admin can create + edit promo codes.
- **S9-D5-T2** [M] (D2) Promo code application at checkout: input → validate (active, within dates, within usage limit, min order met) → apply discount → display in summary. *Acceptance:* test code applied.
- **S9-D5-T3** [M] (D3) Promo code increments `used_count` atomically on order placement. *Acceptance:* concurrent test doesn't exceed limit.

(Weekend)

### Day 6 (Mon Aug 17)
- **S9-D6-T1** [M] (D1) Admin settings page (`/admin/settings/store-info`): store name, logo upload, contact info, address, CR#, tax card# (used in invoice header). *Acceptance:* settings persist; invoices use updated info.
- **S9-D6-T2** [M] (D2) Admin settings page (`/admin/settings/notifications`): per-status WhatsApp/email opt-out toggles. *Acceptance:* toggles affect notification firing.
- **S9-D6-T3** [M] (D3) Admin settings page (`/admin/settings/vat`): VAT rate (default 14%), per-product tax-exempt override (already on product schema, surfaced via UI). *Acceptance:* setting changes affect VAT calculation.

### Day 7 (Tue Aug 18)
- **S9-D7-T1** [M] (D1) Settings consolidation: settings home page with cards linking to all sub-settings pages. *Acceptance:* navigable.
- **S9-D7-T2** [M] (D2) E2E tests: COD flow + promo code application. *Acceptance:* tests in CI.
- **S9-D7-T3** [M] (D3) Performance: ensure shipping/zone/COD/promo-code calculations don't add latency to checkout. *Acceptance:* checkout latency unchanged.

### Day 8 (Wed Aug 19)
- **S9-D8-T1** [M] (D1) Bug fixes from internal QA. *Acceptance:* punch list cleared.
- **S9-D8-T2** [M] (D2) **(Reallocated capacity)** Promo code admin UX polish: bulk-disable expired codes, search by code, per-code usage stats. *Acceptance:* admin can manage 50+ codes without scrolling pain.
- **S9-D8-T3** [M] (D3) Polish: localize all settings page labels + help text. *Acceptance:* both AR and EN versions reviewed.

### Day 9 (Thu Aug 20)
- **S9-D9-T1** [M] (D1) Documentation: settings panel reference (what each setting does, defaults, recommended values). *Acceptance:* doc reviewed.
- **S9-D9-T2** [M] (D2) Promo code edge case handling: stacking rules (only one code per order in MVP), expired codes, exhausted codes. *Acceptance:* edge cases handled gracefully.
- **S9-D9-T3** [M] (D3) Sample data: seed 3 promo codes across types for demo. *Acceptance:* data seeded.

### Day 10 (Fri Aug 21)
- **S9-D10-T1** [M] (D1) Sprint demo polish + staging deploy. *Acceptance:* demo runs clean.
- **S9-D10-T2** [M] (D2) Smoke tests on staging. *Acceptance:* all critical paths pass.
- **S9-D10-T3** [S] (D3) Sprint demo + retrospective. *Acceptance:* demo delivered.

### Sprint 9 Exit Criteria
- ✅ Both payment methods (Paymob card, COD) end-to-end on staging
- ✅ 5-zone shipping with admin-configurable rates + free-shipping thresholds + governorate mapping
- ✅ COD policy admin-controlled (fee, max value, per-zone availability)
- ✅ Promo codes (basic): % or fixed, expiry, usage cap, applied at checkout
- ✅ Admin settings panel covers: shipping, COD, couriers, VAT, promo codes, store info, notifications
- ✅ Both AR and EN versions of all settings pages

---

## Sprint 10 — Admin Completeness: Roles, Audit, Customer Mgmt, Returns, Dashboard, WhatsApp Bridge
**Dates:** 2026-08-24 → 2026-09-04 (10 working days)
**Goal:** Complete the admin back-office with role enforcement, audit trail visibility (UI viewer is v1.1, but data must be solid), customer/company management, returns workflow, home dashboard, WhatsApp support bridge.
**Demo at sprint end:** Full admin back-office walked through with all 3 roles (Owner, Ops, Sales Rep); home dashboard shows correct widgets per role; WhatsApp "Chat with us" deep-link works on every page.

### Day 1 (Mon Aug 24)
- **S10-D1-T1** [L] (D1) Role-based access enforcement audit: every admin Server Action + page checks `assertRole([...])`. Add tests for 403 cases. *Acceptance:* Ops user denied on pricing pages; Sales Rep denied on inventory; full matrix tested.
- **S10-D1-T2** [M] (D2) Admin user management page (`/admin/users`): CRUD admin users, role assignment (dropdown), deactivate. *Acceptance:* full management works.
- **S10-D1-T3** [M] (D3) `AdminInvite` table + invite flow: Owner sends invite to email → recipient receives link → sets password → activated as configured role. *Acceptance:* invitation flow works.

### Day 2 (Tue Aug 25)
- **S10-D2-T1** [L] (D1) Audit log capture review: ensure every state-changing action records `AuditLog` row. Bulk inventory imports, status updates, role changes, settings changes — all covered. *Acceptance:* sample actions across the system show in audit_log table.
- **S10-D2-T2** [M] (D2) B2C customer management page (`/admin/customers`): list, search, view profile (orders, addresses, contact), deactivate. *Acceptance:* page renders + actions work.
- **S10-D2-T3** [M] (D3) Returns workflow: customer messages via WhatsApp (out-of-band); admin records return at `/admin/returns/new` (select order, items, reason, refund decision). *Acceptance:* return recorded.

### Day 3 (Wed Aug 26)
- **S10-D3-T1** [M] (D1) Returns log page (`/admin/returns`): list, filter by status, view details. *Acceptance:* page renders.
- **S10-D3-T2** [M] (D2) On return processed (refund decision): release stock back to inventory if applicable; record InventoryMovement. *Acceptance:* returned stock reappears.
- **S10-D3-T3** [M] (D3) Admin order detail: prominent return-creation button (alternative entry point to recording a return). *Acceptance:* button works.

### Day 4 (Thu Aug 27)
- **S10-D4-T1** [L] (D1) **Admin home dashboard** (`/admin/`): widgets per PRD spec. Widgets implemented: Sales today/week/month with deltas, New orders awaiting action, B2B Pending Applications, B2B Pending Confirmation, Low-stock alerts, Returns pending. *Acceptance:* widgets render with correct data.
- **S10-D4-T2** [M] (D2) Top 10 products (this month) widget + Top 10 customers (this month, by revenue) widget. *Acceptance:* widgets compute correctly.
- **S10-D4-T3** [M] (D3) 30-day sales trend chart widget (simple line chart). Use Recharts (lightweight). *Acceptance:* chart renders.

### Day 5 (Fri Aug 28)
- **S10-D5-T1** [L] (D1) **Role-based widget visibility** on dashboard: Owner sees all; Ops hides revenue widgets; Sales Rep hides inventory + revenue. *Acceptance:* tested with each role.
- **S10-D5-T2** [M] (D2) Dashboard performance: cache widget queries (Next.js revalidate every 5 min); ensure dashboard loads <500ms. *Acceptance:* met.
- **S10-D5-T3** [M] (D3) **WhatsApp "Chat with us" floating button** on every storefront page. Deep-link to sales team's existing manual WhatsApp number. Context-aware pre-filled message (general / product context / order context). *Acceptance:* clicking opens WhatsApp with right pre-filled text on each context.

(Weekend)

### Day 6 (Mon Aug 31)
- **S10-D6-T1** [M] (D1) Admin company management page (`/admin/b2b/companies`): full company management — view profile, addresses, orders, edit tier/credit terms, deactivate. *Acceptance:* page works.
- **S10-D6-T2** [M] (D2) Per-company custom-pricing UI polish (Tier C): bulk import overrides via CSV. *Acceptance:* CSV import works.
- **S10-D6-T3** [M] (D3) Admin: customer + company contact info inline-editable from list pages (quick edits). *Acceptance:* inline edits save.

### Day 7 (Tue Sep 1)
- **S10-D7-T1** [M] (D1) Order list pre-confirmation editing: admin can adjust line items (qty, remove) only while in `Confirmed` state and not yet `Handed to Courier`. *Acceptance:* edit works; restricted to allowed states.
- **S10-D7-T2** [M] (D2) Order list export to CSV (basic — for ad-hoc reporting until v1.1 BI). *Acceptance:* CSV download works.
- **S10-D7-T3** [M] (D3) E2E tests: full admin role matrix (Owner/Ops/Sales Rep can/cannot do X). *Acceptance:* tests in CI.

### Day 8 (Wed Sep 2)
- **S10-D8-T1** [M] (D1) Bug fixes from internal QA. *Acceptance:* punch list cleared.
- **S10-D8-T2** [M] (D2) Audit log query helpers for devs (since UI viewer is v1.1) — convenient SQL snippets in docs. *Acceptance:* doc with examples.
- **S10-D8-T3** [M] (D3) Polish: dashboard widget styling, loading states, empty states. *Acceptance:* visual polish reviewed.

### Day 9 (Thu Sep 3)
- **S10-D9-T1** [M] (D1) Documentation: admin user guide (covers all roles, tasks, settings). *Acceptance:* doc reviewed.
- **S10-D9-T2** [M] (D2) Documentation: returns workflow procedure. *Acceptance:* doc reviewed.
- **S10-D9-T3** [M] (D3) Sample data: backfill a representative dataset (50 orders, 20 customers, 5 returns) for demo. *Acceptance:* data seeded.

### Day 10 (Fri Sep 4)
- **S10-D10-T1** [M] (D1) Sprint demo polish + staging deploy. *Acceptance:* demo runs clean.
- **S10-D10-T2** [M] (D2) Smoke tests on staging. *Acceptance:* all critical paths pass.
- **S10-D10-T3** [S] (D3) Sprint demo + retrospective. *Acceptance:* demo delivered.

### Sprint 10 Exit Criteria
- ✅ Three admin roles (Owner / Ops / Sales Rep) enforced across every action
- ✅ Audit log captures all state changes (queryable by devs in MVP)
- ✅ Admin user management with invite flow
- ✅ Customer + company management pages
- ✅ Returns workflow (recording, processing, stock release)
- ✅ Admin home dashboard with role-filtered widgets
- ✅ WhatsApp "Chat with us" bridge live on every storefront page

---

## Sprint 11 — Production Readiness: Performance, Security, Tests, Backup Drills, Live Merchant Switchover
**Dates:** 2026-09-07 → 2026-09-18 (10 working days)
**Goal:** Make the system actually safe to launch. Performance audit, security hardening, comprehensive E2E coverage, backup + restore drills, switch to live merchant accounts, WhatsApp Cloud API switch from test to live phone number, all critical-path documentation.
**Demo at sprint end:** Staging mirrors production-readiness — load tested, security audited, backed up, monitored, and ready to handle real orders.

### Day 1 (Mon Sep 7)
- **S11-D1-T1** [L] (D1) **Performance audit:** Lighthouse on storefront (target: Performance >90 mobile, >95 desktop), product page, search results, checkout, admin dashboard. Identify and fix top 5 issues. *Acceptance:* targets met.
- **S11-D1-T2** [L] (D2) **Load test on staging** (k6 or Artillery): simulate 100 concurrent users browsing + 30 placing orders. Identify bottlenecks. *Acceptance:* report generated with pass/fail per metric.
- **S11-D1-T3** [M] (D3) **Security audit checklist:** HTTPS enforced, security headers set (CSP, HSTS, X-Frame-Options, etc.), rate limits in place, file upload sanitization, webhook signature verification, SQL injection (Prisma OK), XSS escapes. Fix any gaps. *Acceptance:* checklist complete.

### Day 2 (Tue Sep 8)
- **S11-D2-T1** [L] (D1) Database query audit: review slow query log; add indexes where needed; rewrite N+1 patterns. *Acceptance:* slow query log clean for representative load.
- **S11-D2-T2** [L] (D2) **Backup + restore full drill:** simulate VPS catastrophic failure → restore to fresh VPS from snapshot + latest pg_dump. Document the procedure. *Acceptance:* full restore succeeds; drill documented.
- **S11-D2-T3** [M] (D3) Verify all rate limits actually trigger under load test conditions. *Acceptance:* OTP/login/API rate limits enforced.

### Day 3 (Wed Sep 9)
- **S11-D3-T1** [L] (D1) **E2E test coverage gap-fill:** ensure every MVP user story has at least one E2E test. *Acceptance:* coverage matrix complete; test suite green in CI.
- **S11-D3-T2** [M] (D2) **Paymob production credentials:** verify merchant account approved (should have been months ago); switch to live credentials in production env; test small real transaction. *Acceptance:* live transaction processed (refunded immediately for test purposes).
- ~~**S11-D3-T3** Fawry production credentials~~ — **removed (ADR-022)**.

### Day 4 (Thu Sep 10)
- **S11-D4-T1** [M] (D1) **WhatsApp live phone number switchover:** if Cloud API test number was used in dev, switch production to the live business phone number procured in Sprint 1. Re-verify all templates approved. *Acceptance:* production sends real WhatsApp messages.
- **S11-D4-T2** [M] (D2) **Resource monitoring under combined prod + staging load:** verify memory stays under 90% during typical use. Adjust container limits if needed. *Acceptance:* RAM utilization charted; alerts at 90%.
- **S11-D4-T3** [M] (D3) **Browser compatibility test:** Chrome (mobile + desktop), Safari (mobile + desktop), Firefox, Samsung Internet (popular in Egypt). Fix layout issues. *Acceptance:* all 4 browsers work for golden path.

### Day 5 (Fri Sep 11)
- **S11-D5-T1** [L] (D1) **Accessibility audit:** axe-core scan on all major pages; fix serious + critical issues; manual screen-reader test (NVDA on AR + EN). *Acceptance:* zero serious issues.
- **S11-D5-T2** [M] (D2) **GlitchTip alert configuration:** set up email alerts on error spikes (>10 errors in 5 min). *Acceptance:* simulated spike triggers alert.
- **S11-D5-T3** [M] (D3) **Documentation polish:** README, architecture overview, ops runbook, admin user guide, customer-facing FAQ scaffold. *Acceptance:* docs reviewed.

(Weekend)

### Day 6 (Mon Sep 14)
- **S11-D6-T1** [L] (D1) **Live data import preparation:** coordinate with data team for catalog seed of full 500–2000 SKUs. Ensure CSV import handles edge cases (missing images, special characters in Arabic, duplicates). *Acceptance:* dry-run import on staging succeeds.
- **S11-D6-T2** [M] (D2) **Email deliverability audit:** SPF + DKIM + DMARC records configured for sending domain. Test deliverability via mail-tester.com. *Acceptance:* deliverability score >9/10.
- **S11-D6-T3** [M] (D3) **WhatsApp opt-out handling:** if customer messages "STOP" to the WhatsApp number, mark them opted-out (no further automated messages). *Acceptance:* tested.

### Day 7 (Tue Sep 15)
- **S11-D7-T1** [M] (D1) **Privacy/Terms pages:** scaffold privacy policy, terms of service, cookie notice. Owner + legal review (delegate). *Acceptance:* pages live with placeholder content for legal review.
- **S11-D7-T2** [M] (D2) **404 + error pages:** localized, branded, useful (suggested links, search). *Acceptance:* all error pages render in both locales.
- **S11-D7-T3** [M] (D3) **Cookie consent:** simple banner (necessary cookies always; analytics opt-in if added). *Acceptance:* banner shows/hides correctly.

### Day 8 (Wed Sep 16)
- **S11-D8-T1** [M] (D1) **Bug bash session:** team-wide manual testing of all golden paths. *Acceptance:* punch list cleared.
- **S11-D8-T2** [M] (D2) **Stress test memory ceiling:** simulate worst-case (large catalog browse + 5 admins working simultaneously + worker processing batch). *Acceptance:* RAM stays <90%.
- **S11-D8-T3** [M] (D3) **Webhook reliability:** test what happens if Paymob webhook arrives 10x in quick succession (idempotency); test late-arriving webhook on already-cancelled order (graceful). *Acceptance:* both scenarios handled.

### Day 9 (Thu Sep 17)
- **S11-D9-T1** [M] (D1) **Soft-launch preparation:** tester onboarding plan (5 B2C friendly testers + 3 B2B friendly companies). Communications drafted. *Acceptance:* plan documented.
- **S11-D9-T2** [M] (D2) **Production deploy rehearsal:** full deploy from `main` to production stack with rollback procedure rehearsed. *Acceptance:* deploy + rollback both tested in <10 min.
- **S11-D9-T3** [M] (D3) **Final security review:** OWASP Top 10 checklist; penetration testing of auth flows. Fix any findings. *Acceptance:* checklist complete.

### Day 10 (Fri Sep 18)
- **S11-D10-T1** [M] (D1) Final pass on staging — all M1 acceptance criteria met. *Acceptance:* M1 readiness checklist green.
- **S11-D10-T2** [M] (D2) Sprint demo prep + staging walk-through. *Acceptance:* demo runs cleanly.
- **S11-D10-T3** [S] (D3) Sprint demo + retrospective. *Acceptance:* demo delivered. Decision point: ready to soft-launch in Sprint 12?

### Sprint 11 Exit Criteria
- ✅ Lighthouse Performance >90 mobile across all major pages
- ✅ Load test passes for 100 concurrent users / 30 concurrent orders
- ✅ Security audit clean (OWASP Top 10 reviewed)
- ✅ Comprehensive E2E coverage in CI
- ✅ Full backup + restore drill completed and documented
- ✅ Live merchant credentials in place (Paymob; WhatsApp business phone)
- ✅ Email deliverability validated (SPF/DKIM/DMARC)
- ✅ Privacy/Terms/Cookie consent in place
- ✅ Production deploy + rollback rehearsed
- ✅ Documentation complete (admin guide, ops runbook, FAQ scaffold)

---

## Sprint 12 — Soft Launch + Closed Beta → **M1**
**Dates:** 2026-09-21 → 2026-10-02 (10 working days)
**Goal:** Onboard friendly testers (5 B2C + 3 B2B), process real orders, fix bugs uncovered in real use, finalize catalog data, polish UX based on feedback.
**Milestone delivered: M1 — Production Launch (closed beta)**

### Day 1 (Mon Sep 21)
- **S12-D1-T1** [M] (D1) **Production deploy** of the M1 release. *Acceptance:* prod stack runs latest code; smoke tests pass.
- **S12-D1-T2** [M] (D2) **Catalog data load:** import full 500–2000 SKUs from data team to production. *Acceptance:* catalog populated; spot-check 50 random products for correctness. *Risk:* HIGH if data team is behind.
- **S12-D1-T3** [M] (D3) **Onboard 5 B2C friendly testers:** personal outreach with onboarding instructions, support contact. *Acceptance:* 5 testers acknowledged.

### Day 2 (Tue Sep 22)
- **S12-D2-T1** [M] (D1) **Onboard 3 B2B friendly companies:** approve their accounts (already submitted application via signup form), assign tier, send welcome. *Acceptance:* 3 companies live with test accounts.
- **S12-D2-T2** [M] (D2) **Daily monitoring:** GlitchTip + Netdata + UptimeRobot reviewed each morning; issues triaged. *Acceptance:* monitoring procedure documented.
- **S12-D2-T3** [M] (D3) **Feedback collection channel:** simple feedback form + dedicated WhatsApp chat for testers. *Acceptance:* channel live; testers know to use it.

### Day 3 (Wed Sep 23)
- **S12-D3-T1** [M+] (All) **Triage + fix bugs from real tester orders.** *Acceptance:* bugs prioritized + addressed within 24h.

### Days 4–8 (Thu Sep 24 – Wed Sep 30)
**Continuous bug-fix + polish cycle.** Each day:
- **S12-Dx-T1** [M+] (All) Triage tester feedback + GlitchTip errors; fix high-priority bugs same day. Mid-priority bugs grouped end-of-day.
- **S12-Dx-T2** [M+] (1 dev) Targeted UX improvement based on observed friction.
- **S12-Dx-T3** [M+] (1 dev) Catalog quality pass: review SKU data + images on production catalog.

### Day 9 (Thu Oct 1)
- **S12-D9-T1** [M] (D1) **M1 readiness review:** all 9 MVP features confirmed working in production. *Acceptance:* checklist green.
- **S12-D9-T2** [M] (D2) **Final stability sweep:** monitor 48h of GlitchTip; resolve any open errors. *Acceptance:* error rate <1% of requests.
- **S12-D9-T3** [M] (D3) **M2 launch plan draft:** what's needed for public open registration in ~4 weeks (marketing materials, paid ad readiness, support team scaling). *Acceptance:* doc drafted for Owner review.

### Day 10 (Fri Oct 2) — **M1 milestone day**
- **S12-D10-T1** [M] (D1) Final production smoke tests. *Acceptance:* pass.
- **S12-D10-T2** [S] (D2) Tag release `v1.0.0-mvp` in git. *Acceptance:* tag created.
- **S12-D10-T3** [S] (D3) **M1 milestone announcement** to stakeholders. Sprint demo + retrospective. *Acceptance:* M1 declared.

### Sprint 12 Exit Criteria (= M1 Definition of Done)
- ✅ Production live and stable; error rate <1%; uptime >99% over the sprint
- ✅ 8 friendly testers onboarded (5 B2C + 3 B2B); processing real orders successfully
- ✅ All 9 MVP features acceptance-criteria-met in production
- ✅ Catalog populated with 500+ live SKUs
- ✅ Live merchant accounts processing real payments
- ✅ All 5 success metrics ready to track from M1 baseline
- ✅ M2 launch plan drafted

---

## Buffer Period (Oct 5–Oct 18)
**Two-week buffer** between M1 close (Fri Oct 2) and 6-month deadline (Sun Oct 18) for:
- Critical fix-forward of issues from soft-launch
- Catalog completion if data team is behind
- Slipped tasks from sprints (especially Sprint 3 if Eid impacted)
- Hardening based on first weeks of real-world use
- M2 launch preparations (marketing-side coordination)

This buffer is not idle; it's where ALL the "we underestimated this" work lands. Plan it as "if no slips, polish and prep M2."

---

## Post-MVP Roadmap (sprint-level only; no day-level)

These are the v1.1 themes ordered by suggested priority. Each ≈ 2–4 sprints depending on scope.

| Order | Theme | Approximate sprints | Triggers / dependencies |
|---|---|---|---|
| 1 | **CRM proper** + B2B multi-user with roles | 4 sprints | M1 stable + 2 weeks of real B2B usage data |
| 2 | **Bosta API integration** as optional premium tier | 1 sprint | After CRM (when team has rhythm) |
| 3 | **ETA e-invoice integration** | 2 sprints | If B2B customers request it (likely) |
| 4 | **Reporting proper + audit trail UI** | 2 sprints | After 3 months of accumulated data |
| 5 | **Marketing & retention** (campaigns, abandoned cart, reviews) | 3 sprints | After M2 with real customer base |
| 6 | **Inventory depth** (multi-warehouse, POs, suppliers, cost tracking) | 3 sprints | When operational scale demands |
| 7 | **Advanced checkout** (saved cards, BNPL, subscriptions) | 2 sprints | When transaction volume justifies |
| 8 | **Search upgrades** (semantic AI search) | 1 sprint | When catalog grows past 5k SKUs |

v2 (Arab market expansion) is a **separate initiative** of comparable scope to MVP — needs its own discovery + scoping pass.

---

## Risk Register

| ID | Risk | Likelihood | Impact | Mitigation | Owner |
|---|---|---|---|---|---|
| **R1** | Paymob merchant approval delayed beyond Sprint 4 (M0) | Medium | High | Apply Sprint 1 day 1 with all docs ready; have Paymob support contact escalation path | Owner |
| ~~**R2**~~ | ~~Fawry merchant approval delayed~~ — **closed by ADR-022 (Fawry dropped from MVP)**. New risk: lack of pay-at-outlet may suppress B2C in cash-economy segments — monitor COD share + cart-abandonment after launch | n/a | n/a | Revisit via Paymob Accept outlet-payment integration if needed | Owner |
| **R3** | WhatsApp templates rejected by Meta or delayed | Medium | High | Submit Sprint 1 day 3; have backup SMS provider as fallback if templates fail | D3 |
| **R4** | Catalog data team delivers SKUs slowly (images, AR copy, compatibility mappings) | High | High | Kick off Sprint 2 with clear deliverable schedule; partial data acceptable for M0; full data needed for M1 | Owner / data lead |
| **R5** | Eid al-Adha (Sprint 3) reduces working days more than estimated | High | Medium | Plan Sprint 3 with reduced scope; carry remainder into Sprint 4 if needed | Tech lead |
| **R6** | Memory pressure on KVM2 with combined prod + staging stacks | Medium | High | Monitor with Netdata; alerts at 90%; if hit, separate staging to KVM1 mid-sprint | D2 |
| **R7** | Backup-only-on-Hostinger risk materializes (vendor incident) | Low | Catastrophic | ADR-014 risk acknowledged; revisit decision at M2 | Owner |
| **R8** | Image upload pipeline + storage growth faster than expected | Medium | Medium | Monitor disk usage; trigger v1.1 migration to B2 if approaching 30 GB | D2 |
| **R9** | RTL bugs in non-trivial admin UI components (data tables, modals) | High | Medium | Test admin in AR locale every sprint; reserve Sprint 11 polish budget | All |
| ~~**R10**~~ | ~~Hostinger CDN doesn't apply to KVM2~~ — **closed by ADR-024 (Cloudflare Free at edge)** | n/a | n/a | If Cloudflare blocked/suspended, grey-cloud the records to revert to direct origin in 5–10 min | Owner |
| **R11** | Sales team unavailable to operate Pending Confirmation queue at SLA | Medium | Medium | Owner trains team Sprint 10–11; documented procedure ready by M1 | Owner |
| **R12** | Tester feedback during Sprint 12 surfaces critical bug requiring >2 days fix | Medium | High | Buffer period after M1 absorbs; M1 = closed beta, not full public launch — feedback expected | Tech lead |
| **R13** | Egyptian work week (Sun–Thu) vs. plan assumption (Mon–Fri) misalignment | Medium | Low | Verify Sprint 1; shift dates if needed (no scope impact) | Owner |
| **R14** | Live Paymob production webhook signing differs subtly from sandbox | Medium | Medium | Test live transaction in Sprint 11; have rollback to sandbox-style handler if needed | D3 |
| **R15** | M1 merchant accounts not approved means M1 launches without live payments | Low | High | If happens, M1 launches with COD-only — degraded but acceptable; live payments switch on as merchants approve | Owner |

---

## Assumptions

The plan depends on the following holding true. If any are wrong, sprint dates and/or scope must adjust:

1. **Sprint 1 starts Monday 2026-04-20.**
2. **All 3 developers are full-time and available from Day 1.** No one is split with another project, on extended leave, or being onboarded for >1 week.
3. **Working week is Mon–Fri.** If Egyptian Sun–Thu, all dates shift back by 2 days.
4. **Hostinger KVM2 VPS provisioned by Sprint 1 Day 1.** If procurement is in progress, Sprint 1 starts late.
5. **Owner provides domain name + WhatsApp business phone procurement + Paymob application docs by Sprint 1 Day 1.** *(Fawry application removed per ADR-022.)*
6. **Catalog data team is identified and starts data preparation in Sprint 2.** Without dedicated data effort, M1 launches with sparse catalog (degraded UX).
7. **Sales team is trained on the new system by Sprint 11.** Otherwise B2B Pending Confirmation queue sits idle = customer pain.
8. **No major scope additions during sprints.** New features go to v1.1 backlog, not mid-sprint scope.
9. **Eid al-Adha 2026 dates approximately May 26–30** (verify with Owner; could shift ±1 day).
10. **No infrastructure migrations during MVP** (e.g., switching VPS providers mid-build).
