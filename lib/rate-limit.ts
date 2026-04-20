/**
 * DB-backed sliding-window rate limiter.
 *
 * Strategy: bucket per (key, windowStart) where windowStart is the floor of
 * now to `windowSeconds`. On each attempt, increment the current bucket and
 * sum the last two buckets to compute a sliding count — this gives a reasonable
 * approximation of a true sliding window without storing every event.
 *
 * Why DB and not Redis: per ADR-010, this MVP runs one fewer service. Postgres
 * handles our expected 100–500 daily visitors comfortably.
 */
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

type LimitRule = {
  /** Logical rule name, e.g. 'otp-request'. Used as the key prefix. */
  name: string;
  /** Max requests within the window. */
  max: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

export const RATE_LIMIT_RULES = {
  otpRequest: {
    name: 'otp-request',
    max: 3,
    windowSeconds: 30 * 60,
  },
  b2bLogin: {
    name: 'b2b-login',
    max: 5,
    windowSeconds: 15 * 60,
  },
  passwordReset: {
    name: 'password-reset',
    max: 3,
    windowSeconds: 60 * 60,
  },
  serverActionDefault: {
    name: 'action',
    max: 60,
    windowSeconds: 60,
  },
  /**
   * Customer-facing notification throttle (Sprint 5 S5-D8-T3). Cap at 5 messages
   * per phone per hour so a status-oscillating order doesn't spam the customer.
   * OTP and auth-critical sends bypass this — they use `otpRequest` above.
   */
  notificationPerPhone: {
    name: 'notify-phone',
    max: 5,
    windowSeconds: 60 * 60,
  },
} as const satisfies Record<string, LimitRule>;

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

function floorToWindow(d: Date, windowSeconds: number): Date {
  const ms = d.getTime();
  const windowMs = windowSeconds * 1000;
  return new Date(Math.floor(ms / windowMs) * windowMs);
}

export async function checkAndIncrement(
  rule: LimitRule,
  subject: string,
): Promise<RateLimitResult> {
  const now = new Date();
  const currentWindow = floorToWindow(now, rule.windowSeconds);
  const previousWindow = new Date(
    currentWindow.getTime() - rule.windowSeconds * 1000,
  );
  const key = `${rule.name}:${subject}`;

  try {
    const [currentRow, previousRow] = await Promise.all([
      prisma.rateLimit.upsert({
        where: { key_windowStart: { key, windowStart: currentWindow } },
        create: { key, windowStart: currentWindow, count: 1 },
        update: { count: { increment: 1 } },
      }),
      prisma.rateLimit.findUnique({
        where: { key_windowStart: { key, windowStart: previousWindow } },
      }),
    ]);

    const elapsedRatio =
      (now.getTime() - currentWindow.getTime()) / (rule.windowSeconds * 1000);
    const slidingCount =
      (previousRow?.count ?? 0) * (1 - elapsedRatio) + currentRow.count;

    const allowed = slidingCount <= rule.max;
    const remaining = Math.max(0, Math.ceil(rule.max - slidingCount));
    const retryAfterSeconds = allowed
      ? 0
      : Math.ceil(
          rule.windowSeconds - (now.getTime() - currentWindow.getTime()) / 1000,
        );

    if (!allowed) {
      logger.warn(
        { rule: rule.name, subject, count: slidingCount, max: rule.max },
        'rate_limit.exceeded',
      );
    }

    return { allowed, remaining, retryAfterSeconds };
  } catch (err) {
    // Fail open so a rate-limit infrastructure blip doesn't take down auth.
    logger.error({ err, rule: rule.name }, 'rate_limit.error.failing_open');
    return { allowed: true, remaining: rule.max, retryAfterSeconds: 0 };
  }
}

/**
 * Background cleanup: delete rate-limit rows older than 2 windows of the
 * longest-lived rule. Invoked via the worker cron (hourly).
 */
export async function cleanupExpiredRateLimits(): Promise<number> {
  const maxWindow = Math.max(
    ...Object.values(RATE_LIMIT_RULES).map((r) => r.windowSeconds),
  );
  const cutoff = new Date(Date.now() - maxWindow * 2 * 1000);
  const { count } = await prisma.rateLimit.deleteMany({
    where: { windowStart: { lt: cutoff } },
  });
  return count;
}
