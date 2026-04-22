import { expect, test } from '@playwright/test';

/**
 * Sprint 10 smoke suite — admin completeness routes (roles, users, invites,
 * customers, returns, return policy, WhatsApp bridge).
 *
 * HTTP-contract + auth-gate coverage only. Real role-matrix exercise (OWNER vs
 * OPS vs SALES_REP permissions) is staging-manual; the Server Action role
 * guards are unit-tested via `requireAdmin(allowedRoles)` in lib/auth.ts and
 * live in [lib/admin/role-matrix.ts](../../lib/admin/role-matrix.ts) as the
 * single source of truth.
 */

test.describe('Sprint 10 — admin completeness auth gates', () => {
  const ownerOnly = [
    '/en/admin/users',
    '/ar/admin/users',
    '/en/admin/users/new',
    '/en/admin/settings/returns',
    '/ar/admin/settings/returns',
  ];
  for (const path of ownerOnly) {
    test(`${path} redirects anonymous to admin login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }

  const ownerOrSalesRep = ['/en/admin/customers', '/ar/admin/customers'];
  for (const path of ownerOrSalesRep) {
    test(`${path} redirects anonymous`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }

  const ownerOrOps = ['/en/admin/orders/returns', '/ar/admin/orders/returns'];
  for (const path of ownerOrOps) {
    test(`${path} redirects anonymous`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login/);
    });
  }

  test('/admin/invite/accept with no token shows error', async ({ page }) => {
    await page.goto('/en/admin/invite/accept');
    await expect(page.getByText(/invalid link|link/i).first()).toBeVisible();
  });

  test('CSV export endpoint is admin-gated', async ({ request }) => {
    const res = await request.get('/api/admin/orders/export');
    // Anonymous should redirect or 302 — status code varies but never 200 CSV.
    expect([302, 307, 401, 403]).toContain(res.status());
  });
});

test.describe('Sprint 10 — WhatsApp chat bridge', () => {
  // With no supportWhatsapp configured the button should not render. Can't
  // reliably assert presence/absence without seeded StoreInfo — covered manually
  // in the Sprint 10 demo script.
  test('storefront root loads without error', async ({ page }) => {
    await page.goto('/en');
    await expect(page).toHaveTitle(/Print By Falcon/i);
  });
});
