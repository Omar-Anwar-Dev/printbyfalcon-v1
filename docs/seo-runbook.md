# SEO + Search Console Runbook

Practical playbook for monitoring and accelerating organic indexing of
`printbyfalcon.com`. Pairs with the code-side fixes shipped 2026-05-14
(see `decisions.md` ADR-077).

---

## TL;DR — What to do, in order

When GSC shows "Discovered — currently not indexed" for many URLs:

1. **Confirm sitemap is healthy** — `https://printbyfalcon.com/sitemap.xml`
   returns 200 with all expected URLs, and lists ~400 entries today.
2. **Submit/refresh the sitemap** in Search Console once after each batch
   of catalog additions — `Sitemaps → Add a new sitemap → sitemap.xml`.
3. **Manually request indexing** for the 10–20 highest-value URLs via
   Search Console → URL Inspection → "Request indexing" (5/day quota per
   property — see section 4).
4. **Wait 7–14 days.** Indexing on a domain younger than 60 days is
   throttled by Google by design; technical fixes accelerate the curve but
   don't bypass it.
5. **Recheck the Coverage report.** Expect "Discovered not indexed" to
   drop ~5–20 URLs/day on a healthy new site once internal-linking +
   sitemap freshness signals are in place.

---

## 1. What was shipped 2026-05-14 (code changes)

