'use server';

/**
 * Admin order Server Actions — status updates, courier handoff, cancellation.
 * Gated on OWNER + OPS per ADR-016. All transitions go through
 * `updateOrderStatusAction` so the state machine + audit trail + notification
 * enqueue are in one place.
 *
 * Reservation release on CANCELLED lands here (Sprint 4 parking-lot item);
 * RETURNED stock-addback is Sprint 5 Day 7 (returns admin UI).
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { OrderStatus, Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { enqueueJob } from '@/lib/queue';
import {
  canTransitionOrderStatus,
  statusReleasesInventory,
} from '@/lib/order/status';
import {
  renderOrderStatusChange,
  type OrderStatusKey,
  type SupportedLocale,
} from '@/lib/whatsapp-templates';
import { isNotificationOptedOut } from '@/lib/settings/notifications';
import { RATE_LIMIT_RULES, checkAndIncrement } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const courierHandoffSchema = z.object({
  courierId: z.string().min(1),
  courierPhone: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : undefined)),
  waybill: z
    .string()
    .trim()
    .max(60)
    .optional()
    .transform((v) => (v ? v : undefined)),
  expectedDeliveryDate: z
    .string()
    .datetime()
    .optional()
    .transform((v) => (v ? new Date(v) : undefined)),
});

/** Pre-transform input — what client-side forms send over the wire. */
export type CourierHandoffInput = z.input<typeof courierHandoffSchema>;

const updateSchema = z.object({
  orderId: z.string().min(1),
  newStatus: z.enum([
    'PENDING_CONFIRMATION',
    'CONFIRMED',
    'HANDED_TO_COURIER',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
    'RETURNED',
    'DELAYED_OR_ISSUE',
  ]),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
  courierHandoff: courierHandoffSchema.optional(),
});

/** Pre-transform input — what client-side forms send over the wire. */
export type UpdateOrderStatusInput = z.input<typeof updateSchema>;

