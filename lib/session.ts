/**
 * Session helpers: issue / validate / refresh / destroy.
 *
 * The raw token lives only in the HttpOnly cookie. The DB stores SHA-256(token)
 * so a DB dump alone cannot impersonate users. Sessions roll forward: every
 * authenticated request bumps `lastSeenAt` and extends `expiresAt` if the
 * session is inside its refresh window.
 */
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db';
import { randomToken, sha256Hex } from '@/lib/crypto';
import { logger } from '@/lib/logger';
import type { User } from '@prisma/client';

export const SESSION_COOKIE = 'pbf_session';
export const SESSION_TTL_DAYS = 30;
/** Only refresh `expiresAt` if the session has been used within this window. */
const REFRESH_WHEN_OLDER_THAN_MINUTES = 60;

function ttlMs() {
  return SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export async function createSession(
  userId: string,
  meta?: { ipAddress?: string; userAgent?: string; deviceLabel?: string },
) {
  const rawToken = randomToken(32);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + ttlMs());

  await prisma.session.create({
    data: {
      token: tokenHash,
      userId,
      expiresAt,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      deviceLabel: meta?.deviceLabel,
    },
  });

  (await cookies()).set({
    name: SESSION_COOKIE,
    value: rawToken,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return { rawToken, expiresAt };
}

export async function getSessionUser(): Promise<User | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = sha256Hex(rawToken);
  const session = await prisma.session.findUnique({
    where: { token: tokenHash },
    include: { user: true },
  });

  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const refreshThreshold = new Date(
    Date.now() - REFRESH_WHEN_OLDER_THAN_MINUTES * 60 * 1000,
  );
  if (session.lastSeenAt < refreshThreshold) {
    const newExpires = new Date(Date.now() + ttlMs());
    await prisma.session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date(), expiresAt: newExpires },
    });
    cookieStore.set({
      name: SESSION_COOKIE,
      value: rawToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: newExpires,
    });
  }

  return session.user;
}

export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    const tokenHash = sha256Hex(rawToken);
    await prisma.session
      .deleteMany({ where: { token: tokenHash } })
      .catch((err) => logger.warn({ err }, 'session.destroy.db_error'));
  }
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Background cleanup: delete expired sessions. Worker cron calls hourly.
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const { count } = await prisma.session.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
  return count;
}
