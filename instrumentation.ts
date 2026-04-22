/**
 * Next.js instrumentation hook — runs once per Node process at boot, before
 * any request handler. Safe place for fail-fast sanity checks on environment.
 *
 * We gate on NEXT_RUNTIME === 'nodejs' so edge runtime boots (middleware) don't
 * pull in the full env-check module and its logger dependencies.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { assertProductionEnv } = await import('./lib/env-check');
    assertProductionEnv();
  }
}
