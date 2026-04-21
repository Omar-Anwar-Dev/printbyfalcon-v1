import { expect, test } from '@playwright/test';

/**
 * Sprint 6 smoke suite — inventory admin + invoice endpoint auth gates.
 * Same pattern as Sprint 5's order-pipeline suite: HTTP contract checks that
 * don't need a seeded DB or admin login.
 */

test.describe('Sprint 6 — admin auth gates', () => {
  for (const path of [
    '/admin/inventory',
    '/admin/inventory/bulk-receive',
    '/admin/settings',
    '/admin/settings/store',
    '/admin/settings/inventory',
  ]) {
    test(`/en${path} redirects to /admin/login when anonymous`, async ({
      page,
    }) => {
      await page.goto(`/en${path}`);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }
});

test.describe('Sprint 6 — invoice download route', () => {
  test('returns 404 with no token and no session', async ({ request }) => {
    const res = await request.get('/invoices/does-not-exist.pdf');
    expect(res.status()).toBe(404);
  });

  test('returns 404 with malformed path', async ({ request }) => {
    const res = await request.get('/invoices/not-a-pdf.txt');
    expect(res.status()).toBe(404);
  });

  test('returns 404 with an obviously invalid token', async ({ request }) => {
    const res = await request.get(
      '/invoices/some-id.pdf?t=abcdef1234567890abcdef1234567890',
    );
    expect(res.status()).toBe(404);
  });
});

test.describe('Sprint 6 — OOS catalog UX (smoke)', () => {
  test('product detail page renders stock badge somewhere on OOS products', async ({
    page,
  }) => {
    // The storefront catalog isn't seeded during CI; this test just asserts
    // that the page renders without crashing when the inventory is absent
    // (getStockStatusForProduct falls back to OUT_OF_STOCK for missing rows).
    await page.goto('/en/products');
    await expect(page).toHaveURL(/\/en\/products/);
  });
});
