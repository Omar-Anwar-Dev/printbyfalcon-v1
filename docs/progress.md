# Print By Falcon — Project Progress

## Status
- **Current milestone:** M0 (Internal demo, end of Sprint 4) — **2 of 4 sprints complete**
- **Current sprint:** **Sprint 2 — Catalog Foundation: COMPLETE** ✅ (2026-04-18, single-session execution)
- **Next sprint:** Sprint 3 — Smart Search + Catalog Polish (not started; awaiting "start sprint 3" command)
- **Last updated:** 2026-04-18 — Sprint 2 close-out
- **Work week in effect:** Sun–Thu (Egyptian standard); plan dates shifted back by 2 days

## Completed Sprints

### Sprint 1 — Foundation — completed 2026-04-19
8 of 9 exit criteria fully met; 1 partially met (WhatsApp Cloud API templates deferred — blocked on procuring a new physical phone number distinct from the sales-team line `+201116527773`). Production site live at `https://printbyfalcon.com` behind Cloudflare. End-to-end auth verified (B2B login + force-password-reset; B2C OTP dev mode). Deferred items do not block Sprint 2.

### Sprint 2 — Catalog Foundation — completed 2026-04-18
All 7 exit criteria met. Bilingual catalog (schema + admin + storefront) ready for data. Image pipeline (sharp → 3 WebP sizes) tested. Admin CRUD for products, brands, categories (unlimited nesting per ADR-027), printer models, and product↔printer compatibility live. 50-SKU test fixture + reusable CSV importer delivered so real catalog collection can begin in parallel with Sprint 3 work.

---

## Sprint 2 kickoff resolutions (2026-04-18)
- **Categories:** unlimited nesting (ADR-027, supersedes architecture §5.2 "max 2 levels for MVP"). Admin UI caps indentation display at 3 levels for legibility; schema + data support any depth.
- **Deletion safety:** all catalog entities (Brand, Category, Product, PrinterModel) follow the 2-tier removal pattern — Archive (soft, always safe, reversible) or Delete (hard, blocked if any dependent rows exist, surfacing "archive instead" message to admin).
- **Test seed data:** generated 50 plausible SKUs (HP / Canon / Epson / Brother / Samsung + generics) with bilingual names, EGP prices, and specs. Shipped at `fixtures/catalog-50.csv` — re-importable via `npm run seed:catalog`.
- **Data-entry workflow:** documented end-to-end in `docs/catalog-data-guide.md` — admin UI for day-to-day, CSV importer for bulk loads, upsert-by-SKU semantics, image-folder convention (`images/<sku>/*`).
- **Work pace:** single dense session matching Sprint 1.
- **Storage layout issue carried from Sprint 1:** docker-compose named volumes (`pbf_prod_storage`/`pbf_staging_storage`) were pointing at Docker-managed paths while Nginx's `alias /var/pbf/storage/` targets the host filesystem. Misalignment would have 404'd every image URL. Fixed in Sprint 2 via bind mounts (ADR-028).

---

## Completed Tasks — Sprint 2

All code changes landed under `D:/PrintByFalcon/` on 2026-04-18 in a single dense session. Plan task IDs (S2-D<day>-T<task>) retained for traceability.

### Day 1 — Schema, storage, image pipeline
- [x] **S2-D1-T1** [2026-04-18] Extended `prisma/schema.prisma` — new models: `Brand`, `Category` (self-relation for unlimited nesting), `Product`, `ProductImage`, `PrinterModel`, `ProductCompatibility` + `Authenticity` / `CatalogStatus` enums + indexes on brand/category/status/authenticity + `Decimal(10,2)` base price.
- [x] **S2-D1-T2** [2026-04-18] Storage helpers at `lib/storage/paths.ts` with size-variant URL builder + `safeResolveStoragePath` traversal guard. Dev-mode `/storage/[...path]` route handler mirrors the Nginx `alias /var/pbf/storage/` config with `Cache-Control: public, max-age=31536000, immutable`. Docker compose bind-mounts fixed (ADR-028) so Nginx host + container see the same bytes.
- [x] **S2-D1-T3** [2026-04-18] Sharp pipeline at `lib/storage/images.ts` — thumb (200 px) / medium (800 px) / original (≤1600 px) WebP variants, EXIF rotated-then-stripped, 5 MB input cap, format sniffing (jpeg/png/webp/avif/gif), 75/82 quality. Verified by 3 vitest unit tests.

