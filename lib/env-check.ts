/**
 * Production environment sanity assertions. Runs once at server boot via
 * `instrumentation.ts::register`. Fails fast (throws) if the app is starting
 * in production with dangerous dev flags enabled or required secrets missing.
 *
 * Why fail fast: a silent boot with `OTP_DEV_MODE=true` in production would
 * leak dev OTP codes to the response body + logs for every phone login. The
 * cost of a loud boot failure is lower than the cost of shipping dev mode
 * to customers.
 */
import { logger } from '@/lib/logger';
import { isPaymobEnabled } from '@/lib/payments/feature-flags';

const DANGEROUS_FLAGS_IN_PROD = [
  'OTP_DEV_MODE',
  'NOTIFICATIONS_DEV_MODE',
  'WHATS360_SANDBOX',
] as const;

const ALWAYS_REQUIRED_IN_PROD = [
  'DATABASE_URL',
  'APP_URL',
  'WHATS360_TOKEN',
  'WHATS360_INSTANCE_ID',
  'WHATS360_WEBHOOK_SECRET',
] as const;

/**
 * Required only when Paymob is enabled. ADR-064 lets M1 launch COD-only by
 * setting PAYMENTS_PAYMOB_ENABLED=false; in that posture these env vars are
 * legitimately absent until merchant approval lands and the flag flips on.
 */
const REQUIRED_WHEN_PAYMOB_ENABLED = [
  'PAYMOB_API_KEY',
  'PAYMOB_HMAC_SECRET',
  'PAYMOB_INTEGRATION_ID_CARD',
] as const;

export type EnvCheckResult = { ok: true } | { ok: false; errors: string[] };

export function checkProductionEnv(
  env: NodeJS.ProcessEnv = process.env,
): EnvCheckResult {
  if (env.NODE_ENV !== 'production') return { ok: true };
  if (env.SKIP_ENV_CHECK === 'true') return { ok: true };

  const errors: string[] = [];

  for (const flag of DANGEROUS_FLAGS_IN_PROD) {
    if (env[flag] === 'true') {
      errors.push(`${flag}=true must not be set in production`);
    }
  }

  const required: readonly string[] = isPaymobEnabled(env)
    ? [...ALWAYS_REQUIRED_IN_PROD, ...REQUIRED_WHEN_PAYMOB_ENABLED]
    : ALWAYS_REQUIRED_IN_PROD;

  for (const key of required) {
    if (!env[key] || env[key]?.length === 0) {
      errors.push(`${key} is required in production but is not set`);
    }
  }

  return errors.length === 0 ? { ok: true } : { ok: false, errors };
}

export function assertProductionEnv(): void {
  const result = checkProductionEnv();
  if (result.ok) {
    if (process.env.NODE_ENV === 'production') {
      logger.info({}, 'env_check.passed');
    }
    return;
  }
  logger.error({ errors: result.errors }, 'env_check.failed');
  throw new Error(
    `Production env check failed:\n  - ${result.errors.join('\n  - ')}`,
  );
}
