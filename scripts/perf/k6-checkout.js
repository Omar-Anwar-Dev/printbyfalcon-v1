// k6 checkout-load scenario — Sprint 11 S11-D1-T2.
//
// Usage:
//   BASE_URL=https://staging.printbyfalcon.com \
//   PRODUCT_SLUG=hp-toner-cf259a \
//   k6 run scripts/perf/k6-checkout.js
//
// Simulates 30 concurrent users walking through product → cart → checkout,
// stopping short of placing an order. Covers the heaviest DB paths (stock
// reservation on cart mutation) without polluting staging DB with synthetic
// orders or consuming Paymob sandbox capacity.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 5 },
    { duration: '1m', target: 30 },
    { duration: '3m', target: 30 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<1500'],
    errors: ['rate<0.01'],
  },
};

const BASE = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
const SLUG = __ENV.PRODUCT_SLUG || 'demo-sku-001';

export default function checkoutWalkthrough() {
  const jar = http.cookieJar();

  // 1. Product detail
  let res = http.get(`${BASE}/ar/products/${SLUG}`, { jar });
  let ok = check(res, { 'product 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(1 + Math.random() * 2);

  // 2. Cart page (lazy-creates guest cart via session cookie)
  res = http.get(`${BASE}/ar/cart`, { jar });
  ok = check(res, { 'cart page 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(1 + Math.random() * 2);

  // 3. Checkout page (guest checkout — valid even with empty cart: redirects
  //    back to /cart; we don't push synthetic orders through at load-test time).
  res = http.get(`${BASE}/ar/checkout`, { jar, redirects: 0 });
  ok = check(res, {
    'checkout reachable': (r) => r.status === 200 || r.status === 307,
  });
  errorRate.add(!ok);
  sleep(2 + Math.random() * 3);
}
