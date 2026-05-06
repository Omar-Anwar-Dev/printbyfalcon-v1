import { describe, it, expect, vi, beforeEach } from 'vitest';
import bcrypt from 'bcryptjs';

// In-memory rate-limit bucket store, mirroring the pattern from
// lib/rate-limit.test.ts so we exercise the real `checkAndIncrement` flow.
const buckets = new Map<string, { count: number; windowStart: Date }>();
const auditLogCreates: Array<{ action: string; userId: string }> = [];

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
        findUnique: vi.fn(async () => null),
      },
      auditLog: {
        create: vi.fn(
          async (args: { data: { action: string; actorId: string } }) => {
            auditLogCreates.push({
              action: args.data.action,
              userId: args.data.actorId,
            });
            return { id: `audit-${auditLogCreates.length}` };
          },
        ),
      },
    },
  };
});

import {
  verifyAdminPasswordOrThrow,
  AdminPasswordVerifyError,
} from './verify-admin-password';

const REAL_PASSWORD = 'CorrectHorseBattery42!';
let HASH = '';

describe('verifyAdminPasswordOrThrow', () => {
  beforeEach(async () => {
    buckets.clear();
    auditLogCreates.length = 0;
    if (!HASH) HASH = await bcrypt.hash(REAL_PASSWORD, 4); // cost 4 = fast in tests
  });

  it('returns rate-limit status on correct password', async () => {
    const result = await verifyAdminPasswordOrThrow(
      { id: 'u1', type: 'ADMIN', passwordHash: HASH },
      REAL_PASSWORD,
    );
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThanOrEqual(4);
    expect(auditLogCreates).toHaveLength(0); // no audit on success
  });

  it('throws "empty" when password is blank', async () => {
    await expect(
      verifyAdminPasswordOrThrow(
        { id: 'u1', type: 'ADMIN', passwordHash: HASH },
        '',
      ),
    ).rejects.toThrow(AdminPasswordVerifyError);
    await expect(
      verifyAdminPasswordOrThrow(
        { id: 'u1', type: 'ADMIN', passwordHash: HASH },
        '   ',
      ),
    ).rejects.toMatchObject({ kind: 'empty' });
  });

  it('throws "no_password" when admin has no passwordHash', async () => {
    await expect(
      verifyAdminPasswordOrThrow(
        { id: 'u1', type: 'ADMIN', passwordHash: null },
        REAL_PASSWORD,
      ),
    ).rejects.toMatchObject({ kind: 'no_password' });
  });

  it('throws "no_password" when user is not ADMIN type', async () => {
    await expect(
      verifyAdminPasswordOrThrow(
        { id: 'u1', type: 'B2C', passwordHash: HASH },
        REAL_PASSWORD,
      ),
    ).rejects.toMatchObject({ kind: 'no_password' });
  });

  it('throws "mismatch" with remainingAttempts on wrong password', async () => {
    try {
      await verifyAdminPasswordOrThrow(
        { id: 'u1', type: 'ADMIN', passwordHash: HASH },
        'WrongPassword',
      );
      throw new Error('expected throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AdminPasswordVerifyError);
      expect((err as AdminPasswordVerifyError).kind).toBe('mismatch');
      expect((err as AdminPasswordVerifyError).remainingAttempts).toBeTypeOf(
        'number',
      );
    }
    expect(auditLogCreates).toHaveLength(1);
    expect(auditLogCreates[0]!.action).toBe('admin.password_verify.failed');
    expect(auditLogCreates[0]!.userId).toBe('u1');
  });

  it('rate-limits after 5 attempts in 15-minute window', async () => {
    // 5 wrong attempts — all should mismatch (consume the bucket)
    for (let i = 0; i < 5; i++) {
      await expect(
        verifyAdminPasswordOrThrow(
          { id: 'u1', type: 'ADMIN', passwordHash: HASH },
          'wrong',
        ),
      ).rejects.toMatchObject({ kind: 'mismatch' });
    }
    // 6th: rate-limited even with the CORRECT password
    await expect(
      verifyAdminPasswordOrThrow(
        { id: 'u1', type: 'ADMIN', passwordHash: HASH },
        REAL_PASSWORD,
      ),
    ).rejects.toMatchObject({ kind: 'rate_limited' });
  });

  it('separates buckets by admin id', async () => {
    // u1 burns 5 attempts
    for (let i = 0; i < 5; i++) {
      await expect(
        verifyAdminPasswordOrThrow(
          { id: 'u1', type: 'ADMIN', passwordHash: HASH },
          'wrong',
        ),
      ).rejects.toMatchObject({ kind: 'mismatch' });
    }
    // u2 has a fresh bucket — correct password works
    const result = await verifyAdminPasswordOrThrow(
      { id: 'u2', type: 'ADMIN', passwordHash: HASH },
      REAL_PASSWORD,
    );
    expect(result.allowed).toBe(true);
  });
});
