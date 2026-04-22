import { expect, test } from '@playwright/test';

/**
 * Sprint 8 smoke suite — B2B Submit-for-Review queue, bulk-order tool, reorder
 * preview, sales rep dashboard widget. HTTP contract checks only — full
 * admin-authenticated walkthroughs are staging-manual (same pattern as
 * Sprints 5 / 6 / 7).
 */

test.describe('Sprint 8 — admin auth gates', () => {
  test('/admin/b2b/pending-confirmation redirects anonymous to admin login', async ({
    page,
  }) => {
    await page.goto('/en/admin/b2b/pending-confirmation');
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('admin/b2b/pending-confirmation locale-wrapped Arabic also redirects', async ({
    page,
  }) => {
    await page.goto('/ar/admin/b2b/pending-confirmation');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});

test.describe('Sprint 8 — B2B portal auth gates', () => {
  test('/b2b/bulk-order redirects anonymous to b2b login', async ({ page }) => {
    await page.goto('/en/b2b/bulk-order');
    await expect(page).toHaveURL(/\/b2b\/login/);
  });

  test('/ar/b2b/bulk-order also redirects', async ({ page }) => {
    await page.goto('/ar/b2b/bulk-order');
    await expect(page).toHaveURL(/\/b2b\/login/);
  });
});

test.describe('Sprint 8 — bulk-order lookup API', () => {
  test('/api/b2b/bulk-order/lookup returns 403 when not B2B', async ({
    request,
  }) => {
    const res = await request.get(
      '/api/b2b/bulk-order/lookup?productId=nonexistent',
    );
    expect(res.status()).toBe(403);
  });
});

test.describe('Sprint 8 — reorder preview API', () => {
  test('/api/orders/[id]/reorder-preview returns 404 anonymous', async ({
    request,
  }) => {
    const res = await request.get('/api/orders/nonexistent/reorder-preview');
    expect(res.status()).toBe(404);
  });
});
