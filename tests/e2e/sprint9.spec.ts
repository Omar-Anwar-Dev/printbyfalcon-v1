import { expect, test } from '@playwright/test';

/**
 * Sprint 9 smoke suite — shipping / COD / VAT / promo-code settings + COD
 * reconciliation report. HTTP contract + auth-gate checks only; full
 * admin-authenticated walkthroughs are staging-manual (Sprint 5 / 6 / 7 / 8
 * pattern).
 */

test.describe('Sprint 9 — settings auth gates', () => {
  const owners = [
    '/en/admin/settings/shipping',
    '/ar/admin/settings/shipping',
    '/en/admin/settings/cod',
    '/ar/admin/settings/cod',
    '/en/admin/settings/vat',
    '/ar/admin/settings/vat',
    '/en/admin/settings/promo-codes',
    '/ar/admin/settings/promo-codes',
    '/en/admin/settings/promo-codes/new',
  ];
  for (const path of owners) {
    test(`${path} redirects anonymous to admin login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }

  test('/admin/orders/cod-reconciliation redirects anonymous', async ({
    page,
  }) => {
    await page.goto('/en/admin/orders/cod-reconciliation');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe('Sprint 9 — settings hub lists Sprint 9 cards', () => {
  test('anonymous hit to hub redirects before content renders', async ({
    page,
  }) => {
    // Hub is OWNER-only; unauthenticated = redirect. Sanity-check the
    // gate holds.
    await page.goto('/en/admin/settings');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