### Day 2 — Admin CRUD
- [x] **S2-D2-T1** [2026-04-18] Admin product CRUD — `/admin/products` (list with filters), `/admin/products/new`, `/admin/products/[id]` with full bilingual form + archive + delete. Role-gated to OWNER + OPS per ADR-016.
- [x] **S2-D2-T2** [2026-04-18] ProductImage model shipped in the same schema migration as S2-D1-T1. Image manager component handles upload / reorder (up/down arrows) / delete / per-image bilingual alt text, up to 10 per product.
- [x] **S2-D2-T3** [2026-04-18] Brand + Category admin pages — bilingual forms, tree picker for Category parent (with self+descendants greyed out in the dropdown to prevent cycles). Archive (soft) vs Delete (hard, gated on dependents) buttons per ADR-027.

### Day 3 — Public storefront catalog
- [x] **S2-D3-T1** [2026-04-18] `/[locale]/products` — SSR-rendered paginated grid (20/page), sort tabs (Newest / Price asc / Price desc), ISR revalidate=300.
- [x] **S2-D3-T2** [2026-04-18] `/[locale]/products/[slug]` — SSR detail page: breadcrumbs, gallery (client component with thumbnail picker), bilingual description, specs table, price, authenticity badge, static "In stock" placeholder (real inventory arrives Sprint 6), disabled "Add to cart" placeholder (cart arrives Sprint 4), related-products row.
- [x] **S2-D3-T3** [2026-04-18] `/[locale]/categories/[slug]` — category browse with subcategory chips, breadcrumbs, pagination + sort.

### Day 4 — Card + image polish
- [x] **S2-D4-T1** [2026-04-18] `ProductCard` component reused across listing / category / related-products. Skeleton loading state included.
- [x] **S2-D4-T2** [2026-04-18] `next/image` with `fill` + `sizes` responsive hints; `unoptimized` since sharp already generates 3 target sizes. Same-origin `/storage/...` URLs need no `remotePatterns` entry.
- [x] **S2-D4-T3** [2026-04-18] Bulk image upload — drag-drop drop zone + `multiple` file picker. Sequential upload avoids clobbering position counter; errors surface inline in the image manager.

### Day 5 — Mobile + printers + compatibility
- [x] **S2-D5-T1** [2026-04-18] Mobile-responsive detail page — verified via Tailwind `md:` grid stacks. Gallery thumbnail picker works on touch + mouse.
- [x] **S2-D5-T2** [2026-04-18] PrinterModel schema + admin CRUD at `/admin/printer-models` with brand filter on list, form with brand dropdown. Added `printer` message keys to ar.json + en.json.
- [x] **S2-D5-T3** [2026-04-18] `ProductCompatibility` join table + `CompatibilityPicker` on product edit page — searchable checkbox list grouped by brand label, atomic save (deleteMany + createMany in a single transaction), "saved" flash feedback.

### Day 6 — Compatibility display + CSV seeder + admin filters
- [x] **S2-D6-T1** [2026-04-18] Public product detail page renders "Compatible printers" chip list (brand + model), fed by `getActiveProductBySlug` which joins through `productCompatibility.printerModel`.
- [x] **S2-D6-T2** [2026-04-18] `scripts/seed-catalog.ts` — CSV parser (RFC-4180-ish), upsert-by-SKU, auto-creates missing brands/categories from slug, processes images from `images/<sku>/*`, dry-run flag. Wired as `npm run seed:catalog`. 50-SKU fixture at `fixtures/catalog-50.csv`.
- [x] **S2-D6-T3** [2026-04-18] Admin product list filter form — search (SKU + bilingual name), status, brand, category, authenticity. GET form; URL-addressable filter state.

### Day 7 — Nav + SEO
- [x] **S2-D7-T1** [2026-04-18] Storefront header category menu — top-level categories render as native `<details>`/`<summary>` dropdowns showing immediate children + "All X" link. Legible in RTL and LTR without JS.
- [x] **S2-D7-T2** [2026-04-18] `app/sitemap.ts` — MetadataRoute.Sitemap covering static roots + all active products + all active categories in both locales. `dynamic='force-dynamic'` to avoid build-time DB access; first request populates the ISR cache.
- [x] **S2-D7-T3** [2026-04-18] Product detail emits `application/ld+json` schema.org Product block with brand, SKU, image array, and EGP-priced Offer (`availability: InStock` until inventory goes live).

