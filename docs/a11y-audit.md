# Accessibility Audit — Sprint 11 S11-D5-T1

**Target:** PRD §8 — WCAG 2.1 Level AA for storefront + B2B portal (admin best-effort, lower bar).
**Tooling:** code-level review (this pass) + `scripts/perf/axe-audit.sh` (ops runs on staging) + manual NVDA + VoiceOver test (ops).

## Code-level review findings

Grep-scanned the repo for common a11y anti-patterns. Below is the summary.

### ✅ Already good
- **Semantic HTML landmarks** — `<main>`, `<nav>`, `<header>`, `<footer>`, `<aside>` used appropriately across 8 component files. Layout wraps children in `<main>` at [app/[locale]/layout.tsx:60](../app/[locale]/layout.tsx:60).
- **Form labels** — 22 files across storefront + admin use `<Label htmlFor>` or native `htmlFor` to associate labels with inputs (71 instances sampled). B2B signup, sign-in, admin login, product form, category form, brand form, courier form, promo code form, compatibility picker — all compliant.
- **Focus management** — shadcn/ui primitives (`button`, `input`, `select`, `textarea`, `dialog`) ship `focus-visible:ring-2` at the token level.
- **Language attribute** — `document.documentElement.lang` + `dir` set via inline `<Script strategy="beforeInteractive">` before content paints ([app/[locale]/layout.tsx:54](../app/[locale]/layout.tsx:54)).
- **Color contrast** — tokens defined in ADR-031 meet WCAG 2.1 AA body text (4.5:1) + large text (3:1) per the contrast table in `docs/design-system.md`. Ink on Canvas = 17.7:1; Ink-Cyan accent on Canvas = 5.2:1.
- **RTL/LTR** — Tailwind logical properties (`ps-`, `pe-`, `ms-`, `me-`) used throughout the UI foundation pass, not fixed `pl-`/`pr-`.
- **Image alt text** — only 2 raw `<img>` usages in the codebase (checkout summary + admin store-info form); both have correct `alt` attributes (empty string for decorative thumbnails per WCAG ARIA11 technique; descriptive for the logo preview). `next/image` everywhere else via `components/catalog/product-card.tsx` etc. requires `alt` at compile time.
- **ARIA live + roles** — `role=`/`aria-*` attributes used in 20 components where dynamic content is relevant (toast, search suggest, cookie consent, whatsapp chat button, etc.).
- **Toast notifications** — `ToastProvider` at [components/ui/toast.tsx](../components/ui/toast.tsx) applies `role="status"` + `aria-live` per variant.

### ⚠️ Known trade-offs (post-M1 parking lot per progress.md UI-polish notes)
- **Storefront screens were polished only at the foundation level** in the 2026-04-19 UI pass; per-screen polish deferred to the M1-eve UI refiner pass. Expect the axe-core scan on staging to surface moderate/minor issues in cart/checkout/search pages that don't block M1.
- **Admin UI is best-effort per PRD §8.** Data tables (orders list, products list, companies list) may have heading-hierarchy quirks that axe-core flags; acceptable for M1.
- **Color-only state cues** — stock-badge colors (In Stock/Low/OOS) should be redundant with text; verified in [components/catalog/stock-badge.tsx](../components/catalog/stock-badge.tsx), labels always present.

## Ops-runnable scan

Run after Sprint 7–10 deploys to staging:

```bash
bash scripts/perf/axe-audit.sh https://staging.printbyfalcon.com
```

Scans 10 representative pages (home AR+EN, catalog AR+EN, search, cart, checkout, B2B signup, privacy, terms) with WCAG 2.1 A + AA rules, exits non-zero on any **serious** or **critical** violations. Moderate + minor are reported but don't fail — those are fair game for the M1-eve polish pass. Reports written to `scripts/perf/reports/YYYY-MM-DD-axe-*.json`.

## Manual screen-reader test plan

Owner-driven — automate can't catch everything. At minimum:

**NVDA on Chrome (Windows), AR locale:**
- [ ] Home page — heading hierarchy reads in order (h1 → h2 → h3); hero CTA labelled correctly; category rail items labelled.
- [ ] Product list → product detail — product card announces "Product: X, EGP Y, In Stock"; detail page reads price → stock → add-to-cart.
- [ ] Sign-in (B2C) — phone field labelled; OTP input labelled; error messages announced via `aria-live`.
- [ ] Cart → checkout — cart row items labelled; address fields labelled; payment method radios labelled as a group.
- [ ] B2B signup — all required fields announce "required"; error summary reads first on validation failure.

**VoiceOver on Safari (macOS), EN locale:**
- [ ] Same flows above.
- [ ] Language switcher announces current + available choice, not just the icon.
- [ ] Cookie banner announces "Cookie notice, essential cookies only" then "Got it" button.

## M1 readiness criterion
- ✅ Code-level review finds no serious anti-patterns.
- ⏳ **Ops-track — required for M1:** `scripts/perf/axe-audit.sh` runs with zero serious/critical violations on staging.
- ⏳ **Ops-track — required for M1:** NVDA pass on AR golden path (sign-in → browse → cart → checkout). VoiceOver EN pass is nice-to-have for MVP.
