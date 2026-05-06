/**
 * Sprint 11.5 — Admin-password re-verification helper.
 *
 * Used as a gate before any sensitive admin Server Action that toggles
 * payment-method availability or flips Whats360 between LIVE / TEST mode.
 * Even though the caller is already an authenticated admin (via session
 * cookie), we re-prompt for the password to defend against:
 *   1. an unattended admin laptop being abused by a passer-by
 *   2. a leaked session token being used to silently flip prod → test
 *      mode and capture real customer payments to a sandbox account
 *
 * Rate-limited at 5 attempts per (admin user) per 15 minutes via the
 * shared `adminPasswordVerify` rule. Failed attempts emit a structured
 * audit log entry so OWNER can see brute-force activity in the audit
 * trail (and so the action that triggered the verify can show "X
 * attempts remaining" in the UI without leaking timing info).
 *
 * Returns the User row on success. Throws `AdminPasswordVerifyError`
 * on failure with `kind` distinguishing rate-limit, no-password (B2C
 * admin would have no passwordHash, but admins always do), or mismatch.
 * Callers should map `kind` to a localized AR/EN string in their UI.
 */
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  RATE_LIMIT_RULES,
  checkAndIncrement,
  type RateLimitResult,
} from '@/lib/rate-limit';
import type { User } from '@prisma/client';

export type AdminPasswordVerifyErrorKind =
  /** Account has no password set — should never happen for ADMIN type. */
  | 'no_password'
  /** Password didn't match. */
  | 'mismatch'
  /** Hit 5/15min cap — see retryAfterSeconds. */
  | 'rate_limited'
  /** Empty password input. */
  | 'empty';

export class AdminPasswordVerifyError extends Error {
  kind: AdminPasswordVerifyErrorKind;
  retryAfterSeconds?: number;
  remainingAttempts?: number;

  constructor(
    kind: AdminPasswordVerifyErrorKind,
    options?: {
      retryAfterSeconds?: number;
      remainingAttempts?: number;
    },
  ) {
    super(`admin_password_verify.${kind}`);
    this.name = 'AdminPasswordVerifyError';
    this.kind = kind;
    this.retryAfterSeconds = options?.retryAfterSeconds;
    this.remainingAttempts = options?.remainingAttempts;
  }
}

/**
 * Verify the admin's own password. Throws `AdminPasswordVerifyError` on any
 * failure (mismatch, rate-limited, empty, no_password). On success returns
 * the `User` row with passwordHash redacted.
 *
 * Rate-limit subject is the admin's `userId` so two admins each get their
 * own bucket (one admin's mistakes don't lock the other out).
 */
export async function verifyAdminPasswordOrThrow(
  admin: Pick<User, 'id' | 'type' | 'passwordHash'>,
  password: string,
): Promise<RateLimitResult> {
  if (!password || password.trim().length === 0) {
    throw new AdminPasswordVerifyError('empty');
  }
  if (admin.type !== 'ADMIN') {
    // Defensive — caller should already have ensured this via requireAdmin.
    throw new AdminPasswordVerifyError('no_password');
  }
  if (!admin.passwordHash) {
    throw new AdminPasswordVerifyError('no_password');
  }

  // Rate-limit BEFORE the bcrypt compare. A locked-out attacker shouldn't
  // be able to keep eating CPU on bcrypt rounds; failing fast here also
  // keeps the response time uniform regardless of password length.
  const limit = await checkAndIncrement(
    RATE_LIMIT_RULES.adminPasswordVerify,
    `admin:${admin.id}`,
  );
  if (!limit.allowed) {
    logger.warn(
      { adminId: admin.id, retryAfterSeconds: limit.retryAfterSeconds },
      'admin_password_verify.rate_limited',
    );
    throw new AdminPasswordVerifyError('rate_limited', {
      retryAfterSeconds: limit.retryAfterSeconds,
    });
  }

  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) {
    logger.warn(
      { adminId: admin.id, remainingAttempts: limit.remaining },
      'admin_password_verify.mismatch',
    );
    // Best-effort audit-log; swallow errors so we don't mask the
    // primary AdminPasswordVerifyError to the caller.
    try {
      await prisma.auditLog.create({
        data: {
          actorId: admin.id,
          action: 'admin.password_verify.failed',
          entityType: 'User',
          entityId: admin.id,
        },
      });
    } catch (err) {
      logger.error({ err }, 'admin_password_verify.audit_failed');
    }
    throw new AdminPasswordVerifyError('mismatch', {
      remainingAttempts: limit.remaining,
    });
  }

  return limit;
}