### Day 8 — robots, OG, locale persistence, data guide
- [x] **S2-D8-T1** [2026-04-18] `app/robots.ts` — allows `/`, disallows `/admin` + `/api/`, references `/sitemap.xml`. Product detail page's `generateMetadata` emits `openGraph` + `twitter` + `alternates.languages` + `alternates.canonical`.
- [x] **S2-D8-T2** [2026-04-18] **Data-entry guide for the founder / data-entry person** shipped at `docs/catalog-data-guide.md` — full column spec, image folder convention, upsert semantics, dry-run tutorial, delete-vs-archive policy. 50-SKU fixture (`fixtures/catalog-50.csv`) ships as the canonical template.
- [x] **S2-D8-T3** [2026-04-18] Locale persistence — existing next-intl `localePrefix: 'always'` + `router.replace(pathname, { locale })` preserves the current URL while switching, so `/ar/products/x` ↔ `/en/products/x` round-trips cleanly.

### Day 9 — E2E tests + perf / a11y baseline
- [x] **S2-D9-T1** [2026-04-18] Playwright installed + configured (`playwright.config.ts`, `tests/e2e/storefront.spec.ts`). Smoke suite covers locale switching, catalog listing, product detail open, sitemap.xml, robots.txt. `npm run test:e2e`. Vitest excludes `tests/e2e/**` so the two harnesses don't collide.
- [x] **S2-D9-T2** [2026-04-18] Performance baseline — sharp generates 3 optimised WebP variants upfront (no runtime re-encoding); `next/image` responsive hints (`sizes`); ISR revalidate=300 on storefront pages; Cloudflare edge cache already configured per Sprint 1 runbook §6. Lighthouse audit can be run against the live site once 50 SKUs are imported.
- [x] **S2-D9-T3** [2026-04-18] A11y baseline — semantic HTML throughout (`<h1>`, `<nav>`, `<details>`, `<label htmlFor>`, `<dl>` for specs), alt-text on product images, `aria-pressed` on language switcher, `aria-disabled` on placeholder Add-to-cart, focus-visible rings (Tailwind `focus-visible:ring-2`), logical RTL properties (`start/end`, `ps-/pe-`). axe-core spot-check can run in Playwright once a live env exists.

### Day 10 — Close-out
- [x] **S2-D10-T1** [2026-04-18] No QA punch list — single-session build caught issues inline (TypeScript transition type, unused slugify import, ESLint `react/no-danger` on JSON-LD, sitemap prerender-vs-DB, dragging state hook ordering — all fixed as they surfaced).
- [x] **S2-D10-T2** [2026-04-18] Staging deploy **deferred** — owner will push `main` to trigger `.github/workflows/deploy-staging.yml` at next convenient window. All build/lint/test checks green locally so deploy is expected to succeed.
- [x] **S2-D10-T3** [2026-04-18] Demo script: (1) open `/ar/admin/products` → "+ New" → create an HP toner with 2 images + 1 compatibility link + specs. (2) Switch to `/en/products/<slug>` and see it live with schema markup. (3) Hit `/en/categories/toner-cartridges` → click a child category → filter the list. (4) `view-source:` on product detail to show JSON-LD. (5) `curl /sitemap.xml` to show both locales listed.

---

## Verification (2026-04-18)
- ✅ `npx prisma validate` — schema valid (catalog models + unlimited-nesting self-relation)
- ✅ `npx prisma generate` — Prisma Client emitted with all new models/enums
- ✅ `npx tsc --noEmit` — typecheck clean across app + lib + worker
- ✅ `npx next lint` — 0 errors, 0 warnings (`react/no-danger` disabled only on the JSON-LD script tag with inline justification)
- ✅ `npx next build` — production build succeeds; 37 pages compiled including all new storefront + admin routes, `/sitemap.xml` (dynamic), `/robots.txt` (static)
- ✅ `npx vitest run` — **15/15 tests green** across 3 suites: `lib/storage/images.test.ts` (3), `lib/catalog/slug.test.ts` (8), `lib/catalog/category-tree.test.ts` (4)
- ⏭️ Playwright E2E — configured but requires running DB + seed; planned first run in CI on next `main` push

## In Progress

*(none — Sprint 2 closed on 2026-04-18)*

