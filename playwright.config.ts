import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for storefront smoke tests.
 *
 * Local: `npm run test:e2e` runs against `http://localhost:3000` — start the
 * dev server in another terminal or let the config boot one.
 * CI: the `playwright` job in .github/workflows/ci.yml provisions a Postgres
 * service, seeds the schema, builds, starts `next start`, then runs the suite.
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: process.env.PBF_E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.PBF_E2E_SKIP_WEBSERVER
    ? undefined
    : {
        command: 'npm run start',
        url: process.env.PBF_E2E_BASE_URL ?? 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
