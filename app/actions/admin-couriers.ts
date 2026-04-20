'use server';

/**
 * Admin courier CRUD (Sprint 5 S5-D1-T2). Editable partner list used when
 * transitioning orders to HANDED_TO_COURIER. Gated on OWNER + OPS per ADR-016.
 *
 * Delete follows the dependents rule used elsewhere: a Courier with any Orders
 * referencing it cannot be hard-deleted; the UI directs the admin to toggle
 * active=false instead (same effect for order-creation UX, preserves history).
 */
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { toLocalizedIssues } from '@/lib/validation/error-map';
import { courierSchema, type CourierInput } from '@/lib/validation/couriers';
import type { AdminRole } from '@prisma/client';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  fieldErrors?: { path: (string | number)[]; key: string }[];
};
type ActionResult<T> = ActionOk<T> | ActionErr;

const COURIER_ROLES: AdminRole[] = ['OWNER', 'OPS'];

async function requireCourierAdmin() {
  return requireAdmin(COURIER_ROLES);
}

async function audit(
  actorId: string,
  action: string,
  entityId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType: 'Courier',
      entityId,
      before: before as never,
      after: after as never,
    },
  });
}

function revalidateAdmin() {
  revalidatePath('/admin/couriers', 'page');
}

export async function createCourierAction(
  input: CourierInput,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireCourierAdmin();
  const parsed = courierSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.failed',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const courier = await prisma.courier.create({
    data: parsed.data,
  });

  await audit(actor.id, 'courier.create', courier.id, null, courier);
  revalidateAdmin();
  return { ok: true, data: { id: courier.id } };
}

export async function updateCourierAction(
  id: string,
  input: CourierInput,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireCourierAdmin();
  const parsed = courierSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.failed',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const before = await prisma.courier.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'courier.not_found' };

  const after = await prisma.courier.update({
    where: { id },
    data: parsed.data,
  });

  await audit(actor.id, 'courier.update', id, before, after);
  revalidateAdmin();
  return { ok: true, data: { id } };
}

export async function toggleCourierActiveAction(
  id: string,
): Promise<ActionResult<{ active: boolean }>> {
  const actor = await requireCourierAdmin();
  const before = await prisma.courier.findUnique({ where: { id } });
  if (!before) return { ok: false, errorKey: 'courier.not_found' };

  const after = await prisma.courier.update({
    where: { id },
    data: { active: !before.active },
  });

  await audit(actor.id, 'courier.toggle_active', id, before, after);
  revalidateAdmin();
  return { ok: true, data: { active: after.active } };
}

export async function deleteCourierAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const actor = await requireCourierAdmin();
  const before = await prisma.courier.findUnique({
    where: { id },
    include: { _count: { select: { orders: true } } },
  });
  if (!before) return { ok: false, errorKey: 'courier.not_found' };

  if (before._count.orders > 0) {
    return { ok: false, errorKey: 'courier.has_dependents' };
  }

  await prisma.courier.delete({ where: { id } });
  await audit(actor.id, 'courier.delete', id, before, null);
  revalidateAdmin();
  return { ok: true, data: { id } };
}
