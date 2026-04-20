'use server';

/**
 * Customer-facing order Server Actions. Admin-side mutations live in
 * `app/actions/admin-orders.ts`; this file hosts what a logged-in B2C user
 * can invoke from `/account/orders/[id]`.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

/**
 * Pre-HANDED_TO_COURIER states the customer can request cancellation from.
 * Matches PRD Feature 5's "customer requests pre-delivery; admin approves/denies."
 */
const CANCELLABLE_STATUSES = ['PENDING_CONFIRMATION', 'CONFIRMED'] as const;

const cancelRequestSchema = z.object({
  orderId: z.string().min(1),
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type RequestOrderCancellationInput = z.infer<typeof cancelRequestSchema>;

export async function requestOrderCancellationAction(
  input: RequestOrderCancellationInput,
): Promise<ActionResult<{ orderId: string }>> {
  const user = await getOptionalUser();
  if (!user) return { ok: false, errorKey: 'auth.required' };

  const parsed = cancelRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: {
      id: true,
      userId: true,
      status: true,
      cancellationRequestedAt: true,
    },
  });
  if (!order) return { ok: false, errorKey: 'order.not_found' };
  if (order.userId !== user.id && user.type !== 'ADMIN') {
    return { ok: false, errorKey: 'order.not_found' };
  }

  if (
    !CANCELLABLE_STATUSES.includes(
      order.status as (typeof CANCELLABLE_STATUSES)[number],
    )
  ) {
    return { ok: false, errorKey: 'order.cancel.too_late' };
  }

  if (order.cancellationRequestedAt) {
    return { ok: false, errorKey: 'order.cancel.already_requested' };
  }

  await prisma.order.update({
    where: { id: order.id },
    data: {
      cancellationRequestedAt: new Date(),
      cancellationReason: parsed.data.reason ?? null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'order.cancellation_requested',
      entityType: 'Order',
      entityId: order.id,
      before: { cancellationRequestedAt: null } as never,
      after: {
        cancellationRequestedAt: new Date().toISOString(),
        reason: parsed.data.reason ?? null,
      } as never,
    },
  });

  revalidatePath('/account/orders/[id]', 'page');
  revalidatePath('/admin/orders', 'page');
  revalidatePath(`/admin/orders/${order.id}`, 'page');

  return { ok: true, data: { orderId: order.id } };
}
