import { describe, it, expect } from 'vitest';
import { checkProductionEnv } from './env-check';

const MINIMAL_PROD_ENV: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgres://user:pass@host/db',
  APP_URL: 'https://printbyfalcon.com',
  PAYMOB_API_KEY: 'key',
  PAYMOB_HMAC_SECRET: 'secret',
  PAYMOB_INTEGRATION_ID_CARD: '123',
  WHATS360_TOKEN: 'tok',
  WHATS360_INSTANCE_ID: 'inst',
  WHATS360_WEBHOOK_SECRET: 'wh',
};

describe('checkProductionEnv', () => {
  it('passes silently in non-production', () => {
    expect(checkProductionEnv({ NODE_ENV: 'development' })).toEqual({
      ok: true,
    });
    expect(checkProductionEnv({ NODE_ENV: 'test' })).toEqual({ ok: true });
  });

  it('passes in production with all required vars present and no dangerous flags', () => {
    expect(checkProductionEnv(MINIMAL_PROD_ENV)).toEqual({ ok: true });
  });

  it('fails when OTP_DEV_MODE=true in production', () => {
    const result = checkProductionEnv({
      ...MINIMAL_PROD_ENV,
      OTP_DEV_MODE: 'true',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        'OTP_DEV_MODE=true must not be set in production',
      );
    }
  });

  it('fails when NOTIFICATIONS_DEV_MODE=true in production', () => {
    const result = checkProductionEnv({
      ...MINIMAL_PROD_ENV,
      NOTIFICATIONS_DEV_MODE: 'true',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        'NOTIFICATIONS_DEV_MODE=true must not be set in production',
      );
    }
  });

  it('fails when WHATS360_SANDBOX=true in production', () => {
    const result = checkProductionEnv({
      ...MINIMAL_PROD_ENV,
      WHATS360_SANDBOX: 'true',
    });
    expect(result.ok).toBe(false);
  });

  it('fails when required var missing', () => {
    const env: NodeJS.ProcessEnv = { ...MINIMAL_PROD_ENV };
    delete env.PAYMOB_HMAC_SECRET;
    const result = checkProductionEnv(env);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toContain(
        'PAYMOB_HMAC_SECRET is required in production but is not set',
      );
    }
  });

  it('skips check when SKIP_ENV_CHECK=true (escape hatch for emergency boots)', () => {
    expect(
      checkProductionEnv({
        NODE_ENV: 'production',
        SKIP_ENV_CHECK: 'true',
        OTP_DEV_MODE: 'true',
      }),
    ).toEqual({ ok: true });
  });

  it('collects multiple errors in one pass', () => {
    const result = checkProductionEnv({
      NODE_ENV: 'production',
      OTP_DEV_MODE: 'true',
      NOTIFICATIONS_DEV_MODE: 'true',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});
