import { expect, test } from '@playwright/test';

/**
 * Sprint 11 E2E coverage gap-fill (S11-D3-T1).
 *
 * Adds lightweight cases for MVP user-story acceptance criteria that were
 * previously only covered by unit tests or not at all. Deliberately avoids
 * DB-seeded flows — those run against the staging smoke dataset post-deploy.
 */

test.describe('Sprint 11 — B2C auth surface (Mahmoud)', () => {
  test('/sign-in renders the phone-OTP request form in both locales', async ({
    page,
  }) => {
    for (const locale of ['ar', 'en'] as const) {
      await page.goto(`/${locale}/sign-in`);
      await expect(page).toHaveURL(new RegExp(`/${locale}/sign-in`));
      // Both locales show a phone field to kick off OTP.
      await expect(page.locator('input[name="phone"]').first()).toBeVisible();
    }
  });

  test('/account redirects signed-out users to /sign-in (B2C gate)', async ({
    page,
  }) => {
    await page.goto('/ar/account');
    await expect(page).toHaveURL(/\/ar\/sign-in/);
  });
});

test.describe('Sprint 11 — B2B application surface (Hala)', () => {
  test('/b2b/signup renders the self-serve application form', async ({
    page,
  }) => {
    await page.goto('/ar/b2b/signup');
    await expect(page).toHaveURL(/\/ar\/b2b\/signup/);
    // PRD Feature 2 requires: company name, commercial registry #, tax card #,
    // contact name, phone, email, password, delivery city. Presence-check a
    // few of the mandatory fields.
    await expect(
      page
        .locator(
          'input[name="companyName"], input[name="company_name"], input[placeholder*="company" i]',
        )
        .first(),
    ).toBeVisible();
    await expect(page.locator('input[name="email"]').first()).toBeVisible();
  });

  test('/b2b/login renders the email+password form', async ({ page }) => {
    await page.goto('/en/b2b/login');
    await expect(page.locator('input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"]').first()).toBeVisible();
  });
});

test.describe('Sprint 11 — admin auth gates (Ahmed / Mona / Karim)', () => {
  test('/admin bounces unauthenticated users to /admin/login', async ({
    page,
  }) => {
    await page.goto('/ar/admin');
    await expect(page).toHaveURL(/\/ar\/admin\/login/);
  });

  test('/admin/login renders the credentials form', async ({ page }) => {
    await page.goto('/ar/admin/login');
    await expect(page.locator('input[name="email"]').first()).toBeVisible();
    await expect(page.locator('input[name="password"]').first()).toBeVisible();
  });

  test('admin sub-routes all redirect to login when not authed', async ({
    page,
  }) => {
    // Representative sample — middleware cookie-presence gate covers all of
    // /admin/*, verifying the contract for a few key entry points is enough.
    const guarded = [
      '/ar/admin/orders',
      '/ar/admin/products',
      '/ar/admin/customers',
      '/ar/admin/b2b/applications',
      '/ar/admin/settings',
    ];
    for (const path of guarded) {
      const res = await page.goto(path);
      expect(res?.status()).toBeLessThan(500);
      await expect(page).toHaveURL(/\/ar\/admin\/login/);
    }
  });
});

test.describe('Sprint 11 — webhook HTTP contracts', () => {
  test('Paymob webhook GET probe returns 200 for infra verification', async ({
    request,
  }) => {
    const res = await request.get('/api/webhooks/paymob');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.route).toBe('paymob-webhook');
  });

  test('Paymob webhook rejects missing HMAC', async ({ request }) => {
    const res = await request.post('/api/webhooks/paymob', {
      data: { type: 'TRANSACTION', obj: { id: 1 } },
    });
    expect(res.status()).toBe(401);
  });

  test('Whats360 webhook rejects missing secret', async ({ request }) => {
    const res = await request.post('/api/webhooks/whats360', {
      data: { event: 'outgoing message' },
    });
    // 401 (no secret presented) or 401 equivalent — must not be 200/2xx.
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });
});

test.describe('Sprint 11 — security headers smoke', () => {
  test('storefront response carries CSP + HSTS + COOP', async ({ request }) => {
    const res = await request.get('/ar');
    expect(res.status()).toBeLessThan(500);
    const headers = res.headers();
    // Next.js lowercases header names in its response.
    expect(headers['content-security-policy']).toBeDefined();
    expect(headers['content-security-policy']).toContain("default-src 'self'");
    expect(headers['strict-transport-security']).toContain('max-age=');
    expect(headers['cross-origin-opener-policy']).toBeDefined();
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });
});

test.describe('Sprint 11 — health probe', () => {
  test('/api/health returns 200 with liveness payload', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toBeDefined();
  });
});
