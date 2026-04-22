'use server';

/**
 * Admin user management (Sprint 10 S10-D1-T2/T3).
 *
 * - OWNER-only CRUD.
 * - Creation goes through AdminInvite: OWNER invites by email + role, recipient
 *   clicks emailed link and sets their own password. No "set password for
 *   someone else" path exists (avoids credentials-over-email risk).
 * - Self-guard: an OWNER can neither demote nor deactivate themselves (prevents
 *   lockout). Last remaining OWNER cannot be demoted either.
 */
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { randomToken, sha256Hex } from '@/lib/crypto';
import { enqueueJob } from '@/lib/queue';
import { logger } from '@/lib/logger';
import { createSession } from '@/lib/session';
import { renderAdminInviteEmail } from '@/lib/email/admin-invite';
import { headers } from 'next/headers';
import { getClientIp } from '@/lib/request-ip';

const INVITE_TTL_HOURS = 48;

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  role: z.enum(['OWNER', 'OPS', 'SALES_REP']),
});

export async function inviteAdminAction(
  formData: FormData,
): Promise<ActionResult<{ inviteId: string }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = inviteSchema.safeParse({
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };
  const { email, role } = parsed.data;

  // Block if an active user already exists with this email.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { ok: false, errorKey: 'admin.invite.email_taken' };

  // Supersede any prior pending invites for this email.
  const rawToken = randomToken(32);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);

  const invite = await prisma.$transaction(async (tx) => {
    await tx.adminInvite.deleteMany({
      where: { email, acceptedAt: null },
    });
    return tx.adminInvite.create({
      data: {
        email,
        role,
        invitedById: actor.id,
        tokenHash,
        expiresAt,
      },
      select: { id: true },
    });
  });

  const baseUrl =
    process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';
  const locale: 'ar' | 'en' = 'ar';
  const acceptUrl = `${baseUrl}/${locale}/admin/invite/accept?token=${encodeURIComponent(rawToken)}`;
  const message = renderAdminInviteEmail({
    inviterName: actor.name,
    role,
    acceptUrl,
    expiresInHours: INVITE_TTL_HOURS,
    locale,
  });
  try {
    await enqueueJob('send-email', {
      to: email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (err) {
    logger.warn({ err, email }, 'admin.invite.email_enqueue_failed');
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'admin.user.invite',
      entityType: 'AdminInvite',
      entityId: invite.id,
      after: { email, role },
    },
  });

  revalidatePath('/admin/users', 'page');
  return { ok: true, data: { inviteId: invite.id } };
}

export async function revokeAdminInviteAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER']);
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, errorKey: 'validation.invalid' };
  const invite = await prisma.adminInvite.findUnique({ where: { id } });
  if (!invite || invite.acceptedAt) {
    return { ok: false, errorKey: 'admin.invite.not_found' };
  }
  await prisma.adminInvite.delete({ where: { id } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'admin.user.invite_revoke',
      entityType: 'AdminInvite',
      entityId: id,
      before: { email: invite.email, role: invite.role },
    },
  });
  revalidatePath('/admin/users', 'page');
  return { ok: true, data: null };
}

export async function resendAdminInviteAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER']);
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, errorKey: 'validation.invalid' };
  const invite = await prisma.adminInvite.findUnique({ where: { id } });
  if (!invite || invite.acceptedAt) {
    return { ok: false, errorKey: 'admin.invite.not_found' };
  }

  // Rotate the token to invalidate any intercepted copy.
  const rawToken = randomToken(32);
  const tokenHash = sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000);
  await prisma.adminInvite.update({
    where: { id },
    data: { tokenHash, expiresAt },
  });

  const baseUrl =
    process.env.APP_URL?.replace(/\/+$/, '') ?? 'https://printbyfalcon.com';
  const locale: 'ar' | 'en' = 'ar';
  const acceptUrl = `${baseUrl}/${locale}/admin/invite/accept?token=${encodeURIComponent(rawToken)}`;
  const message = renderAdminInviteEmail({
    inviterName: actor.name,
    role: invite.role,
    acceptUrl,
    expiresInHours: INVITE_TTL_HOURS,
    locale,
  });
  try {
    await enqueueJob('send-email', {
      to: invite.email,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });
  } catch (err) {
    logger.warn(
      { err, email: invite.email },
      'admin.invite.resend_enqueue_failed',
    );
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'admin.user.invite_resend',
      entityType: 'AdminInvite',
      entityId: id,
    },
  });

  revalidatePath('/admin/users', 'page');
  return { ok: true, data: null };
}

const acceptSchema = z
  .object({
    token: z.string().min(8),
    name: z.string().trim().min(2).max(120),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'passwords do not match',
    path: ['confirmPassword'],
  });