export async function updateOrderStatusAction(
  input: UpdateOrderStatusInput,
): Promise<ActionResult<{ orderId: string; newStatus: OrderStatus }>> {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  const { orderId, newStatus, note, courierHandoff } = parsed.data;

  // S5-D7-T1: DELAYED_OR_ISSUE always requires a reason so the customer message
  // has something meaningful. Other statuses treat `note` as optional.
  if (newStatus === 'DELAYED_OR_ISSUE' && !note) {
    return { ok: false, errorKey: 'order.delayed.note_required' };
  }

  // Load the order + items + user (for notification) in the same transaction context.
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: { select: { id: true, productId: true, qty: true } },
        user: { select: { id: true, phone: true, languagePref: true } },
      },
    });
    // `order` here already has type / contactEmail / contactName / contactPhone
    // via the default findUnique include — explicit list kept lean in the
    // items+user block since the other scalars are on by default.
    if (!order) return { ok: false as const, errorKey: 'order.not_found' };

    if (!canTransitionOrderStatus(order.status, newStatus)) {
      return {
        ok: false as const,
        errorKey: 'order.invalid_status_transition',
      };
    }

    // Transition-specific validation + side-effects on the Order row.
    const updateData: Prisma.OrderUpdateInput = { status: newStatus };

    if (newStatus === 'HANDED_TO_COURIER') {
      if (!courierHandoff) {
        return { ok: false as const, errorKey: 'order.courier_required' };
      }
      const courier = await tx.courier.findUnique({
        where: { id: courierHandoff.courierId },
      });
      if (!courier || !courier.active) {
        return { ok: false as const, errorKey: 'courier.not_available' };
      }
      updateData.courier = { connect: { id: courier.id } };
      updateData.courierPhoneSnapshot =
        courierHandoff.courierPhone ?? courier.phone ?? null;
      updateData.waybill = courierHandoff.waybill ?? null;
      updateData.expectedDeliveryDate =
        courierHandoff.expectedDeliveryDate ?? null;
    }

    if (newStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: updateData,
    });

    // Status event + audit entry.
    await tx.orderStatusEvent.create({
      data: {
        orderId: order.id,
        status: newStatus,
        note: note ?? null,
        actorId: actor.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'order.status_change',
        entityType: 'Order',
        entityId: order.id,
        before: { status: order.status } as never,
        after: { status: newStatus, note } as never,
      },
    });

    // Release inventory reservations on CANCELLED — add stock back + log movement.
    if (statusReleasesInventory(newStatus)) {
      const reservations = await tx.inventoryReservation.findMany({
        where: {
          type: 'ORDER',
          refId: { in: order.items.map((i) => i.id) },
        },
      });
      for (const r of reservations) {
        await tx.inventory.update({
          where: { productId: r.productId },
          data: { currentQty: { increment: r.qty } },
        });
        await tx.inventoryMovement.create({
          data: {
            productId: r.productId,
            type: 'RESERVATION_RELEASE',
            qtyDelta: r.qty,
            refId: order.id,
            actorId: actor.id,
            reason: `order.cancelled.${newStatus}`,
          },
        });
      }
      if (reservations.length > 0) {
        await tx.inventoryReservation.deleteMany({
          where: { id: { in: reservations.map((r) => r.id) } },
        });
      }
    }

    // Compose + enqueue status-change WhatsApp (B2C phone preferred; guest falls
    // back to the order's contactPhone). Email mirror for B2B arrives in S5-D4.
    const phone = order.user?.phone ?? order.contactPhone;
    const locale: SupportedLocale =
      order.user?.languagePref === 'EN' ? 'en' : 'ar';

    let courierName: string | undefined;
    let courierPhone: string | undefined;
    if (newStatus === 'HANDED_TO_COURIER' && courierHandoff) {
      const courier = await tx.courier.findUnique({
        where: { id: courierHandoff.courierId },
        select: { nameAr: true, nameEn: true, phone: true },
      });
      courierName = locale === 'ar' ? courier?.nameAr : courier?.nameEn;
      courierPhone = courierHandoff.courierPhone ?? courier?.phone ?? undefined;
    }

    const body = renderOrderStatusChange(
      {
        orderNumber: order.orderNumber,
        newStatus: newStatus as OrderStatusKey,
        note,
        courierName,
        courierPhone,
      },
      locale,
    );

    // Opt-out check (S5-D6-T2): admin can disable per-channel × per-status
    // notifications via the settings panel. Skipping creation entirely keeps
    // the Notification table clean (no ghost PENDING rows we never sent).
    const whatsappOptedOut = await isNotificationOptedOut(
      'WHATSAPP',
      newStatus,
    );
    const emailOptedOut = await isNotificationOptedOut('EMAIL', newStatus);

    const notification = whatsappOptedOut
      ? null
      : await tx.notification.create({
          data: {
            userId: order.userId ?? null,
            channel: 'WHATSAPP',
            template: `order.statusChange.${newStatus.toLowerCase()}`,
            payload: { phone, body, locale } as never,
            relatedOrderId: order.id,
            status: 'PENDING',
          },
        });

    // B2B-only email mirror per PRD Feature 5. B2C stays WhatsApp-only so we
    // don't spam buyers with two-channel updates they didn't sign up for.
    let emailNotification: { id: string } | null = null;
    let emailRendered: {
      to: string;
      subject: string;
      text: string;
      html: string;
    } | null = null;
    if (order.type === 'B2B' && order.contactEmail && !emailOptedOut) {
      const { renderOrderStatusChangeEmail } =
        await import('@/lib/email/order-status-change');
      const baseUrl =
        process.env.APP_URL?.replace(/\/$/, '') ?? 'https://printbyfalcon.com';
      const localeSegment = locale === 'ar' ? 'ar' : 'en';
      const orderUrl = `${baseUrl}/${localeSegment}/account/orders/${order.id}`;

      const rendered = renderOrderStatusChangeEmail({
        locale,
        orderNumber: order.orderNumber,
        newStatus: newStatus as OrderStatusKey,
        recipientName: order.contactName,
        note,
        courierName,
        courierPhone,
        waybill: updateData.waybill as string | undefined,
        expectedDeliveryDate:
          (updateData.expectedDeliveryDate as Date | undefined) ?? null,
        orderUrl,
      });

      emailNotification = await tx.notification.create({
        data: {
          userId: order.userId ?? null,
          channel: 'EMAIL',
          template: `order.statusChange.${newStatus.toLowerCase()}`,
          payload: {
            to: order.contactEmail,
            subject: rendered.subject,
            locale,
          } as never,
          relatedOrderId: order.id,
          status: 'PENDING',
        },
      });
      emailRendered = {
        to: order.contactEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      };
    }

    return {
      ok: true as const,
      data: {
        orderId: order.id,
        newStatus: updated.status,
        notificationId: notification?.id ?? null,
        phone,
        body,
        email: emailRendered
          ? { ...emailRendered, notificationId: emailNotification!.id }
          : null,
      },
    };
  });

  if (!result.ok) return result;

  // Enqueue outside the transaction so the pg-boss insert doesn't block the
  // order update (pg-boss uses its own schema; the job row will reference the
  // now-committed order). Worker flips each Notification row to SENT / FAILED.
  // Skip entirely when the notification was opted out inside the transaction.
  if (result.data.notificationId) {
    // Per-phone rate limit (S5-D8-T3): 5 messages / phone / hour. If exceeded,
    // mark the Notification as FAILED with a 'rate_limited' reason rather than
    // enqueueing — the customer gets no message, ops sees the row in the
    // Notification table, and the storm is capped.
    const rl = await checkAndIncrement(
      RATE_LIMIT_RULES.notificationPerPhone,
      result.data.phone,
    );
    if (!rl.allowed) {
      logger.warn(
        {
          phone: result.data.phone.slice(0, 4) + '****',
          notificationId: result.data.notificationId,
          retryAfter: rl.retryAfterSeconds,
        },
        'notification.rate_limited',
      );
      await prisma.notification.update({
        where: { id: result.data.notificationId },
        data: {
          status: 'FAILED',
          errorMessage: `rate_limited: max ${RATE_LIMIT_RULES.notificationPerPhone.max} per ${RATE_LIMIT_RULES.notificationPerPhone.windowSeconds}s`,
        },
      });
    } else {
      await enqueueJob(
        'send-whatsapp',
        {
          phone: result.data.phone,
          body: result.data.body,
          notificationId: result.data.notificationId,
        },
        { retryLimit: 3, retryDelay: 60, retryBackoff: true },
      );
    }
  }

  if (result.data.email) {
    await enqueueJob(
      'send-email',
      {
        to: result.data.email.to,
        subject: result.data.email.subject,
        text: result.data.email.text,
        html: result.data.email.html,
        notificationId: result.data.email.notificationId,
      },
      { retryLimit: 3, retryDelay: 60, retryBackoff: true },
    );
  }

  revalidatePath('/admin/orders', 'page');
  revalidatePath(`/admin/orders/${result.data.orderId}`, 'page');
  revalidatePath('/account/orders/[id]', 'page');

  return {
    ok: true,
    data: {
      orderId: result.data.orderId,
      newStatus: result.data.newStatus,
    },
  };
}

