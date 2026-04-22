# Performance test harness

Sprint 11 S11-D1-T1 + S11-D1-T2. Shipped as standalone scripts (not committed npm deps) so the production-readiness pass doesn't bloat the app image or add a Sentry-style wrapper layer. Ops runs these against staging after each sprint deploy.

## Lighthouse

Acceptance target (PRD §8 + Sprint 11 exit criteria): Performance **>90 mobile / >95 desktop** across storefront home, product detail, search, checkout, admin dashboard.

### Prerequisites

```bash
npm install -g lighthouse
# or one-off: npx -y lighthouse
```

### Run

```bash
bash scripts/perf/lighthouse.sh https://staging.printbyfalcon.com > scripts/perf/reports/$(date +%F)-staging.txt
```

The script sweeps the URL list in `scripts/perf/lighthouse-urls.txt`, runs Lighthouse against each in mobile + desktop, prints the four category scores, and exits non-zero if Performance drops below 90 (mobile) or 95 (desktop) on any page.

**First run expectation:** some pages will fail initial targets — track each failing page in `progress.md` and iterate (image optimization, lazy-load client components, reduce unused JS). The ~50 KB page budget from Sprint 3 is the sanity check.

## k6 load test

Acceptance target: 100 concurrent browsing users + 30 concurrent checkout placements, no 5xx, p95 < NFR limits.

### Prerequisites

```bash
# Windows (scoop)
scoop install k6

# macOS (brew)
brew install k6

# Linux
sudo apt-get install k6
```

Then set `BASE_URL` and a sample `PRODUCT_SLUG` that exists in the target env:

```bash
export BASE_URL=https://staging.printbyfalcon.com
export PRODUCT_SLUG=hp-toner-cf259a
```

### Scenarios

**Browse (100 VUs, 5 min, realistic ramp):**

```bash
k6 run scripts/perf/k6-browse.js
```

Simulates customers hitting the storefront: home → search → product detail → category browse. Asserts p95 TTFB < 800 ms and 5xx < 0.1%.

**Checkout (30 VUs, 5 min):**

```bash
k6 run scripts/perf/k6-checkout.js
```

Simulates the full checkout path short of actually placing an order — product → /cart → /checkout. Stops before `createOrderAction` to avoid polluting the staging DB with synthetic orders and burning Paymob sandbox rate. Asserts p95 < 1500 ms and checkout-page 200s > 99%.

### Output

k6 prints a summary table. Save to the reports dir:

```bash
k6 run --out json=scripts/perf/reports/$(date +%F)-k6-browse.json scripts/perf/k6-browse.js
```

## Pass/fail rubric (for Sprint 11 sign-off)

| Check | Target | Fail action |
|---|---|---|
| Lighthouse Performance — all 5 pages, mobile | > 90 | fix + re-run |
| Lighthouse Performance — all 5 pages, desktop | > 95 | fix + re-run |
| Lighthouse Accessibility — all 5 pages | > 90 | fix + re-run |
| k6 browse — p95 TTFB | < 800 ms | profile DB / Next cache |
| k6 browse — 5xx rate | < 0.1% | check GlitchTip + logs |
| k6 checkout — p95 TTFB | < 1500 ms | profile cart/stock queries |
| k6 checkout — 200 rate on /checkout | > 99% | check session/cookie flow |

Record the final pass in `docs/progress.md` Sprint 11 completion block.
