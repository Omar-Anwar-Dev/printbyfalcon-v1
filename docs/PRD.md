# Print By Falcon — Product Requirements Document

## 1. Overview

Print By Falcon is an e-commerce platform specialized in printers and printing supplies for the Egyptian market, serving both individual buyers (B2C) and companies (B2B). It replaces fragmented sales channels — Facebook page, WhatsApp messages, manual sales-team visits — with a unified digital experience that reduces friction for customers and manual work internally.

The platform offers smart product discovery (printer-to-consumable cross-reference, real-time stock visibility, bilingual catalog), a modern checkout with Egyptian payment methods (Paymob card + Cash on Delivery — see ADR-022), automated order tracking with WhatsApp notifications, a B2B portal with negotiated pricing and self-serve ordering or sales-rep-mediated review, and an integrated back-office that handles orders, inventory, invoicing, and customer management.

The MVP launches in Egypt only. Arab market expansion (Gulf, Levant) is planned for v2.

---

## 2. Goals & Success Metrics

### Primary goal
Replace the fragmented current sales experience with a single digital storefront that lets individuals self-serve and companies self-onboard, while equipping the operations team with a modern back-office that cuts processing time and manual support load.

### Success metrics — measured 6 months post-launch

| # | Metric | Target | Type |
|---|---|---|---|
| 1 | Share of B2C orders placed through the site (vs. Facebook/WhatsApp) | **60%** | Product KPI |
| 2 | Corporate accounts onboarded self-serve | **30** | Product KPI |
| 3 | Average order processing time (placement → handed to courier) | **2 days → 3 hours** | Product KPI |
| 4 | "Is it in stock?" support messages | **−70%** | Product KPI |
| 5 | Total revenue growth | **+100%** | Business north star (product + marketing-driven) |

### Non-goals (explicitly NOT in scope)
- Multi-country presence at MVP launch (Arab expansion = v2)
- Native mobile apps (mobile-first responsive web only)
- ETA e-invoice integration for MVP (PDF invoices only)
- Real-time courier API tracking (manual status updates with WhatsApp notifications)
- Embedded chat / live-chat platform (deep-link to WhatsApp instead)
- Marketplace model (3rd-party sellers)
- BI-grade analytics or reporting dashboards
- Multi-warehouse inventory
- Loyalty / points / referral programs

---

## 3. User Personas