/**
 * Customer cancellation decision (S5-D4-T2). Approve → delegate to
 * `updateOrderStatusAction` with newStatus=CANCELLED (that path already
 * releases reservations + audit-logs + enqueues notification). Deny → record
 * resolution fields + audit + notify the customer that their request was
 * declined.
 */
const processCancellationSchema = z.object({
  orderId: z.string().min(1),
  decision: z.enum(['APPROVED', 'DENIED']),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type ProcessCancellationInput = z.input<
  typeof processCancellationSchema
>;

export async function processCancellationAction(
  input: ProcessCancellationInput,
): Promise<ActionResult<{ orderId: string; decision: 'APPROVED' | 'DENIED' }>> {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const parsed = processCancellationSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  const { orderId, decision, note } = parsed.data;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      status: true,
      cancellationRequestedAt: true,
      cancellationResolvedAt: true,
    },
  });
  if (!order) return { ok: false, errorKey: 'order.not_found' };
  if (!order.cancellationRequestedAt) {
    return { ok: false, errorKey: 'cancellation.none_pending' };
  }
  if (order.cancellationResolvedAt) {
    return { ok: false, errorKey: 'cancellation.already_resolved' };
  }

  if (decision === 'APPROVED') {
    // Delegate the status change — inventory release + audit + notification
    // all live inside updateOrderStatusAction already.
    const res = await updateOrderStatusAction({
      orderId,
      newStatus: 'CANCELLED',
      note: note ?? 'Customer cancellation request approved',
    });
    if (!res.ok) return res;

    // Stamp the cancellation resolution fields so the queue + customer UI
    // can distinguish "cancelled by customer request" from other cancellation
    // paths (ops-initiated, failed-payment, etc.)
    await prisma.order.update({
      where: { id: orderId },
      data: {
        cancellationResolvedAt: new Date(),
        cancellationResolution: 'APPROVED',
        cancellationResolutionNote: note ?? null,
        cancellationResolvedById: actor.id,
      },
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        cancellationResolvedAt: new Date(),
        cancellationResolution: 'DENIED',
        cancellationResolutionNote: note ?? null,
        cancellationResolvedById: actor.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'order.cancellation_denied',
        entityType: 'Order',
        entityId: orderId,
        before: { cancellationResolution: null } as never,
        after: {
          cancellationResolution: 'DENIED',
          note: note ?? null,
        } as never,
      },
    });
  }

  revalidatePath('/admin/orders', 'page');
  revalidatePath(`/admin/orders/${orderId}`, 'page');
  revalidatePath('/account/orders/[id]', 'page');

  return { ok: true, data: { orderId, decision } };
}

