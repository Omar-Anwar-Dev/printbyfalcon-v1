import { expect, test } from '@playwright/test';

/**
 * Sprint 4 smoke suite for the B2C checkout flow. Focused on the surfaces
 * and HTTP contracts that don't require real Paymob credentials — the
 * Paymob card flow is covered separately via the dev-stub page in dev.
 */

test.describe('B2C checkout surfaces', () => {
  test('empty cart page renders and links to products', async ({ page }) => {
    await page.goto('/en/cart');
    await expect(page).toHaveURL(/\/en\/cart/);
    await expect(
      page.getByText(/cart is empty|Your cart is empty/i),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /browse products|Browse products/i }),
    ).toBeVisible();
  });

  test('/checkout redirects to /cart when cart is empty', async ({ page }) => {
    await page.goto('/en/checkout');
    await expect(page).toHaveURL(/\/en\/cart/);
  });

  test('/account redirects to /sign-in when not authenticated', async ({
    page,
  }) => {
    await page.goto('/en/account');
    await expect(page).toHaveURL(/\/en\/sign-in/);
  });

  test('/order/confirmed/<id> 404s for unknown id', async ({ request }) => {
    const res = await request.get('/en/order/confirmed/does-not-exist', {
      maxRedirects: 0,
      failOnStatusCode: false,
    });
    expect(res.status()).toBe(404);
  });

  test('/api/orders/<id>/status returns 404 for unknown id', async ({
    request,
  }) => {
    const res = await request.get('/api/orders/does-not-exist/status');
    expect(res.status()).toBe(404);
  });

  test('/api/webhooks/paymob rejects missing HMAC', async ({ request }) => {
    const res = await request.post('/api/webhooks/paymob', {
      data: { type: 'TRANSACTION', obj: {} },
    });
    expect(res.status()).toBe(401);
  });

  test('product detail page shows Add-to-cart button when product exists', async ({
    page,
  }) => {
    await page.goto('/en/products');
    const firstCard = page.locator('a[href*="/products/"]').first();
    const count = await firstCard.count();
    test.skip(count === 0, 'no seeded products in this env');
    await firstCard.click();
    await expect(
      page.getByRole('button', { name: /Add to cart/i }),
    ).toBeVisible();
  });
});
