import { expect, test } from '@playwright/test';

test.describe('storefront — search + filters', () => {
  test('header search renders and is wired up', async ({ page }) => {
    await page.goto('/ar/products');
    // The header search input is rendered at least once (desktop OR mobile variant).
    const inputs = page.getByRole('combobox');
    await expect(inputs.first()).toBeVisible();
  });

  test('/search renders without a query (empty catalog OK)', async ({
    page,
  }) => {
    await page.goto('/ar/search');
    await expect(page).toHaveURL(/\/ar\/search/);
    await expect(page.locator('h1').first()).toBeVisible();
    // Should surface empty-state copy telling the user to enter a term.
    await expect(page.getByText(/أدخل كلمة|Enter a term/)).toBeVisible();
  });

  test('/search?q=X surfaces result header', async ({ page }) => {
    await page.goto('/en/search?q=toner');
    await expect(page.locator('h1').first()).toContainText(/Results for/);
    // Results count badge.
    await expect(page.getByText(/\d+ results/)).toBeVisible();
  });

  test('/search noindex robots meta', async ({ page }) => {
    await page.goto('/en/search?q=toner');
    const robots = page.locator('meta[name="robots"]');
    await expect(robots).toHaveAttribute('content', /noindex/);
  });

  test('sort tabs are reachable on /search', async ({ page }) => {
    await page.goto('/en/search?q=toner');
    // Price-asc tab should exist; clicking it should update URL.
    const priceAsc = page.getByRole('link', {
      name: /Price: Low to High/,
    });
    await expect(priceAsc).toBeVisible();
    await priceAsc.click();
    await expect(page).toHaveURL(/sort=price-asc/);
  });

  test('filters sidebar brand checkboxes exist (desktop only) when brands exist', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/en/search?q=toner');
    // Sidebar is inside a <form aria-label="Filters">.
    const sidebar = page.locator('form[aria-label="Filters"]').first();
    // If the store has zero brands the sidebar still renders with empty lists.
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText(/Brand/)).toBeVisible();
    await expect(sidebar.getByText(/Category/)).toBeVisible();
    await expect(sidebar.getByText(/Authenticity/)).toBeVisible();
  });

  test('mobile filter modal opens and closes', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/en/search?q=toner');
    const openBtn = page.getByRole('button', { name: 'Filters' });
    await expect(openBtn).toBeVisible();
    await openBtn.click();
    const modal = page.getByRole('dialog', { name: 'Filters' });
    await expect(modal).toBeVisible();
    await modal.getByRole('button', { name: 'Close' }).click();
    await expect(modal).toBeHidden();
  });

  test('compatible-printers chips on detail page link to /search?printer=', async ({
    page,
  }) => {
    await page.goto('/en/products');
    const card = page.locator('a[href*="/products/"]').nth(0);
    const count = await card.count();
    test.skip(count === 0, 'no seeded products');
    await card.click();
    const chip = page
      .getByRole('link')
      .filter({ has: page.locator('span.font-medium') })
      .first();
    const count2 = await chip.count();
    if (count2 > 0) {
      const href = await chip.getAttribute('href');
      // When a product has at least one compatibility link, the first chip
      // should point at /search?printer=...
      expect(href).toMatch(/\/search\?printer=/);
    }
  });

  test('/api/search/suggest returns JSON even for empty query', async ({
    request,
  }) => {
    const res = await request.get('/api/search/suggest');
    expect(res.status()).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.suggestions)).toBe(true);
  });
});
