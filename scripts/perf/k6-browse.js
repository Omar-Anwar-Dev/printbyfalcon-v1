// k6 browse-load scenario — Sprint 11 S11-D1-T2.
//
// Usage:
//   BASE_URL=https://staging.printbyfalcon.com k6 run scripts/perf/k6-browse.js
//
// Simulates 100 concurrent browsing users: home → search → product → category.
// No cart / no checkout — that lives in k6-checkout.js. No auth — all guest.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 20 }, // warm-up
    { duration: '1m', target: 100 }, // ramp to 100 VUs
    { duration: '3m', target: 100 }, // sustain
    { duration: '30s', target: 0 }, // cool-down
  ],
  thresholds: {
    http_req_failed: ['rate<0.001'],
    http_req_duration: ['p(95)<800'],
    errors: ['rate<0.001'],
  },
};

const BASE = (__ENV.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');

const SEARCH_TERMS = ['toner', 'ink', 'hp', 'canon', 'epson', 'paper', 'بخاخ'];

function pickSearchTerm() {
  return SEARCH_TERMS[Math.floor(Math.random() * SEARCH_TERMS.length)];
}

export default function browse() {
  // 1. Home
  let res = http.get(`${BASE}/ar`);
  let ok = check(res, { 'home 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(1 + Math.random() * 2);

  // 2. Catalog
  res = http.get(`${BASE}/ar/products`);
  ok = check(res, { 'catalog 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(1 + Math.random() * 2);

  // 3. Search
  res = http.get(`${BASE}/ar/search?q=${encodeURIComponent(pickSearchTerm())}`);
  ok = check(res, { 'search 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  sleep(1 + Math.random() * 2);

  // 4. Search suggest JSON
  res = http.get(
    `${BASE}/api/search/suggest?q=${encodeURIComponent(pickSearchTerm())}`,
  );
  ok = check(res, {
    'suggest 200': (r) => r.status === 200,
    'suggest json': (r) => {
      try {
        const j = r.json();
        return Array.isArray(j.results || j);
      } catch {
        return false;
      }
    },
  });
  errorRate.add(!ok);
  sleep(2 + Math.random() * 3);
}
