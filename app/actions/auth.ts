'use server';

/**
 * Auth Server Actions. All inputs validated by zod; all failures return a
 * localized `errorKey` the UI resolves via next-intl. Rate limiting is applied
 * before any expensive work.
 */
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { issueOtp, verifyOtp } from '@/lib/otp';
import { getClientIp } from '@/lib/request-ip';
import { checkAndIncrement, RATE_LIMIT_RULES } from '@/lib/rate-limit';
import { createSession, destroySession } from '@/lib/session';
import {
  b2bLoginSchema,
  requestOtpSchema,
  verifyOtpSchema,
  changePasswordSchema,
} from '@/lib/validation/auth';
import { toLocalizedIssues } from '@/lib/validation/error-map';
import type { UserType } from '@prisma/client';

type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: string;
      fieldErrors?: { path: (string | number)[]; key: string }[];
    };

async function requestMeta() {
  const h = await headers();
  return {
    ip: getClientIp(h),
    userAgent: h.get('user-agent') ?? null,
  };
}

export async function requestB2COtpAction(
  formData: FormData,
): Promise<ActionResult<{ devCode?: string }>> {
  const parsed = requestOtpSchema.safeParse({ phone: formData.get('phone') });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const rl = await checkAndIncrement(
    RATE_LIMIT_RULES.otpRequest,
    parsed.data.phone,
  );
  if (!rl.allowed) {
    return { ok: false, errorKey: 'validation.rate_limit.exceeded' };
  }

  const result = await issueOtp(parsed.data.phone);
  if (!result.ok) return { ok: false, errorKey: result.errorKey };

  return { ok: true, data: { devCode: result.devCode } };
}

export async function verifyB2COtpAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = verifyOtpSchema.safeParse({
    phone: formData.get('phone'),
    code: formData.get('code'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const verifyResult = await verifyOtp(parsed.data.phone, parsed.data.code);
  if (!verifyResult.ok) {
    return { ok: false, errorKey: `validation.${verifyResult.errorKey}` };
  }

  // On first OTP verify the form may carry optional `name` + `email` to set on
  // the newly-created User (Sprint 4 B2C registration flow, per PRD Feature 2).
  const rawName = formData.get('name');
  const rawEmail = formData.get('email');
  const name =
    typeof rawName === 'string' && rawName.trim().length >= 2
      ? rawName.trim().slice(0, 80)
      : null;
  const email =
    typeof rawEmail === 'string' && /^\S+@\S+\.\S+$/.test(rawEmail.trim())
      ? rawEmail.trim().toLowerCase()
      : null;

  const user = await prisma.user.upsert({
    where: { phone: parsed.data.phone },
    update: {
      lastLoginAt: new Date(),
      ...(name ? { name } : {}),
      ...(email ? { email } : {}),
    },
    create: {
      type: 'B2C',
      phone: parsed.data.phone,
      name: name ?? `Customer ${parsed.data.phone.slice(-4)}`,
      email,
      lastLoginAt: new Date(),
    },
  });

  const meta = await requestMeta();
  await createSession(user.id, {
    ipAddress: meta.ip ?? undefined,
    userAgent: meta.userAgent ?? undefined,
  });

  // Migrate any guest cart items into the now-signed-in user's cart so the
  // items the visitor added pre-sign-in survive the session transition.
  const { migrateGuestCart } = await import('@/lib/cart/cart');
  await migrateGuestCart(user.id);

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'auth.b2c.login',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  return { ok: true, data: null };
}

export async function loginB2BAction(
  formData: FormData,
): Promise<ActionResult<{ mustChangePassword: boolean; userType: UserType }>> {
  const parsed = b2bLoginSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const rl = await checkAndIncrement(
    RATE_LIMIT_RULES.b2bLogin,
    parsed.data.email,
  );
  if (!rl.allowed) {
    return { ok: false, errorKey: 'validation.rate_limit.exceeded' };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (!user || !user.passwordHash) {
    return { ok: false, errorKey: 'auth.invalid_credentials' };
  }
  // B2B and ADMIN both use this action; a B2C (phone-only) user must not log in
  // via this path.
  if (user.type === 'B2C') {
    return { ok: false, errorKey: 'auth.invalid_credentials' };
  }

  const match = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!match) {
    return { ok: false, errorKey: 'auth.invalid_credentials' };
  }

  if (user.status !== 'ACTIVE') {
    return { ok: false, errorKey: 'auth.account_disabled' };
  }

  const meta = await requestMeta();
  await createSession(user.id, {
    ipAddress: meta.ip ?? undefined,
    userAgent: meta.userAgent ?? undefined,
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: user.type === 'ADMIN' ? 'auth.admin.login' : 'auth.b2b.login',
      entityType: 'User',
      entityId: user.id,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    },
  });

  return {
    ok: true,
    data: {
      mustChangePassword: user.mustChangePassword,
      userType: user.type,
    },
  };
}

export async function changePasswordAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get('currentPassword'),
    newPassword: formData.get('newPassword'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const { getSessionUser } = await import('@/lib/session');
  const user = await getSessionUser();
  if (!user || !user.passwordHash) {
    return { ok: false, errorKey: 'auth.not_signed_in' };
  }

  const currentOk = await bcrypt.compare(
    parsed.data.currentPassword,
    user.passwordHash,
  );
  if (!currentOk) {
    return { ok: false, errorKey: 'auth.invalid_credentials' };
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'auth.password.change',
      entityType: 'User',
      entityId: user.id,
    },
  });

  logger.info({ userId: user.id }, 'auth.password.changed');
  return { ok: true, data: null };
}

export async function logoutAction(): Promise<void> {
  await destroySession();
}
