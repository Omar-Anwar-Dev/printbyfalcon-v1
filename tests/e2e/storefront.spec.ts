import { expect, test } from '@playwright/test';

test.describe('storefront — catalog smoke', () => {
  test('lists products in Arabic and Latin locales', async ({ page }) => {
    // Arabic (default) root redirects to /ar/
    await page.goto('/ar/products');
    await expect(page).toHaveURL(/\/ar\/products/);
    // Catalog heading present; works whether or not the DB has products.
    await expect(page.locator('h1').first()).toBeVisible();

    await page.goto('/en/products');
    await expect(page).toHaveURL(/\/en\/products/);
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('switches locale without losing the current route', async ({ page }) => {
    await page.goto('/ar/products');
    await page.getByRole('button', { name: 'EN' }).click();
    await expect(page).toHaveURL(/\/en\/products/);
    await page.getByRole('button', { name: 'AR' }).click();
    await expect(page).toHaveURL(/\/ar\/products/);
  });

  test('opens a product detail page when products exist', async ({ page }) => {
    await page.goto('/ar/products');
    const firstProduct = page.locator('a[href*="/products/"]').nth(0);
    // If the DB is empty (fresh staging), skip rather than fail — the page
    // should still render "no products yet" cleanly.
    const count = await firstProduct.count();
    test.skip(count === 0, 'no seeded products in this environment');
    await firstProduct.click();
    await expect(page.locator('h1').first()).toBeVisible();
  });

  test('exposes /sitemap.xml with content', async ({ request }) => {
    const res = await request.get('/sitemap.xml');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text).toContain('<urlset');
    expect(text).toContain('/ar');
  });

  test('exposes /robots.txt with sitemap reference', async ({ request }) => {
    const res = await request.get('/robots.txt');
    expect(res.status()).toBe(200);
    const text = await res.text();
    expect(text.toLowerCase()).toContain('sitemap:');
  });
});