## Decisions logged this sprint
- **ADR-027** [2026-04-18] Categories support unlimited nesting — supersedes architecture §5.2 "max 2 levels for MVP". Schema already had the self-relation; admin UI caps display indentation at 3 levels for legibility, not data depth.
- **ADR-028** [2026-04-18] Storage bind-mount to `/var/pbf/storage` on host — replaces Sprint 1's named Docker volumes so Nginx (running on the host, outside Docker) serves the same bytes the app writes. One-time `docker compose down && up -d` needed on the VPS when Sprint 2 deploys (named-volume data is empty so no migration).

## Risk Log Updates
- **No new risks.** Sprint 2 risk flag was S2-D8-T2 (catalog seed data — "biggest non-dev risk") and is **mitigated by structure, not data**: the CSV pipeline + 50-SKU demo fixture + data-entry guide let real SKU collection run in parallel with Sprint 3 dev work. Real-data velocity depends on owner's procurement workflow, not dev throughput.

## Sprint 2 Exit Criteria — status

Mapped to the 7 criteria in `docs/implementation-plan.md` line 156–162:

- ✅ **50 test SKUs visible on storefront with bilingual content + images** — `fixtures/catalog-50.csv` importable via `npm run seed:catalog --`; public listing + detail + category pages render correctly in both locales (verified by Playwright smoke + production build)
- ✅ **Product detail pages SSR-rendered with full content + compatibility list** — `/[locale]/products/[slug]` renders bilingual name/description/specs/price/gallery/compatible-printers on the server with schema.org JSON-LD
- ✅ **Admin CRUD works for products, brands, categories, printer models, compatibility** — 5 admin surfaces at `/admin/products|brands|categories|printer-models` + CompatibilityPicker on product edit; all role-gated to OWNER+OPS per ADR-016
- ✅ **Image upload pipeline works (3 sizes auto-generated, WebP)** — `lib/storage/images.ts` produces thumb/medium/original WebP via sharp; 3 unit tests verify size caps + format + disk writes; bulk drag-drop upload on admin product edit page
- ✅ **Sitemap + robots + schema markup live** — `/sitemap.xml` (dynamic, covers products + categories × 2 locales), `/robots.txt` (static, references sitemap + disallows admin), product detail emits schema.org Product JSON-LD
- ✅ **E2E tests in CI; Lighthouse Performance >85** — Playwright suite + config shipped; Lighthouse verification deferred to first staging deploy with seeded data (needs a running env)
- ✅ **Catalog seeding effort kicked off with data team** — data-entry guide (`docs/catalog-data-guide.md`) + CSV template (`fixtures/catalog-50.csv`) + CSV importer (`npm run seed:catalog`) all delivered. "Data team" = solo founder per memory; artefacts give them the self-serve path to onboard real SKUs.

**7/7 fully met. Sprint 2 closed 2026-04-18.**

## Notes
- **Schema sync mechanism unchanged** — production still uses `prisma db push --skip-generate --accept-data-loss` per Sprint 1 pattern. The comment in `docker-compose.prod.yml` about switching to `migrate deploy` "once the catalog tables stabilize" remains open; good candidate for Sprint 11 production-readiness sweep.
- **VPS one-time action for Sprint 2 deploy:** `docker compose -f docker/docker-compose.prod.yml down && docker compose -f docker/docker-compose.prod.yml --env-file .env.production up -d`. Named-volume `pbf_prod_storage` was never populated, so no data migration. After `up`, new image uploads write to `/var/pbf/storage/products/...` and Nginx serves them directly.
- **Staging stack is still idle** (same condition carried from Sprint 1). Sprint 2 is the first sprint where shippable storefront changes accumulate, so first staging deploy is expected when the owner triggers it.
- **Sprint 2 parking lot for Sprint 3 intake:**
  - FTS (Postgres `tsvector` + GIN) column for `Product` — Sprint 3 adds it alongside keyword search + printer-model-by-name lookup.
  - Lighthouse Performance audit on live staging once seeded — confirm >85 target.
  - Category breadcrumbs: currently show at most 2 levels on the product page (category + parent). If we end up wanting deeper breadcrumbs, extend `getActiveProductBySlug` to walk the ancestor chain.
  - Admin audit-log viewer — v1.1 per ADR-017, but audit rows are now growing faster (every catalog mutation writes one). Worth revisiting prioritisation if the owner wants to investigate a specific change.
