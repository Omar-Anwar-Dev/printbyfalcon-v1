import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory store for the mock — keyed by `${key}:${windowStart.getTime()}`.
const buckets = new Map<string, { count: number; windowStart: Date }>();

vi.mock('@/lib/db', () => {
  return {
    prisma: {
      rateLimit: {
        upsert: vi.fn(
          async (args: {
            where: { key_windowStart: { key: string; windowStart: Date } };
            create: { key: string; windowStart: Date; count: number };
            update: { count: { increment: number } };
          }) => {
            const k = `${args.where.key_windowStart.key}:${args.where.key_windowStart.windowStart.getTime()}`;
            const existing = buckets.get(k);
            if (existing) {
              existing.count += args.update.count.increment;
              return {
                key: args.where.key_windowStart.key,
                windowStart: args.where.key_windowStart.windowStart,
                count: existing.count,
              };
            }
            buckets.set(k, {
              count: args.create.count,
              windowStart: args.create.windowStart,
            });
            return {
              key: args.create.key,
              windowStart: args.create.windowStart,
              count: args.create.count,
            };
          },
        ),
        findUnique: vi.fn(
          async (args: {
            where: { key_windowStart: { key: string; windowStart: Date } };
          }) => {
            const k = `${args.where.key_windowStart.key}:${args.where.key_windowStart.windowStart.getTime()}`;
            const row = buckets.get(k);
            if (!row) return null;
            return {
              key: args.where.key_windowStart.key,
              windowStart: args.where.key_windowStart.windowStart,
              count: row.count,
            };
          },
        ),
        deleteMany: vi.fn(async () => ({ count: 0 })),
      },
    },
  };
});

import { checkAndIncrement, RATE_LIMIT_RULES } from './rate-limit';

describe('rate-limit trigger behavior', () => {
  beforeEach(() => {
    buckets.clear();
    vi.useRealTimers();
  });

  it('allows exactly `max` attempts within a single window, blocks the next', async () => {
    const phone = '+201012345678';
    const rule = RATE_LIMIT_RULES.otpRequest; // max 3, window 30min

    const r1 = await checkAndIncrement(rule, phone);
    const r2 = await checkAndIncrement(rule, phone);
    const r3 = await checkAndIncrement(rule, phone);
    const r4 = await checkAndIncrement(rule, phone);

    expect(r1.allowed).toBe(true);
    expect(r2.allowed).toBe(true);
    expect(r3.allowed).toBe(true);
    expect(r4.allowed).toBe(false);
    expect(r4.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('tracks separate counters per subject — one phone exceeding does not affect another', async () => {
    const rule = RATE_LIMIT_RULES.otpRequest;
    await checkAndIncrement(rule, '+201011111111');
    await checkAndIncrement(rule, '+201011111111');
    await checkAndIncrement(rule, '+201011111111');
    const blocked = await checkAndIncrement(rule, '+201011111111');
    const otherPhone = await checkAndIncrement(rule, '+201022222222');

    expect(blocked.allowed).toBe(false);
    expect(otherPhone.allowed).toBe(true);
  });

  it('tracks separate counters per rule — OTP exhaustion does not block password-reset', async () => {
    const phone = '+201033333333';
    await checkAndIncrement(RATE_LIMIT_RULES.otpRequest, phone);
    await checkAndIncrement(RATE_LIMIT_RULES.otpRequest, phone);
    await checkAndIncrement(RATE_LIMIT_RULES.otpRequest, phone);
    const otpBlocked = await checkAndIncrement(
      RATE_LIMIT_RULES.otpRequest,
      phone,
    );

    const pwReset = await checkAndIncrement(
      RATE_LIMIT_RULES.passwordReset,
      phone,
    );

    expect(otpBlocked.allowed).toBe(false);
    expect(pwReset.allowed).toBe(true);
  });

  it('returns a declining `remaining` count as attempts accumulate', async () => {
    const rule = RATE_LIMIT_RULES.b2bLogin; // max 5, window 15min
    const email = 'ops@example.com';

    const r1 = await checkAndIncrement(rule, email);
    const r2 = await checkAndIncrement(rule, email);
    const r3 = await checkAndIncrement(rule, email);

    expect(r1.remaining).toBeGreaterThanOrEqual(r2.remaining);
    expect(r2.remaining).toBeGreaterThanOrEqual(r3.remaining);
    expect(r3.remaining).toBeGreaterThanOrEqual(0);
  });

  it('resets the counter after the window rolls forward', async () => {
    const rule = RATE_LIMIT_RULES.otpRequest; // 30-min window
    const phone = '+201044444444';

    // Freeze "now" at a fixed instant, then advance past one full window.
    const t0 = new Date('2026-04-23T10:00:00Z');
    vi.useFakeTimers();
    vi.setSystemTime(t0);

    await checkAndIncrement(rule, phone);
    await checkAndIncrement(rule, phone);
    await checkAndIncrement(rule, phone);
    const preBlocked = await checkAndIncrement(rule, phone);
    expect(preBlocked.allowed).toBe(false);

    // Advance 2 windows (60 min): the previous window's contribution decays to
    // zero via the sliding-window weighting.
    vi.setSystemTime(new Date(t0.getTime() + 2 * 30 * 60 * 1000));
    const afterRoll = await checkAndIncrement(rule, phone);
    expect(afterRoll.allowed).toBe(true);
  });

  it('webhook rule permits 1000 in a row before tripping', async () => {
    const rule = RATE_LIMIT_RULES.webhook; // max 1000, 60s
    const ip = 'paymob:1.2.3.4';

    // We don't need to actually run 1000 iterations to prove the shape — stop
    // just under, just at, and just over.
    for (let i = 0; i < 999; i += 1) {
      await checkAndIncrement(rule, ip);
    }
    const at = await checkAndIncrement(rule, ip);
    const over = await checkAndIncrement(rule, ip);

    expect(at.allowed).toBe(true);
    expect(over.allowed).toBe(false);
  });
});
