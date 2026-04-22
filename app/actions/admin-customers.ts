'use server';

/**
 * B2C customer management (Sprint 10 S10-D2-T2).
 * - OWNER + SALES_REP can view.
 * - OWNER-only can deactivate / reactivate (prevents sales rep from punishing
 *   annoying customers).
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

type ActionResult<T> = { ok: true; data: T } | { ok: false; errorKey: string };

const toggleSchema = z.object({
  userId: z.string().min(1),
});

export async function deactivateCustomerAction(
  input: z.input<typeof toggleSchema>,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };
  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, type: true, status: true },
  });
  if (!user || user.type !== 'B2C') {
    return { ok: false, errorKey: 'customer.not_found' };
  }
  if (user.status === 'DEACTIVATED') return { ok: true, data: null };
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { status: 'DEACTIVATED' },
    }),
    prisma.session.deleteMany({ where: { userId: user.id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'customer.deactivate',
        entityType: 'User',
        entityId: user.id,
        before: { status: user.status } as never,
        after: { status: 'DEACTIVATED' } as never,
      },
    }),
  ]);
  revalidatePath('/admin/customers', 'page');
  revalidatePath(`/admin/customers/${user.id}`, 'page');
  return { ok: true, data: null };
}

export async function reactivateCustomerAction(
  input: z.input<typeof toggleSchema>,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };
  const user = await prisma.user.findUnique({
    where: { id: parsed.data.userId },
    select: { id: true, type: true, status: true },
  });
  if (!user || user.type !== 'B2C') {
    return { ok: false, errorKey: 'customer.not_found' };
  }
  if (user.status === 'ACTIVE') return { ok: true, data: null };
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { status: 'ACTIVE' },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'customer.reactivate',
        entityType: 'User',
        entityId: user.id,
        before: { status: user.status } as never,
        after: { status: 'ACTIVE' } as never,
      },
    }),
  ]);
  revalidatePath('/admin/customers', 'page');
  revalidatePath(`/admin/customers/${user.id}`, 'page');
  return { ok: true, data: null };
}

const updateContactSchema = z.object({
  userId: z.string().min(1),
  name: z.string().trim().min(2).max(120),
  email: z
    .union([z.string().trim().toLowerCase().email(), z.literal('')])
    .transform((v) => (v === '' ? null : v)),
});

/**
 * OWNER + SALES_REP can fix customer contact info (e.g. typo in name/email)
 * while the customer is on the phone. Phone is immutable — changing it would
 * corrupt the B2C identity anchor.
 */
export async function updateCustomerContactAction(
  input: z.input<typeof updateContactSchema>,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER', 'SALES_REP']);
  const parsed = updateContactSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };
  const { userId, name, email } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, type: true, name: true, email: true },
  });
  if (!user || user.type !== 'B2C') {
    return { ok: false, errorKey: 'customer.not_found' };
  }
  if (email && email !== user.email) {
    const collision = await prisma.user.findUnique({ where: { email } });
    if (collision && collision.id !== userId) {
      return { ok: false, errorKey: 'customer.email_taken' };
    }
  }
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { name, email: email ?? null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'customer.contact_update',
        entityType: 'User',
        entityId: userId,
        before: { name: user.name, email: user.email } as never,
        after: { name, email } as never,
      },
    }),
  ]);
  revalidatePath('/admin/customers', 'page');
  revalidatePath(`/admin/customers/${userId}`, 'page');
  return { ok: true, data: null };
}
