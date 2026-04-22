'use server';

/**
 * Admin returns CRUD (Sprint 5 S5-D7-T2 + Sprint 10 policy + stock release).
 *
 * Customer messages the store via WhatsApp; ops types the return in here.
 * No self-serve return UI in MVP. Sprint 10 adds:
 *   - Return policy enforcement (load `returns.policy` Setting and validate
 *     window / min order / per-product `returnable` flag).
 *   - Optional admin override with required `overrideReason`; role gated by
 *     `policy.overrideRoles`.
 *   - Stock release when refundDecision = APPROVED_CASH | APPROVED_CARD_MANUAL.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import {
  canOverrideReturnPolicy,
  checkReturnPolicy,
  getReturnPolicy,
  type ReturnCheckResult,
} from '@/lib/returns/policy';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  policyFailure?: Exclude<ReturnCheckResult, { ok: true }>;
};
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
  override: z.boolean().optional().default(false),
  overrideReason: z
    .string()
    .trim()
    .max(500)
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

  const {
    orderId,
    reason,
    refundDecision,
    refundAmountEgp,
    note,
    items,
    override,
    overrideReason,
  } = parsed.data;

  // Verify all items belong to the same order + load product returnable flag.
  const orderItems = await prisma.orderItem.findMany({
    where: { id: { in: items.map((i) => i.orderItemId) } },
    select: {
      id: true,
      orderId: true,
      qty: true,
      skuSnapshot: true,
      product: { select: { returnable: true } },
    },
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

  // Load the order for policy checks (delivery date, total).
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, deliveredAt: true, totalEgp: true, status: true },
  });
  if (!order) return { ok: false, errorKey: 'return.order_not_found' };

  const policy = await getReturnPolicy();
  const check = checkReturnPolicy(policy, {
    orderDeliveredAt: order.deliveredAt,
    orderTotalEgp: Number(order.totalEgp),
    items: orderItems.map((oi) => ({
      sku: oi.skuSnapshot,
      // If the product row was deleted, treat as non-returnable — safer default.
      returnable: oi.product?.returnable ?? false,
    })),
  });

  if (!check.ok) {
    if (!override) {
      return {
        ok: false,
        errorKey: 'return.policy_failed',
        policyFailure: check,
      };
    }
    if (!canOverrideReturnPolicy(policy, actor.adminRole ?? null)) {
      return { ok: false, errorKey: 'return.override_forbidden' };
    }
    if (!overrideReason) {
      return { ok: false, errorKey: 'return.override_reason_required' };
    }
  }

  const returned = await prisma.return.create({
    data: {
      orderId,
      reason,
      refundDecision,
      refundAmountEgp: refundAmountEgp ?? null,
      note: note ?? null,
      policyOverride: !check.ok && override,
      overrideReason: !check.ok && override ? (overrideReason ?? null) : null,
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
        policyOverride: !check.ok && override,
        overrideReason: !check.ok && override ? (overrideReason ?? null) : null,
        policyCheck: check,
      } as never,
    },
  });

  revalidatePath('/admin/orders', 'page');
  revalidatePath(`/admin/orders/${orderId}`, 'page');
  revalidatePath('/admin/orders/returns', 'page');
  revalidatePath('/admin/returns', 'page');
  return { ok: true, data: { returnId: returned.id } };
}

/**
 * Flip a Return's refund decision. When flipping to APPROVED_CASH or
 * APPROVED_CARD_MANUAL, stock is restored in the same transaction (idempotent
 * via `stockReleasedAt`). Release writes `InventoryMovement(type=RETURN)`.
 */
const updateDecisionSchema = z.object({
  returnId: z.string().min(1),
  refundDecision: z.enum([
    'PENDING',
    'APPROVED_CASH',
    'APPROVED_CARD_MANUAL',
    'DENIED',
  ]),
  refundAmountEgp: z.number().nonnegative().nullable().optional(),
  note: z.string().trim().max(1000).nullable().optional(),
});

export async function updateReturnDecisionAction(
  input: z.input<typeof updateDecisionSchema>,
): Promise<ActionResult<{ stockReleased: boolean }>> {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const parsed = updateDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };
  const { returnId, refundDecision, refundAmountEgp, note } = parsed.data;

  const ret = await prisma.return.findUnique({
    where: { id: returnId },
    include: {
      items: {
        include: {
          orderItem: {
            select: { id: true, productId: true, skuSnapshot: true },
          },
        },
      },
    },
  });
  if (!ret) return { ok: false, errorKey: 'return.not_found' };

  const willApprove =
    refundDecision === 'APPROVED_CASH' ||
    refundDecision === 'APPROVED_CARD_MANUAL';
  const shouldReleaseStock = willApprove && !ret.stockReleasedAt;

  const previous = {
    refundDecision: ret.refundDecision,
    refundAmountEgp: ret.refundAmountEgp,
    stockReleasedAt: ret.stockReleasedAt,
  };

  await prisma.$transaction(async (tx) => {
    await tx.return.update({
      where: { id: returnId },
      data: {
        refundDecision,
        refundAmountEgp:
          refundAmountEgp === undefined ? undefined : refundAmountEgp,
        note: note === undefined ? undefined : note,
        stockReleasedAt: shouldReleaseStock ? new Date() : undefined,
      },
    });
    if (shouldReleaseStock) {
      for (const ri of ret.items) {
        const productId = ri.orderItem.productId;
        if (!productId) continue;
        await tx.inventory.upsert({
          where: { productId },
          update: { currentQty: { increment: ri.qty } },
          create: { productId, currentQty: ri.qty },
        });
        await tx.inventoryMovement.create({
          data: {
            productId,
            type: 'RETURN',
            qtyDelta: ri.qty,
            reason: `Return ${ret.id}`,
            refId: ret.orderId,
            actorId: actor.id,
          },
        });
      }
    }
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'order.return_decision_update',
        entityType: 'Return',
        entityId: ret.id,
        before: previous as never,
        after: {
          refundDecision,
          refundAmountEgp: refundAmountEgp ?? previous.refundAmountEgp,
          stockReleased: shouldReleaseStock,
        } as never,
      },
    });
  });

  revalidatePath(`/admin/orders/${ret.orderId}`, 'page');
  revalidatePath('/admin/orders/returns', 'page');
  revalidatePath('/admin/returns', 'page');
  return { ok: true, data: { stockReleased: shouldReleaseStock } };
}
