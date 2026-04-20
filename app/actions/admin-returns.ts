'use server';

/**
 * Admin returns CRUD (Sprint 5 S5-D7-T2).
 *
 * Customer messages the store via WhatsApp; ops types the return in here.
 * No self-serve return UI in MVP. The `RefundDecision` enum is a manual
 * placeholder per ADR-033 resolution — no automatic refund integration.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const recordReturnSchema = z.object({
  orderId: z.string().min(1),
  reason: z.string().trim().min(3).max(500),
  refundDecision: z.enum([
    'PENDING',
    'APPROVED_CASH',
    'APPROVED_CARD_MANUAL',
    'DENIED',
  ]),
  refundAmountEgp: z
    .number()
    .nonnegative()
    .optional()
    .transform((v) => (v === undefined ? undefined : v)),
  note: z
    .string()
    .trim()
    .max(1_000)
    .optional()
    .transform((v) => (v ? v : undefined)),
  items: z
    .array(
      z.object({
        orderItemId: z.string().min(1),
        qty: z.coerce.number().int().positive(),
      }),
    )
    .min(1)
    .max(50),
});

export type RecordReturnInput = z.input<typeof recordReturnSchema>;

export async function recordReturnAction(
  input: RecordReturnInput,
): Promise<ActionResult<{ returnId: string }>> {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const parsed = recordReturnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  const { orderId, reason, refundDecision, refundAmountEgp, note, items } =
    parsed.data;

  // Verify all items belong to the same order.
  const orderItems = await prisma.orderItem.findMany({
    where: { id: { in: items.map((i) => i.orderItemId) } },
    select: { id: true, orderId: true, qty: true },
  });
  if (orderItems.length !== items.length) {
    return { ok: false, errorKey: 'return.items_not_found' };
  }
  for (const oi of orderItems) {
    if (oi.orderId !== orderId) {
      return { ok: false, errorKey: 'return.item_wrong_order' };
    }
    const reqQty = items.find((i) => i.orderItemId === oi.id)?.qty ?? 0;
    if (reqQty > oi.qty) {
      return { ok: false, errorKey: 'return.qty_exceeds_order' };
    }
  }

  const returned = await prisma.return.create({
    data: {
      orderId,
      reason,
      refundDecision,
      refundAmountEgp: refundAmountEgp ?? null,
      note: note ?? null,
      createdById: actor.id,
      items: {
        create: items.map((i) => ({
          orderItemId: i.orderItemId,
          qty: i.qty,
        })),
      },
    },
    select: { id: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'order.return_recorded',
      entityType: 'Return',
      entityId: returned.id,
      before: null as never,
      after: {
        orderId,
        reason,
        refundDecision,
        refundAmountEgp: refundAmountEgp ?? null,
        itemCount: items.length,
      } as never,
    },
  });

  revalidatePath('/admin/orders', 'page');
  revalidatePath(`/admin/orders/${orderId}`, 'page');
  revalidatePath('/admin/orders/returns', 'page');
  return { ok: true, data: { returnId: returned.id } };
}