/**
 * Admin-editable notes split (S5-D3-T2):
 *   - internalNotes — ops/sales-only, never surfaced to customers
 *   - customerNotes — rendered on /account/orders/[id] for the buyer
 *
 * Either side can be cleared by passing an empty string. Both fields are
 * independently optional; passing `undefined` leaves the existing value alone.
 */
const notesSchema = z.object({
  orderId: z.string().min(1),
  internalNotes: z.string().max(2_000).optional(),
  customerNotes: z.string().max(2_000).optional(),
});

export type UpdateOrderNotesInput = z.infer<typeof notesSchema>;

export async function updateOrderNotesAction(
  input: UpdateOrderNotesInput,
): Promise<ActionResult<{ orderId: string }>> {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  const before = await prisma.order.findUnique({
    where: { id: parsed.data.orderId },
    select: {
      id: true,
      internalNotes: true,
      customerNotes: true,
    },
  });
  if (!before) return { ok: false, errorKey: 'order.not_found' };

  const data: Prisma.OrderUpdateInput = {};
  if (parsed.data.internalNotes !== undefined) {
    data.internalNotes = parsed.data.internalNotes.trim() || null;
  }
  if (parsed.data.customerNotes !== undefined) {
    data.customerNotes = parsed.data.customerNotes.trim() || null;
  }
  if (Object.keys(data).length === 0) {
    return { ok: true, data: { orderId: before.id } };
  }

  const after = await prisma.order.update({
    where: { id: before.id },
    data,
    select: {
      id: true,
      internalNotes: true,
      customerNotes: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'order.notes_update',
      entityType: 'Order',
      entityId: before.id,
      before: before as never,
      after: after as never,
    },
  });

  revalidatePath(`/admin/orders/${before.id}`, 'page');
  // Customer page too — customerNotes change should be visible on refresh.
  revalidatePath('/account/orders/[id]', 'page');

  return { ok: true, data: { orderId: before.id } };
}

/**
 * Bulk "Mark as Handed to Courier" — up to 50 orders per submit, one courier
 * + one waybill + one ETA shared across all. Each order goes through the same
 * validation + side-effects as the single-order path (re-uses
 * `updateOrderStatusAction`), and per-order outcomes are accumulated so the
 * admin UI can surface partial success.
 *
 * Any order not in a state that permits → HANDED_TO_COURIER (i.e. not CONFIRMED
 * or DELAYED_OR_ISSUE) gets a skip row in the result rather than aborting the
 * whole batch.
 */
const bulkHandoffSchema = z.object({
  orderIds: z.array(z.string().min(1)).min(1).max(50),
  courierHandoff: courierHandoffSchema,
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => (v ? v : undefined)),
});

/** Pre-transform input shape for the bulk-handoff submit. */
export type BulkHandoffInput = z.input<typeof bulkHandoffSchema>;

export async function bulkHandOverToCourierAction(
  input: BulkHandoffInput,
): Promise<
  ActionResult<{
    succeeded: string[];
    failed: Array<{ orderId: string; errorKey: string }>;
  }>
> {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const parsed = bulkHandoffSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  const { orderIds, courierHandoff, note } = parsed.data;
  const handoffIso = courierHandoff.expectedDeliveryDate
    ? courierHandoff.expectedDeliveryDate.toISOString()
    : undefined;

  // Single audit entry at the bulk-action level — per-order audits are still
  // emitted by each inner updateOrderStatusAction call. The bulk row lets
  // incident review answer "who triggered this batch?" in one query.
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'order.bulk_handoff',
      entityType: 'Order',
      entityId: orderIds[0] ?? 'bulk',
      before: null as never,
      after: {
        orderIds,
        courierId: courierHandoff.courierId,
        batchSize: orderIds.length,
      } as never,
    },
  });

  const succeeded: string[] = [];
  const failed: Array<{ orderId: string; errorKey: string }> = [];

  // Sequential is fine at 50-order cap; each internal transaction is fast.
  // Serial also gives us a stable audit-log ordering.
  for (const orderId of orderIds) {
    const res = await updateOrderStatusAction({
      orderId,
      newStatus: 'HANDED_TO_COURIER',
      note,
      courierHandoff: {
        courierId: courierHandoff.courierId,
        courierPhone: courierHandoff.courierPhone,
        waybill: courierHandoff.waybill,
        expectedDeliveryDate: handoffIso,
      },
    });
    if (res.ok) succeeded.push(orderId);
    else failed.push({ orderId, errorKey: res.errorKey });
  }

  return { ok: true, data: { succeeded, failed } };
}