/**
 * Recipient lands on /admin/invite/accept?token=... and submits this action
 * with a chosen password. On success we create the ADMIN User, start a
 * session, and redirect to /admin.
 */
export async function acceptAdminInviteAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const parsed = acceptSchema.safeParse({
    token: formData.get('token'),
    name: formData.get('name'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };
  const { token, name, password } = parsed.data;
  const tokenHash = sha256Hex(token);

  const invite = await prisma.adminInvite.findUnique({ where: { tokenHash } });
  if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
    return { ok: false, errorKey: 'admin.invite.invalid_or_expired' };
  }

  // Guard: if an ADMIN with this email was created in parallel somehow.
  const existing = await prisma.user.findUnique({
    where: { email: invite.email },
  });
  if (existing) return { ok: false, errorKey: 'admin.invite.email_taken' };

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        type: 'ADMIN',
        adminRole: invite.role,
        email: invite.email,
        name,
        passwordHash,
        status: 'ACTIVE',
      },
    });
    await tx.adminInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date() },
    });
    await tx.auditLog.create({
      data: {
        actorId: created.id,
        action: 'admin.user.invite_accept',
        entityType: 'User',
        entityId: created.id,
        after: { email: invite.email, role: invite.role },
      },
    });
    return created;
  });

  // Sign the new admin in.
  const h = await headers();
  await createSession(user.id, {
    ipAddress: getClientIp(h) ?? undefined,
    userAgent: h.get('user-agent') ?? undefined,
  });

  redirect('/ar/admin');
}

const updateRoleSchema = z.object({
  userId: z.string().min(1),
  role: z.enum(['OWNER', 'OPS', 'SALES_REP']),
});

export async function updateAdminRoleAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = updateRoleSchema.safeParse({
    userId: formData.get('userId'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };
  const { userId, role } = parsed.data;

  if (userId === actor.id)
    return { ok: false, errorKey: 'admin.user.cannot_modify_self' };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.type !== 'ADMIN') {
    return { ok: false, errorKey: 'admin.user.not_found' };
  }
  if (target.adminRole === role) {
    return { ok: true, data: null };
  }
  // Don't drop the last OWNER.
  if (target.adminRole === 'OWNER' && role !== 'OWNER') {
    const activeOwners = await prisma.user.count({
      where: { type: 'ADMIN', adminRole: 'OWNER', status: 'ACTIVE' },
    });
    if (activeOwners <= 1) {
      return { ok: false, errorKey: 'admin.user.last_owner' };
    }
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { adminRole: role } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'admin.user.role_change',
        entityType: 'User',
        entityId: userId,
        before: { role: target.adminRole },
        after: { role },
      },
    }),
  ]);

  revalidatePath('/admin/users', 'page');
  revalidatePath(`/admin/users/${userId}`, 'page');
  return { ok: true, data: null };
}

export async function deactivateAdminAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER']);
  const userId = String(formData.get('userId') ?? '');
  if (!userId) return { ok: false, errorKey: 'validation.invalid' };
  if (userId === actor.id)
    return { ok: false, errorKey: 'admin.user.cannot_modify_self' };

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.type !== 'ADMIN') {
    return { ok: false, errorKey: 'admin.user.not_found' };
  }
  if (target.status === 'DEACTIVATED') return { ok: true, data: null };

  if (target.adminRole === 'OWNER') {
    const activeOwners = await prisma.user.count({
      where: { type: 'ADMIN', adminRole: 'OWNER', status: 'ACTIVE' },
    });
    if (activeOwners <= 1) {
      return { ok: false, errorKey: 'admin.user.last_owner' };
    }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { status: 'DEACTIVATED' },
    }),
    prisma.session.deleteMany({ where: { userId } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'admin.user.deactivate',
        entityType: 'User',
        entityId: userId,
        before: { status: target.status },
        after: { status: 'DEACTIVATED' },
      },
    }),
  ]);

  revalidatePath('/admin/users', 'page');
  revalidatePath(`/admin/users/${userId}`, 'page');
  return { ok: true, data: null };
}

export async function reactivateAdminAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER']);
  const userId = String(formData.get('userId') ?? '');
  if (!userId) return { ok: false, errorKey: 'validation.invalid' };
  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target || target.type !== 'ADMIN') {
    return { ok: false, errorKey: 'admin.user.not_found' };
  }
  if (target.status === 'ACTIVE') return { ok: true, data: null };
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { status: 'ACTIVE' } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'admin.user.reactivate',
        entityType: 'User',
        entityId: userId,
        before: { status: target.status },
        after: { status: 'ACTIVE' },
      },
    }),
  ]);
  revalidatePath('/admin/users', 'page');
  revalidatePath(`/admin/users/${userId}`, 'page');
  return { ok: true, data: null };
}
