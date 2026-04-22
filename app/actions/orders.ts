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
import { userCanAccessOrder } from '@/lib/orders/ownership';
import { addBulkToCartAction } from '@/app/actions/cart';

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
  // Sprint 8 S8-D9-T3 — widen to any user with access (owner user OR primary
  // user of the order's Company OR any admin). Previously only a direct
  // owner-by-userId check; left B2B multi-user flows vulnerable to "order
  // not found" false positives and blocked a future v1.1 change.
  const { canAccess } = await userCanAccessOrder(user, order.id);
  if (!canAccess) return { ok: false, errorKey: 'order.not_found' };

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

// ---------------------------------------------------------------------------
// Sprint 8 S8-D5-T1 — One-click reorder.
//
// Reloads every ACTIVE line from a past order into the current cart at today's
// resolved price (PRD Feature 4: "adds available items at current prices").
// Archived / deleted / out-of-stock products are skipped silently — the caller
// should show them via the `reorder-preview` endpoint first + let the user
// confirm. The modal handles the "skip OOS / archived" warning (S8-D5-T2).
// ---------------------------------------------------------------------------

const reorderSchema = z.object({
  orderId: z.string().min(1),
  /// Optional list of productIds the caller explicitly wants to skip (e.g.
  /// the user unchecked some OOS rows in the preview modal). If omitted, all
  /// ACTIVE lines are attempted — inactive/archived products are always
  /// filtered out server-side.
  skipProductIds: z.array(z.string()).optional(),
});

export type ReorderInput = z.infer<typeof reorderSchema>;

export async function reorderAction(input: ReorderInput): Promise<
  ActionResult<{
    added: Array<{ productId: string; qty: number }>;
    skipped: Array<{ productId: string; reason: string }>;
    archived: Array<{ sku: string; nameAr: string; nameEn: string }>;
  }>
> {
  const user = await getOptionalUser();
  if (!user) return { ok: false, errorKey: 'auth.required' };

  const parsed = reorderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  const { canAccess } = await userCanAccessOrder(user, parsed.data.orderId);
  if (!canAccess) return { ok: false, errorKey: 'order.not_found' };

  const order = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    include: {
      items: {
        include: {
          product: { select: { id: true, status: true, sku: true } },
        },
      },
    },
  });
  if (!order) return { ok: false, errorKey: 'order.not_found' };

  const skip = new Set(parsed.data.skipProductIds ?? []);
  const archived: Array<{ sku: string; nameAr: string; nameEn: string }> = [];
  const addRows: Array<{ productId: string; qty: number }> = [];

  for (const it of order.items) {
    if (!it.product || it.product.status !== 'ACTIVE') {
      archived.push({
        sku: it.skuSnapshot,
        nameAr: it.nameArSnapshot,
        nameEn: it.nameEnSnapshot,
      });
      continue;
    }
    if (skip.has(it.product.id)) continue;
    addRows.push({ productId: it.product.id, qty: it.qty });
  }

  if (addRows.length === 0) {
    return {
      ok: true,
      data: { added: [], skipped: [], archived },
    };
  }

  const res = await addBulkToCartAction({ rows: addRows });
  if (!res.ok) return res;

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: 'order.reorder',
      entityType: 'Order',
      entityId: order.id,
      after: {
        added: res.data.added.length,
        skipped: res.data.skipped.length,
        archived: archived.length,
      } as never,
    },
  });

  revalidatePath('/', 'layout');
  return {
    ok: true,
    data: { ...res.data, archived },
  };
}
