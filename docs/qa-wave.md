# QA Wave — pre-launch polish on latest origin/main

**Started:** 2026-04-27 — local QA copy mounted at `D:/PrintByFalcon/PrintByFalcon Local Host`, Postgres on port 5433, dev server on http://localhost:3000.
**Branch under test:** `0f9f064` (origin/main, 16 commits ahead of stale local main).
**Code under test:** worktree `claude/stupefied-ramanujan-7727f0` (will receive fixes; PR'd to main → deploys).

## Severity scale
- **P0** Blocks core revenue path. Ship today.
- **P1** Visible UX defect / broken non-core flow. Ship before launch.
- **P2** Polish, copy, alignment. Ship if time.
- **P3** Nice-to-have, low-impact.

## Scope of this wave
9-feature sweep of every page + flow in B2C, B2B, and admin. Bilingual (AR-RTL / EN-LTR). Mobile-responsive. A11y spot-checks.

## Issue log

| # | Severity | Where | Symptom | Cause | Fix | Status |
|---|---|---|---|---|---|---|
| 1 | P2 | Storefront header nav + Categories section | All 5 categories render as raw slugs (`ink-cartridges`, `paper-media`, `parts-accessories`, `printers`, `toner-cartridges`) instead of bilingual names | `scripts/seed-catalog.ts::ensureCategory` creates new categories with `nameAr=slug, nameEn=slug` placeholders. Owner is expected to edit via admin, but the catalog-200 fixture creates these the moment it's imported on a fresh DB. Production has the same data path; owner manually edited prod once. | Added `BRAND_DEFAULTS` and `CATEGORY_DEFAULTS` maps in `scripts/seed-catalog.ts` keyed by slug → `{nameAr, nameEn}`; falls back to slug only if unknown. SQL UPDATE applied to existing local DB rows. | **fixed** ✅ |
| 2 | P3 | Storefront product grid | Every product card shows "لا توجد صورة" empty-state image | Catalog fixture ships SKUs without images (no `fixtures/images/<sku>/` folders) | Out of scope for code fixes — owner uploads real product photos via admin. The empty-state itself is fine. | wontfix-for-MVP |
| 3 | **P1** | Home page brand rail / `/products` route | Home brand rail links to `/products?brand=<slug>`, but `/products` only accepts `page` + `sort` params — `brand` is silently ignored, user lands on the unfiltered catalog. | `app/[locale]/products/page.tsx` searchParams type was `{ page?: string; sort?: string }`. Filter logic lived only on the `/search` route. | Extended `listActiveProducts` to accept `brandSlug`/`categorySlug`. Page now parses `?brand=<slug>` + `?category=<slug>`, applies them, renders an active-filters chip strip with one-click clear, and preserves the active filter set across sort/pagination links. Verified locally: `?brand=hp` → 68 of 200 products; `?brand=hp&category=toner-cartridges` → 35 of 200. | **fixed** ✅ |
| 4 | P2 | `/products` page | Beyond brand+category, no full filter sidebar (authenticity, price range, in-stock toggle). PRD §5 Feature 1 lists these. | Filters were built but live only on `/search`. | Partially addressed by #3 (brand+category via URL). A full sidebar with the remaining facets is queued as follow-up — `SearchFiltersSidebar` is already mounted on `/search` so users can pivot via the search box. | partial — followup |
| 5 | P2 | Hero heading | Accessible name on AR + EN reads "وأحبارأصلية" / "Authenticprinters and ink" — adjacent `<span>`s with a JSX `{' '}` separator collapse in the a11y tree (visual rendering preserves the space). | `app/[locale]/page.tsx` lines ~182-192 use `{' '}` between sibling text/`<span>` chunks. Browsers concatenate the text-tree without the whitespace child for screen readers. | Wrap the space in a real text node with content (e.g. `<span aria-hidden>{' '}</span>{' '}`), or restructure so the colored emphasis is a single string with class. | open |
| 6 | **P0 (security)** | All 7 forms with password inputs (admin login, B2B login, admin + B2C + B2B password change, B2B register, admin invite accept) | `<form onSubmit={...}>` with no `method` attribute → HTML default is `GET`, so any submit reached before React hydration completes (slow connection, JS error, password-manager autofill races, screen-reader plumbing) puts `password=...` in the URL. URL leaks into browser history, server access logs, Cloudflare logs, error-tracker stack traces, and `Referer` headers on subsequent navigation. Reproduced in dev: triggering the submit button via DOM `.click()` before hydration finished produced `?email=...&password=...` in the address bar with the dashboard rendered on top. | Added `method="post"` to all 7 affected forms. JS-driven `onSubmit` still calls the Server Action exactly as before; the attribute only changes the pre-hydration browser-default fallback. No behavior change for happy-path users. | **fixed** ✅ |

(More to come as the sweep continues…)

## Pages + flows to walk

### B2C — anonymous / guest
- [ ] `/ar` home (hero, categories, featured products, brands, footer)
- [ ] `/en` home (mirror)
- [ ] `/ar/products` (catalog list — sort, paginate, filter sidebar)
- [ ] `/ar/products?q=…` (search results)
- [ ] `/ar/products/<slug>` (product detail — gallery, specs, compatibility, add-to-cart, JSON-LD)
- [ ] `/ar/categories/<slug>` (category browse + subcategory chips)
- [ ] `/ar/cart` (line items, qty, totals, proceed)
- [ ] `/ar/checkout` (contact, address, payment radio, place order)
- [ ] `/ar/order/confirmed/<id>` (status pill, polling, save-account CTA)
- [ ] `/ar/sign-in` (phone → OTP)
- [ ] cookie consent banner
- [ ] floating WhatsApp chat button (deep link with context)

### B2C — signed-in
- [ ] `/ar/account` (profile + addresses + last orders)
- [ ] `/ar/account/orders` (history)
- [ ] `/ar/account/orders/<id>` (detail + timeline + courier + cancellation)
- [ ] `/ar/account/addresses` (CRUD, default toggle, 5-max)
- [ ] B2C checkout while signed-in (saved address)
- [ ] sign-out

### B2B
- [ ] `/ar/b2b/apply` (corporate signup form)
- [ ] (admin approves)
- [ ] B2B login (`/ar/sign-in` email tab)
- [ ] forced password change first login
- [ ] B2B catalog with negotiated pricing
- [ ] `/ar/b2b/bulk-order` (rapid SKU entry)
- [ ] B2B checkout — both options visible (Pay Now, Submit for Review)
- [ ] B2B order history — company-wide
- [ ] one-click reorder
- [ ] B2B account page (no B2C tabs per #45)

### Admin
- [ ] `/ar/admin/login` + force-password-change first login
- [ ] `/ar/admin` (dashboard widgets, role-filtered)
- [ ] `/ar/admin/orders` (filter, search, bulk update)
- [ ] `/ar/admin/orders/<id>` (status panel, courier modal, notes)
- [ ] `/ar/admin/orders/cancellations` queue
- [ ] `/ar/admin/orders/returns` log
- [ ] `/ar/admin/products` (list + new + edit + image manager + compatibility picker)
- [ ] `/ar/admin/brands` (CRUD + media upload from #47)
- [ ] `/ar/admin/categories` (CRUD + tree + media upload from #47)
- [ ] `/ar/admin/printer-models`
- [ ] `/ar/admin/customers` (B2C list)
- [ ] `/ar/admin/companies` (B2B list + per-SKU pricing)
- [ ] `/ar/admin/b2b/applications` (pending queue, approve flow)
- [ ] `/ar/admin/b2b/pending-confirmation` (sales rep queue)
- [ ] `/ar/admin/inventory` (stock list + adjust + receive + low-stock)
- [ ] `/ar/admin/couriers`
- [ ] `/ar/admin/settings/shipping` (zones, rates, governorate map)
- [ ] `/ar/admin/settings/cod` (fee, max, per-zone)
- [ ] `/ar/admin/settings/promo-codes`
- [ ] `/ar/admin/settings/notifications` (per-status opt-out)
- [ ] `/ar/admin/settings/store` (logo, contact)
- [ ] `/ar/admin/admins` (admin user CRUD)

### Cross-cutting
- [ ] All pages render in EN (mirror sweep)
- [ ] All pages mobile-responsive (375px width)
- [ ] Cookie consent banner doesn't block primary CTAs on first paint
- [ ] WhatsApp deep-link uses correct number + context message
- [ ] All forms have proper labels + error messages localized
- [ ] All buttons have visible focus rings
- [ ] No console errors on any route
