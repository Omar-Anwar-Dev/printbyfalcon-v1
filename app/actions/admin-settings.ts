'use server';

/**
 * Admin settings Server Actions (Sprint 5+). Gated on OWNER only — Ops + Sales
 * Rep never touch global toggles per ADR-016.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import type { OrderStatus } from '@prisma/client';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { setNotificationOptOut } from '@/lib/settings/notifications';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const orderStatusSchema: z.ZodType<OrderStatus> = z.enum([
  'PENDING_CONFIRMATION',
  'CONFIRMED',
  'HANDED_TO_COURIER',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
  'RETURNED',
  'DELAYED_OR_ISSUE',
]);

const notificationOptOutSchema = z.object({
  WHATSAPP: z.array(orderStatusSchema),
  EMAIL: z.array(orderStatusSchema),
});

export type NotificationOptOutInput = z.infer<typeof notificationOptOutSchema>;

export async function updateNotificationOptOutAction(
  input: NotificationOptOutInput,
): Promise<ActionResult<{ saved: true }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = notificationOptOutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  await setNotificationOptOut(parsed.data, actor.id);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'settings.notifications.optout_update',
      entityType: 'Setting',
      entityId: 'notifications.optout',
      before: null as never,
      after: parsed.data as never,
    },
  });

  revalidatePath('/admin/settings/notifications', 'page');
  return { ok: true, data: { saved: true } };
}