### Persona 1 — Mahmoud, B2C Individual Buyer (Cairo)
- **Context:** SMB owner or freelancer with a personal printer at home/office; needs occasional consumables (toner, ink, paper).
- **How he buys today:** sees a Facebook ad → DMs the page asking "is X in stock and how much?" → waits for a reply → maybe phones to confirm → pays cash on delivery.
- **What he cares about:** finding the *right* consumable for his printer (he's not sure which cartridge fits), knowing the price upfront, knowing it's actually in stock, getting it delivered fast, paying flexibly.
- **Frustrations:** slow Messenger replies, "out of stock after I ordered" surprises, no way to check on his order, no card payment option for some sellers.
- **Tech comfort:** Average — uses Facebook, WhatsApp, Google daily; comfortable with cards and apps; reads Arabic primarily.

### Persona 2 — Hala, B2B Procurement Officer (Mid-size company in Giza)
- **Context:** Office manager at a company with 20–100 staff and a fleet of office printers. Orders monthly: toners, paper, replacement parts.
- **How she buys today:** the Print By Falcon sales rep visits or calls every few weeks with offers; she sends a list via WhatsApp/email; sales rep prepares an offer; she gets approval internally; rep places the order; invoice arrives later.
- **What she cares about:** negotiated pricing, bulk-order efficiency (she knows the SKUs), getting an invoice with her company's data, predictable delivery, being able to reorder a previous month's bundle in one click.
- **Frustrations:** waiting for the rep to call back, slow offer turnaround, manual back-and-forth on small order tweaks, no easy way to see what was ordered last month.
- **Tech comfort:** High — fluent with Excel, email, WhatsApp; uses corporate procurement tools elsewhere.

### Persona 3 — Ahmed, Owner & Operations Lead (You)
- **Context:** Owns Print By Falcon, manages a small team (3 sales reps, 2 ops, 1 finance). Wants growth without growing headcount proportionally.
- **What he cares about:** clean operational visibility (sales today, low stock, pending B2B applications), reducing manual work for ops, giving sales reps tools that scale, catching issues before customers complain.
- **Frustrations:** every order is touched manually; reporting is "ask the team"; B2B onboarding is artisanal; no audit trail when something goes wrong.

### Persona 4 — Mona, Operations Team Member
- **Context:** Processes 30–80 orders/day across Facebook DMs, WhatsApp, phone, and the sales reps. Confirms stock, prepares packages, hands to courier, follows up on issues.
- **What she cares about:** seeing all orders in one place, fast status updates, correct invoices, knowing what's in stock without walking to the warehouse.
- **Frustrations:** orders scattered across channels, manual stock checks, customers asking "where is my order?" all day.

### Persona 5 — Karim, Sales Rep (B2B)
- **Context:** Visits/calls 50+ corporate customers/month. Negotiates pricing, takes orders, follows up on delivery, handles payment terms.
- **What he cares about:** seeing his B2B customers' orders, knowing which companies need follow-up, having structured customer info instead of WhatsApp scrolls.
- **Frustrations:** customer history lives in his phone; preparing offers is manual; admin doesn't know what's pending.

---

## 4. User Stories

Grouped by persona. Each MVP story has an explicit acceptance criterion. (Comprehensive acceptance criteria per feature live in §5.)

### B2C (Mahmoud)
- **As Mahmoud,** I want to enter my printer's model and see only compatible toners/inks, so I don't buy the wrong cartridge. *Acceptance: search by printer model returns ranked compatible products.*
- **As Mahmoud,** I want to see whether each product is in stock right now (not "let me check"), so I don't waste time. *Acceptance: every product page shows live status — In Stock / Low Stock / Out of Stock.*
- **As Mahmoud,** I want to register quickly with my phone via a WhatsApp code (no password), so signup is fast. *Acceptance: phone → WhatsApp OTP → account created in <60 seconds.*
- **As Mahmoud,** I want to checkout as a guest the first time, so I don't have to commit to an account before I trust the shop. *Acceptance: guest checkout completes; post-order, "Save your order → create account" offered.*
- **As Mahmoud,** I want to pay by card, by Fawry/Aman pay-at-outlet, or by cash on delivery, so I have options. *Acceptance: all three methods work end-to-end on supported zones.* *(Pay-at-outlet routed via Paymob Accept's sub-integration per ADR-025 — single Paymob merchant account, no separate Fawry merchant.)*
- **As Mahmoud,** I want WhatsApp updates as my order progresses, so I don't have to message support. *Acceptance: WhatsApp message fires on every status change.*
- **As Mahmoud,** I want to see my order status and courier contact, so I can call the courier directly if urgent. *Acceptance: order detail page shows status timeline + courier name + courier phone.*

### B2B (Hala)
- **As Hala,** I want to apply for a corporate account online by filling a short form, so I don't wait for the sales rep. *Acceptance: B2B signup form takes <3 minutes; admin SLA <24h response.*
- **As Hala,** I want to see my company's negotiated prices throughout the catalog when logged in, so I know my actual cost. *Acceptance: prices update to tier-discounted (or per-SKU custom) values when company user is logged in.*
- **As Hala,** I want a bulk-order tool where I can quickly enter many SKUs and quantities, so I don't click through 30 product pages. *Acceptance: bulk-order page allows rapid SKU entry with autocomplete + qty per row + add-all-to-cart.*
- **As Hala,** I want to choose between paying online and submitting for review (so the rep handles payment terms), so I can pick what fits the order. *Acceptance: both options visible at checkout for default B2B accounts; admin can configure per company.*
- **As Hala,** I want to one-click reorder my last month's order, so recurring purchases are effortless. *Acceptance: any past order has a Reorder button; out-of-stock items flagged before adding to cart.*

### Admin / Owner (Ahmed)
- **As Ahmed,** I want a home dashboard with sales today/week/month and pending queues, so I see the state of the business in 10 seconds. *Acceptance: dashboard renders with revenue, queues, low-stock, top products, top customers.*
- **As Ahmed,** I want every state change captured in an audit trail, so I can investigate when things go wrong. *Acceptance: order, price, tier, approval, inventory changes all logged with user + timestamp.*
- **As Ahmed,** I want admin user roles (Owner / Ops / Sales Rep) so my team can't accidentally change pricing or see revenue they shouldn't. *Acceptance: role-based access enforced on every admin action.*

### Ops (Mona)
- **As Mona,** I want all orders from all channels in one screen, filterable by status and date, so I don't context-switch. *Acceptance: order list with filters, search by ID/name/phone, bulk status updates.*
- **As Mona,** I want one-click status updates with courier handoff metadata, so updating 30 orders takes minutes not hours. *Acceptance: bulk "Mark as Handed to Courier" with shared courier assignment.*
- **As Mona,** I want low-stock alerts so I order before we run out. *Acceptance: dashboard widget + daily email digest of items below threshold.*

### Sales Rep (Karim)
- **As Karim,** I want a queue of B2B applications and Submit-for-Review orders so I know who needs my attention. *Acceptance: two queues visible in admin with click-through to context.*
- **As Karim,** I want to assign pricing tier and credit terms when I approve a company, so the customer immediately sees correct prices. *Acceptance: approval form requires tier + credit terms; on approve, customer can log in with B2B pricing.*

---

## 5. Features

### MVP

#### Feature 1 — Bilingual product catalog + smart search
**Description:** Public catalog with bilingual product pages (AR/EN, RTL/LTR), filterable browse, keyword search, and printer-to-consumable compatibility cross-reference. Real-time stock indicator on every product. Pricing display is user-type-aware (catalog price for guests/B2C, negotiated price for logged-in B2B).

**User stories served:** Mahmoud's compatibility, stock visibility, browsing.

**Acceptance criteria:**
- Catalog supports 500–2,000 SKUs (Postgres full-text search; no separate engine for MVP)
- Browse by category with pagination + sort (relevance / price asc · desc / newest)
- Filters: brand, type, printer compatibility, **authenticity (Genuine / Compatible)**, price range, in-stock toggle
- Keyword search returns results in <500ms (p95)
- Entering a printer model returns compatible consumables, ranked by relevance
- Product page shows: title, bilingual description, specs, 3–5 images, price (user-type-aware), real-time stock status, compatibility list, add-to-cart
- **Stock indicator:** B2C sees vague status (In Stock / Low Stock / Out of Stock) · B2B logged-in sees exact count
- Full bilingual UI (AR-RTL / EN-LTR), URL scheme `/ar/...` and `/en/...`
- Product schema markup + auto-generated sitemap for SEO
- Mobile-first; TTI < 2s on 3G

**Out of scope for MVP:** semantic/AI search, product reviews & ratings, "customers also bought" recommendations, curated collections, homepage merchandising slots.

#### Feature 2 — Customer accounts (B2C + B2B)
**Description:** Two distinct authentication and account flows: B2C uses passwordless phone-based auth via WhatsApp OTP; B2B uses traditional email + password with admin-approved company accounts.

**User stories served:** Mahmoud's quick signup, Hala's corporate onboarding, Karim's B2B approval workflow.

**Acceptance criteria:**
- **B2C auth:** phone + WhatsApp OTP (6-digit, 5-min expiry, max 3 attempts, rate-limited). 30-day persistent session on trusted devices; new device requires fresh OTP.
- **B2B auth:** email + password (bcrypt cost 12). Standard email-based password reset.
- **Dedicated NEW WhatsApp number** for the store (separate from sales team's manual WhatsApp).
- **B2C registration:** phone → WhatsApp OTP → account created (collect name + phone, optional email).
- **B2B registration:** self-serve form → admin review queue → approval → welcome email
  - **Required fields:** company name, commercial registry #, tax card #, contact name, phone, email, password, delivery city
  - **Optional:** full address, estimated monthly volume
  - **Admin SLA target:** <24 hours
  - **Pending state:** can browse + checkout as B2C at standard prices; B2B pricing applies post-approval
- **Admin approval action:** assign pricing tier (A=10% / B=15% / C=custom per-SKU) + credit terms (none / Net-15 / Net-30 / custom limit)
- **Guest checkout (B2C):** no account required; post-order offer to "Save your order → create account" via the collected phone
- **Addresses:** up to 5 per user/company, one default, CRUD
- **Order history:** list + detail, filterable by status (company-wide for B2B given shared login)
- **Recovery:** B2C = support-assisted identity verification (CR#, order history, delivery address) · B2B = self-serve email reset

**Out of scope for MVP:** multi-user under one company with roles, social login, two-factor authentication, saved payment methods.

#### Feature 3 — Cart, checkout & Egyptian payments
**Description:** Persistent shopping cart with stock-aware checkout supporting Paymob card, Paymob-Fawry pay-at-outlet (per ADR-025 — via Paymob Accept's sub-integration, not a direct Fawry merchant), and Cash on Delivery for B2C; "Submit for Review" or "Pay Now" for B2B. Five-zone shipping with admin-configurable rates and COD policy.

**User stories served:** Mahmoud's payment options, Hala's checkout flexibility, Mona's structured order intake.

**Acceptance criteria:**
- **Cart:** persistent across sessions for logged-in users · session-based for guests · live stock check on add/update
- **B2C checkout flow:** Address → Shipping (zone auto-detected from governorate) → Payment → Review → Place
- **B2C payment methods:** Paymob (card), Paymob-Fawry pay-at-outlet (per ADR-025), Cash on Delivery
- **B2B checkout:** two options shown (admin-configurable per company):
  - **"Submit Order for Review"** — sales-rep-mediated; lands in admin queue with "we'll contact you within X hours" message
  - **"Pay Now"** — Paymob card / Paymob-Fawry / COD at B2B pricing, with optional PO reference field
  - **Default for new B2B accounts:** both options visible
- **Order confirmation:** email + WhatsApp + downloadable PDF invoice
- **Shipping zones (5):** Greater Cairo / Alex+Delta / Canal+Suez / Upper Egypt / Sinai+Red Sea+Remote
  - Rates, free-shipping threshold, governorate-to-zone mapping all admin-configurable
  - Single-tier (local couriers) only — Bosta API as optional premium tier deferred to v1.1
- **COD policy (admin-controlled):**
  - Fee (fixed amount or %)
  - Max order value
  - Per-zone availability toggle
- **VAT:** 14% applied to taxable items (admin can mark items tax-exempt) · prices shown inclusive · invoice breaks it out
- **Promo codes (basic):** % or fixed amount, min order, usage cap, expiry · entered at checkout

**Out of scope for MVP:** saved cards / card-on-file, BNPL (Valu/Contact/Sympl), split shipments, gift options, subscription / auto-reorder.

#### Feature 4 — B2B self-service portal
**Description:** Layered on top of the B2C catalog and checkout: negotiated pricing visible throughout, dedicated bulk-order tool, company profile with tier badge, free-text "Placed by" field for shared-login attribution, company-wide order history, and one-click reorder.

**User stories served:** Hala's bulk ordering, recurring orders, company-context experience.

**Acceptance criteria:**
- Negotiated pricing (tier A/B/C or per-SKU custom) shown throughout catalog, product pages, cart, checkout, order history when B2B user logged in
- **Bulk order tool:** dedicated page with SKU/name autocomplete + qty entry, live stock + price per row, add/remove/duplicate rows, "Add all to cart" in one click, keyboard-friendly
- **Company profile page:** view company info, pricing tier badge visible, edit contact details (CR#/tax card# read-only — admin only)
- **"Placed by (name)"** free-text field mandatory at B2B checkout · shown on invoice and every order history row
- **Company-wide order history:** all orders placed under the company's shared login, sortable + filterable
- **One-click reorder:** adds available items at current prices · notifies on out-of-stock/discontinued before cart submit
- **Admin sets per company:** checkout visibility = both options / Submit for Review only / Pay Now only (default = both)

**Out of scope for MVP:** RFQ workflow, customer-visible credit balance dashboard, per-product volume-tier discounts, CSV bulk upload, multi-user with buyer/approver roles, saved order templates.

#### Feature 5 — Order tracking (end-to-end)
**Description:** Customer-facing order detail page with full status timeline + courier contact + invoice download. Automatic notifications on every status change (B2C: WhatsApp · B2B: WhatsApp + email). Manual status updates by ops via admin (no courier API integration in MVP).

**User stories served:** Mahmoud's order visibility, ops team's manual workflow, reduction in support load (Metric #4).

**Acceptance criteria:**
- **Status pipeline:**
  - **B2C + B2B Pay Now:** `Confirmed → Handed to Courier → Out for Delivery → Delivered`
  - **B2B Submit for Review:** `Pending Confirmation → Confirmed → Handed to Courier → Out for Delivery → Delivered`
  - **Exception states (any order type):** `Cancelled` · `Returned` · `Delayed / Issue`
- **Courier handoff metadata** (admin captures): courier name (from editable partner list) · courier contact phone · waybill / internal tracking # · expected delivery date (auto-computed from zone defaults, overridable per order)
- **Notifications** (default all-on, admin opt-out per status):
  - **B2C:** WhatsApp only
  - **B2B:** WhatsApp + email
  - WhatsApp templates pre-approved by Meta (~3–5 business days, Sprint 1 critical path)
- **Order ID format:** `ORD-YY-DDMM-NNNNN` (serial resets daily, e.g., `ORD-26-1704-00003`)
- **Cancellation:** customer requests pre-delivery · admin approves/denies
- **Returns:** customer messages via WhatsApp · admin records in panel (no self-serve return UI in MVP)

**Out of scope for MVP:** real-time courier API tracking, customer-facing tracking URLs, delivery time-window selection, self-serve return workflow, reschedule delivery via portal, automated SLA monitoring.

#### Feature 6 — Admin order & back-office
**Description:** The operational control panel for the entire system. Houses order management, B2B approval queues, customer/company management, catalog management, returns log, settings, audit trail, and admin user management. Three roles (Owner / Ops / Sales Rep) enforce least-privilege access.

**User stories served:** Ahmed's visibility & control, Mona's daily ops, Karim's B2B workflow.

**Acceptance criteria:**
- **Roles:** Owner (full access) · Ops (orders, status, courier, returns, inventory read) · Sales Rep (B2B queues, tier/credit assignments, customer read)
- **Order management:** list with filters (status / date / customer type / payment / zone) · detail view with status actions + notes + pre-confirmation edits · search by ID / name / phone · bulk status updates with single courier assignment
- **B2B queues:** Pending Applications (approve with tier + credit terms) · Pending Confirmation (sales rep actions on Submit-for-Review orders)
- **Customer & company management:** B2C user profiles (order history, contact, deactivate) · B2B company profiles (tier, credit, addresses, contacts, order history) + per-SKU custom pricing overrides for Tier C
- **Catalog management:** products + categories + images + printer-compatibility mappings
- **Returns log:** reason, status, refund decision (no self-serve customer UI in MVP)
- **Settings panel:**
  - Shipping: zones, rates, free-shipping threshold (per user type), governorate-to-zone mapping
  - COD: fee (fixed or %), max value, per-zone availability toggle
  - Couriers: editable partner list
  - VAT rate (default 14%)
  - Promo codes CRUD
  - Per-status notification toggles (WhatsApp/email)
  - Store info (name, logo, contact)
- **Audit trail:** every state change logged (`user + timestamp + entity + action + before/after + note`) to DB · UI viewer deferred to v1.1
- **Admin user management:** CRUD admin users, assign roles, deactivate
- **Order notes:** internal (admin-only) + customer-visible (shown on order page)

**Out of scope for MVP:** audit trail UI viewer, saved filters / advanced search, keyboard shortcuts, automated workflow rules (auto-confirm, auto-assign), granular per-action permissions beyond role-based, multi-warehouse admin, purchase orders, supplier management, BI-grade reporting dashboards.

#### Feature 7 — Automated invoicing (PDF)
**Description:** Auto-generated PDF invoices on order confirmation, delivered via email + WhatsApp link, downloadable from admin and order pages. Versioned amendment policy preserves audit trail.

**User stories served:** Hala's tax/accounting needs, Ahmed's compliance, Mona's zero-manual-invoicing.

**Acceptance criteria:**
- **Numbering:** `INV-YY-NNNNNN` annual sequential (e.g., `INV-26-000123`)
- **Language:** Arabic only · product names use the Arabic name from catalog · SKU codes remain alphanumeric (e.g., `HP-CF259A`)
- **Auto-generate** on state transition to `Confirmed`:
  - B2C → on payment/COD selection
  - B2B Pay Now → on payment confirmation
  - B2B Submit for Review → when sales rep confirms
- **Content:**
  - Company header (name, logo, address, CR#, tax card#, phone)
  - Customer block (name, address, phone; for B2B: company CR# + tax card# + "Placed by" name)
  - Invoice # + date + order ID reference
  - Line items: SKU, Arabic product name, qty, unit price, line total
  - Subtotal + discount + shipping + **VAT 14% (broken out)** + grand total
  - Payment method + status
- **Delivery:** attached to confirmation email + downloadable from order detail page + WhatsApp link to PDF · admin can re-download from admin panel
- **Storage:** object storage on VPS filesystem (`/storage/invoices/`), permanent retention
- **Amendments:** admin regenerates → versioned (`v2`, `v3`, ...) with **"Amended"** watermark · previous versions retained for audit

**Out of scope for MVP:** ETA e-invoice submission, credit notes / formal refund invoices, proforma invoices, recurring invoices, invoice template customization UI, per-customer custom templates.

#### Feature 8 — Basic inventory management
**Description:** Single-warehouse stock tracking with cart-level soft holds and order-level firm reservations. Powers real-time stock visibility on the storefront and prevents overselling. Stock movement audit log for full traceability.

**User stories served:** Mona's stock visibility, Mahmoud's "is it in stock?" answer, Metric #4 reduction.

**Acceptance criteria:**
- **Single warehouse** (multi-warehouse → v1.1)
- **Per SKU:** current qty, committed qty, available qty (= current − committed) — what storefront uses
- **Operations:**
  - Receive stock (with note)
  - Adjust stock (with reason)
  - Automatic reservation on order placement (firm)
  - Automatic decrement on `Confirmed` state
  - Automatic release on `Cancelled` state
- **Cart-level soft hold:** 15-min TTL on cart add (prevents race conditions on hot items); auto-releases if cart abandoned or item removed
- **Low-stock alerts:** dashboard widget + daily email digest to admin/ops · admin-configurable thresholds (global default + per-SKU override)
- **Stock history per SKU:** every movement logged (`user + timestamp + reason + qty delta`) — ties into Feature #6 audit trail
- **Out-of-stock display:** product still shown with "Out of stock" badge (preserves SEO + exploration); add-to-cart hidden
- **Checkout safety:** re-validate stock on order submit · if insufficient, show clear error + allow qty adjustment

**Out of scope for MVP:** multi-warehouse / multi-location, purchase orders, supplier management, cost tracking (FIFO/LIFO/weighted average), barcode scanning, stock transfers, batch / lot tracking + expiry, cycle counting workflows, auto-reorder points, backorder management, "notify me when back in stock".

#### Feature 9 — WhatsApp support bridge + admin dashboard
**Description:** Floating "Chat with us" button across the site that deep-links to the sales team's existing manual WhatsApp number with context-aware pre-filled messages. Admin home dashboard with sales KPIs, operational queues, low-stock alerts, and top products/customers — role-filtered.

**User stories served:** all customers' support access, Ahmed's at-a-glance visibility, role-appropriate dashboards for Mona and Karim.

**Acceptance criteria:**

**WhatsApp bridge:**
- Floating "Chat with us" button on every page (bottom-right desktop · fixed bottom mobile)
- Opens WhatsApp via `wa.me/...` deep-link with **context-aware pre-filled message:**
  - On product page: *"Hi, I have a question about [product name] (SKU: XXX)"*
  - On order detail: *"Hi, I need help with order ORD-26-1704-00003"*
  - On general pages: *"Hi, I have a question"*
- **Target number:** sales team's existing manual WhatsApp number (NOT the new Cloud API number used for OTP/automated notifications)

**Admin dashboard widgets:**
- Sales today / week / month (with deltas)
- New orders awaiting action
- B2B pending applications
- B2B pending confirmation
- Low-stock alerts
- Returns pending
- Top 10 products (this month, by units)
- Top 10 customers (this month, by revenue)
- 30-day sales trend chart

**Role-based widget visibility:**
- **Owner** — all widgets
- **Ops** — operational widgets (orders, stock, returns, top products) · revenue widgets hidden
- **Sales Rep** — B2B widgets (pending apps, pending confirmation, top customers) · inventory + revenue hidden

**Out of scope for MVP:** embedded chat widget, bot-automated responses, multi-agent routing, canned responses, chat archive, configurable dashboards, custom date ranges, exports, cohort/LTV/conversion funnels, margin analysis, category breakdowns.

---

### v1.1 (3–4 months after MVP ships — themed roadmap, not committed plan)

**Full CRM** — company database import; activity tracking (calls/visits/emails); offer & proposal workflow; WhatsApp integration for sales team; lead/task management.

**B2B depth** — RFQ workflow; formal quote/approval; contract management; customer-visible credit balance & terms dashboard; per-product volume-tier discount display; CSV bulk upload; saved order templates; multi-user under company with buyer/approver roles.

**Inventory depth** — multi-warehouse / multi-location; purchase orders; supplier management & performance; cost tracking (FIFO/LIFO/weighted average); barcode scanning for receive/pack; cycle counting; backorder management.

**Reporting proper** — configurable dashboards; custom date ranges; CSV/Excel exports; margin analysis; category & customer analytics; cohort/LTV; **audit trail UI viewer**.

**Marketing & retention** — email/WhatsApp campaigns; abandoned cart recovery; loyalty/points program; product reviews & ratings; "customers also bought" recommendations; "notify me when back in stock".

**Advanced checkout** — saved cards / card-on-file; BNPL (Valu/Contact/Sympl); split shipments; gift options; subscription / auto-reorder.

**Tracking automation** — Bosta API integration as optional premium shipping tier; real-time tracking URLs; delivery time-window selection at checkout; self-serve return workflow with reason codes & pickup scheduling.

**Enterprise & compliance** — **ETA e-invoice submission**; credit notes & proforma invoices; invoice template customization; 2FA for B2B; automated workflow rules; granular per-action permissions.

**Search upgrades** — AI/semantic search; richer printer-compatibility cross-reference and inverse lookups.

**Live chat** — embedded chat widget; canned responses; optional bot auto-responses for FAQs.

---

### Post-MVP / v2

- **Arab market expansion** — Gulf (UAE, KSA) and/or Levant; multi-currency, multi-country tax rules, localized payment gateways and shipping partners.
- **Auto-replenishment forecasting** — predict B2B reorder cadence, flag at-risk SKUs, suggest POs.
- **Mobile apps** — iOS/Android (only if web + PWA proves insufficient).

---

## 6. Tech Stack

| Layer | Choice | One-line rationale | ADR |
|---|---|---|---|
| App framework | Next.js 15 (App Router, TypeScript) | SSR for SEO + matches team skills + single codebase | ADR-008 |
| Database | PostgreSQL 16 (self-hosted) | Relational fit + built-in FTS + mature | ADR-009 |
| ORM | Prisma | TypeScript-first, mature, great DX | ADR-009 |
| Queue | pg-boss (Postgres-backed) | One less service to run; fits expected scale | ADR-010 |
| Sessions | DB-backed (no Redis) | Simpler infrastructure | ADR-010 |
| Auth | Auth.js (NextAuth v5) — custom WhatsApp OTP + Credentials providers | Two-flow split fits B2C vs B2B segments | ADR-005 |
| Payment | Paymob hosted iframe (card + Paymob-Fawry sub-integration) + COD | Egypt-native, lower PCI burden; single Paymob merchant account covers card + Fawry (ADR-025) | (Phase 3) |
| WhatsApp | Meta WhatsApp Cloud API (direct) | Free auth templates, no middleman fees | (Phase 3) |
| File storage | VPS disk + Cloudflare Free CDN at edge | Adequate at MVP scale; B2 deferred to v1.1 | ADR-011, ADR-024 |
| PDF generation | react-pdf | JSX templating fits team's React skills | (Phase 3) |
| Transactional email | Hostinger SMTP | Already paid for | (Phase 3) |
| i18n | next-intl | Battle-tested with App Router; good RTL support | (Phase 3) |
| UI | Tailwind + shadcn/ui + Radix primitives | RTL-friendly via logical properties; copy-paste components | (Phase 3) |
| Forms + validation | react-hook-form + zod | Best-in-class DX; schemas reused server-side | (Phase 3) |
| Reverse proxy + SSL | Nginx + Certbot | Familiar; broader ecosystem | ADR-012 |
| Containerization | Docker + docker-compose | Matches team skill; reproducible envs | (Phase 3) |
| CI/CD | GitHub Actions | Free at this scale; standard | (Phase 3) |
| Error tracking | GlitchTip (self-hosted) | Sentry-compatible, lightweight | ADR-013 |
| Uptime monitoring | UptimeRobot (free) | 5-min checks, 50 monitors free | (Phase 3) |
| Server metrics | Netdata (open-source) | Real-time, lightweight, free | (Phase 3) |
| Logs | pino (structured JSON) + file rotation | Fast, structured, easy to grep | (Phase 3) |
| Backups | Hostinger snapshots + nightly local pg_dump | Simplicity prioritized; risk noted | ADR-014 |

---

## 7. Architecture

Single Next.js full-stack application running on a Hostinger KVM2 VPS with PostgreSQL 16, a pg-boss worker process, Nginx + Certbot at the origin, and GlitchTip for error tracking — all containerized via Docker Compose. **Cloudflare Free** sits at the edge (CDN/DNS/TLS/DDoS/WAF) per ADR-024; staging runs as a separate Docker stack on the same VPS (per ADR-015).

Full details in [docs/architecture.md](architecture.md).

---

## 8. Non-Functional Requirements

### Performance
- **Storefront TTI** < 2 seconds on 3G mobile (SSR + image optimization + minimal client JS)
- **Search** p95 latency < 500ms for keyword and printer-model queries (Postgres FTS with GIN index)
- **API response** p95 latency < 300ms for read endpoints, < 800ms for write endpoints (excluding external API calls)
- **Order placement** p95 < 1.5s end-to-end (excluding payment redirect)

### Security
- HTTPS enforced site-wide (Nginx 301 from HTTP)
- Strict HTTP security headers (CSP, HSTS 1y, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy)
- Passwords: bcrypt cost 12
- WhatsApp OTPs: SHA-256 hashed, 5-min expiry, max 3 attempts, rate-limited
- Session cookies: HttpOnly, Secure, SameSite=Lax, cryptographically random tokens
- CSRF: Server Actions origin-checked by default
- SQL injection: Prisma parameterized queries
- XSS: React escaping; no `dangerouslySetInnerHTML` for user content (lint-enforced)
- File uploads: image-only, MIME-sniffed, size-capped at 5 MB, sharp re-encoded
- Webhook signatures verified (Paymob HMAC, Meta token)

### Privacy & Compliance
- **Egyptian Personal Data Protection Law (Law 151 of 2020)** — minimum-necessary collection; lawful basis (contract performance) for order data; rights to access/correction supported via support
- **PII storage:** customer phone, email, name, addresses, order history. No payment card data stored (Paymob hosted iframe).
- **B2B data:** company CR#, tax card#, contact details — treated as commercial data
- **Data retention:** active accounts retained indefinitely; on account deletion request, anonymize after 5 years (legal retention for invoices)
- **No GDPR/HIPAA scope** (Egypt-only at MVP)
- **ETA e-invoice compliance deferred** to v1.1 (per ADR-003); risk acknowledged

### Accessibility
- **Target:** WCAG 2.1 Level AA for storefront and B2B portal (admin best-effort but lower bar)
- Semantic HTML; proper heading hierarchy
- ARIA labels on interactive controls; visible focus states
- Color contrast ratios per WCAG 2.1 AA (4.5:1 normal text, 3:1 large)
- Keyboard navigation throughout
- Screen-reader tested in Arabic and English (NVDA + VoiceOver minimum)
- Form errors announced via `aria-live`

### Scalability
- **Designed for:** 100–500 daily visitors, 30–80 orders/day, 500–2,000 SKUs
- **Headroom:** single VPS comfortably handles ~2,000 daily visitors with current stack; vertical-scale path (Hostinger KVM3/4) if traffic grows
- **Stretch (v2):** if scale demands it, migration paths exist for: Postgres → managed Postgres (Supabase/RDS); Next.js → multi-instance behind load balancer; pg-boss → Redis + BullMQ; file storage → object storage (B2/R2)

### Reliability
- **Uptime target:** 99% monthly (≈ 7.2 hours downtime/month — appropriate for single-VPS MVP)
- **RTO:** 4 hours (restore from snapshot)
- **RPO:** 24 hours worst case (between snapshot + nightly DB dump intervals)
- **Backup strategy** (per ADR-014): Hostinger snapshots (weekly) + nightly local `pg_dump` rotation (last 14 days). **Off-site backup not implemented at MVP** — risk acknowledged.
- **Incident response:** UptimeRobot alerts on downtime; logs + GlitchTip for diagnosis; manual restore procedure documented in runbook (release-engineer phase)

### Observability
- **Application logs** (pino structured JSON, rotated daily, 30-day retention)
- **Errors** (GlitchTip with request context)
- **Server metrics** (Netdata: CPU, RAM, disk, network)
- **Uptime** (UptimeRobot external HTTP check every 5 min)
- **Business metrics** (admin dashboard for sales KPIs)
- **Memory pressure** (Netdata alert at 90% RAM utilization — #1 watch metric)

---

## 9. Release Milestones

| Milestone | Target | Definition of Done | Sprint mapping |
|---|---|---|---|
| **M0 — Internal demo** | End of Sprint 4 (~Week 8) | Catalog browse + cart + B2C checkout (Paymob test) + basic admin orders panel demonstrable end-to-end on staging. Internal stakeholders only. | Sprints 1–4 |
| **M1 — Closed beta / Production launch** | End of Sprint 12 (~Week 24, Month 6) | All 9 MVP features acceptance-criteria-met. Live merchant accounts (Paymob; WhatsApp templates approved). 5 friendly B2C testers + 3 friendly B2B companies invited. Real orders processed. | Sprints 5–12 |
| **M2 — Public launch (post-MVP)** | TBD post-M1 (target: 1 month after M1) | Open registration; marketing campaign begins; success metrics tracked from this date. | Outside MVP |

**Note:** "Production launch" (M1) means **open for real orders** but with controlled audience. Public marketing and full open registration is M2 — happens after M1 has run for ~4 weeks of bug-shakeout.

---

## 10. Open Questions

| # | Question | Owner | Resolve by |
|---|---|---|---|
| 1 | Final domain name (`printbyfalcon.com` or alternative) | Owner | Sprint 1 day 1 |
| 2 | Sales team's existing WhatsApp number (for support bridge) | Owner | Sprint 1 day 1 |
| 3 | New WhatsApp Cloud API phone number procurement | Owner | Sprint 1 |
| 4 | Paymob merchant account application docs ready (CR, tax card, bank) | Owner | Sprint 1 day 1 |
| ~~5~~ | ~~Fawry merchant account application docs ready~~ — **dropped per ADR-022** | — | — |
| ~~6~~ | ~~Hostinger CDN actually included on KVM2~~ — **resolved 2026-04-19**: not included; ADR-023 keeps MVP CDN-less | — | — |
| 7 | Initial admin Owner email + temporary password | Owner | Sprint 1 |
| 8 | Brand logo + store info for invoice header + storefront | Owner | Sprint 2 |
| 9 | Arabic and English store name (if different) | Owner | Sprint 1 |
| 10 | Initial governorate-to-zone mapping defaults | Owner | Sprint 5 |
| 11 | First 50–100 SKUs for catalog seeding (test data + photos) | Data lead | Sprint 2 |
| 12 | Default low-stock threshold | Owner | Sprint 5 |
| 13 | Default COD fee + max value | Owner | Sprint 5 |
| 14 | Initial pricing tier defaults (A=10%? B=15%?) | Owner | Sprint 6 |

---

## 11. Change Log

| Date | Change | Reason |
|---|---|---|
| 2026-04-18 | Initial PRD | Phase 5 of product-architect workflow |
| 2026-04-19 | Drop Fawry direct integration; B2C payments = Paymob (card) + COD only | ADR-022 — minimum-vendor scope, accepted risk re: outlet-cash segment |
| 2026-04-19 | No CDN in MVP — direct Nginx serving with strong cache headers | ADR-023 — Hostinger CDN unavailable on KVM2; Cloudflare excluded by ADR-011 |
| 2026-04-19 | Adopt Cloudflare Free as CDN/DNS/TLS/DDoS/WAF edge | ADR-024 — supersedes ADR-023; reverses "no Cloudflare" part of ADR-011 |
| 2026-04-19 | Re-introduce Fawry pay-at-outlet via Paymob Accept sub-integration | ADR-025 — partially amends ADR-022; cost driver eliminated when Paymob auto-provisioned the sub-integration |