| Change | Why |
|---|---|
| `app/sitemap.ts` — `lastModified` anchored to module-load time, not `Date.now()` per request | Was reporting every URL as "just updated" on every fetch, killing the freshness signal |
| `app/sitemap.ts` — `x-default` hreflang on every entry | Google needed a deterministic default-locale fallback when picking canonical between AR + EN |
| `app/sitemap.ts` — image entries on product URLs | Surfaces product photos to Google Images |
| `app/sitemap.ts` — `revalidate` bumped from 5min → 30min | Stable sitemap cache is its own freshness signal |
| `app/[locale]/sitemap/page.tsx` — HTML sitemap landing | Single high-density anchor-tag page; every product is one hop from this URL |
| `app/[locale]/page.tsx` — categories grid + 24 featured products (was 8) | Denser internal-link surface from the homepage |
| `components/site-footer.tsx` — sitemap link in footer | Crawlers reach the HTML sitemap from every page |
| `app/[locale]/layout.tsx` + page metadata — `x-default` hreflang added | Same canonical-resolution help, on every page not just sitemap |
| `middleware.ts` — locale-prefix redirects upgraded 307 → 308 (Permanent) | Authority transfers to `/ar/...` instead of staying in limbo on `/...` |
| `lib/seo/indexnow.ts` + admin-catalog wiring | Bing + Yandex notification on product save (Google doesn't honor IndexNow) |

---

## 2. Manual GSC actions (do these now)

### 2a. Refresh the sitemap submission

1. Open https://search.google.com/search-console/sitemaps?resource_id=https://printbyfalcon.com
2. If `sitemap.xml` shows "Success" with the current date, you're done.
3. If it shows an older date or "Couldn't fetch", click the entry and
   "Remove", then add it again as `sitemap.xml`.

### 2b. Request indexing for the top 20 product/category pages

Quota: **5 URL submissions per day, per property.** Pick the 5 highest-
priority URLs and submit, then submit 5 more the next day, etc.

Suggested priority order (do per locale — submit AR first, then EN):

1. `https://printbyfalcon.com/ar/products` (catalog hub)
2. `https://printbyfalcon.com/ar/sitemap` (HTML sitemap — newly added)
3. `https://printbyfalcon.com/ar/categories/laserjet-printers`
4. `https://printbyfalcon.com/ar/categories/printing-supplies`
5. `https://printbyfalcon.com/ar/categories/pos-printers`

Then EN equivalents next day, then the top 5 best-selling product
detail URLs (look at admin → orders for the most-ordered SKUs).

**Steps per URL:**
1. Search Console → "URL Inspection" (top bar)
2. Paste URL, hit Enter
3. If shown "URL is not on Google", click "Request Indexing"
4. Wait for the queue dialog (15–60 seconds). Once it says "Indexing
   requested" → done. URL will be re-crawled within hours and typically
   indexed within 1–7 days.

### 2c. Confirm "Pages" report each week

URL: https://search.google.com/search-console/pages

Watch the trend, not the raw count:
- **Healthy:** indexed line goes up week-over-week; "Discovered not
  indexed" goes down or holds steady.
- **Stuck:** both lines flat for 2+ weeks → the new content isn't
  earning enough quality signals. Action items:
  - Add more internal links to the under-indexed pages (cross-link
    products from blog posts, build category-rich landing pages).
  - Acquire external backlinks (one good backlink from a Cairo printer-
    repair shop or an Egyptian B2B directory will accelerate this more
    than any code change).

---

## 3. Expected timeline (be realistic)

The domain went live 2026-04-19 (Sprint 1). As of 2026-05-11, Google had
indexed 34 of ~400 URLs. Typical curve for a brand-new Arabic-language
ecommerce property in Egypt:

| Domain age | Typical indexed % |
|---|---|
| 0–30 days | 5–15% (Google is sandboxing) |
| 30–60 days | 25–50% (technical signals start mattering) |
| 60–120 days | 60–85% (most discoverable content indexed) |
| 120–180 days | 85–95% (steady state for sites with healthy linking) |

The code changes shipped 2026-05-14 don't change the curve's shape — they
make sure we're on the upper end of each bucket, not stuck at the lower end.

**If by 2026-07-19 (3-month mark) indexing is still below 50%, the bottleneck
is content quality or backlinks, not technical SEO.** At that point:
1. Add long-form content to underperforming category pages (300+ words
   each, written for humans).
2. Pursue 5–10 backlinks from Egyptian directories, brand resellers,
   or printing trade publications.
3. Consider Google Ads to drive traffic (which Google interprets as a
   demand signal and re-prioritizes crawling).

---

## 4. Search Console quotas + tips

- **URL inspection / Request indexing:** 5 URLs/day. There's no UI to see
  remaining quota — count what you submit.
- **Sitemap submissions:** unlimited, but Google only refetches every 1–14
  days regardless of how often you submit.
- **Indexing API:** Google only honors it for `JobPosting` and
  `BroadcastEvent` schema types. Not useful for an ecommerce catalog.

---

## 5. IndexNow (Bing + Yandex) one-time setup

Code is already wired in (`lib/seo/indexnow.ts`). To activate:

1. Generate a 32-char hex key:
   ```bash
   openssl rand -hex 16
   ```
2. SSH to the VPS and edit `.env.production`:
   ```env
   INDEXNOW_KEY=<the-key-from-step-1>
   ```
3. Create the verification file at the public root:
   ```bash
   echo "<the-key-from-step-1>" > /var/pbf/storage/indexnow-key.txt
   ```
   (Or commit a `public/<key>.txt` in the repo — same effect.)
4. Restart the app: `docker compose restart app`
5. Verify: open `https://printbyfalcon.com/<the-key>.txt` — should return
   the key as plain text.
6. From this point onward, every product save fires an IndexNow ping in
   the background (errors swallowed, never blocks the admin save).

This affects Bing + Yandex indexing only. Google ignores IndexNow.

---

## 6. Monitoring

- **Weekly:** check Coverage report trend in GSC.
- **After each catalog import or major content change:**
  - Verify sitemap.xml is serving the new URLs (`curl | grep <slug>`).
  - Spot-check 1–2 new product pages for proper canonical + hreflang in
    `view-source:`.
- **Sentry:** the IndexNow ping helper logs warnings on failures (won't
  crash the app). If you see consistent failures, check that the
  `<key>.txt` file is still served at the public root.
