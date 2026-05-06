'use server';

/**
 * Sprint 11.5 — Whats360 transport-mode switch + Test Connection action.
 *
 * Mode flips are gated by admin password (same pattern as Paymob mode
 * switches). Test Connection is read-only and doesn't require password.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  AdminPasswordVerifyError,
  verifyAdminPasswordOrThrow,
} from '@/lib/auth/verify-admin-password';
import { setWhatsappMode, type WhatsappMode } from '@/lib/settings/whatsapp';
import { getDeviceStatus, sendWhatsApp } from '@/lib/whatsapp';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = {
  ok: false;
  errorKey: string;
  retryAfterSeconds?: number;
  remainingAttempts?: number;
  detail?: string;
};
type ActionResult<T> = ActionOk<T> | ActionErr;

const modeSchema = z.object({
  mode: z.enum(['LIVE', 'DEV', 'SANDBOX']),
  password: z.string().min(1).max(200),
});

export async function setWhatsappModeAction(
  input: z.infer<typeof modeSchema>,
): Promise<ActionResult<{ mode: WhatsappMode }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = modeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  try {
    await verifyAdminPasswordOrThrow(actor, parsed.data.password);
  } catch (err) {
    if (err instanceof AdminPasswordVerifyError) {
      return {
        ok: false,
        errorKey: `admin_password.${err.kind}`,
        retryAfterSeconds: err.retryAfterSeconds,
        remainingAttempts: err.remainingAttempts,
      };
    }
    throw err;
  }

  try {
    await setWhatsappMode(parsed.data.mode, actor.id);
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'settings.whatsapp.mode',
        entityType: 'Setting',
        entityId: 'whatsapp.transport',
        after: { mode: parsed.data.mode } as never,
      },
    });
    revalidatePath('/admin/settings/whatsapp');
    return { ok: true, data: { mode: parsed.data.mode } };
  } catch (err) {
    logger.error(
      { err: (err as Error).message },
      'settings.whatsapp.mode_failed',
    );
    return { ok: false, errorKey: 'settings.update_failed' };
  }
}

/**
 * Read-only health probe — calls Whats360 `/api/v1/instances/status` and
 * returns the connectivity result. No password needed since no state
 * mutates and no message is sent.
 */
export async function checkWhatsappStatusAction(): Promise<
  ActionResult<{ connected: boolean; raw: unknown }>
> {
  await requireAdmin(['OWNER']);
  const status = await getDeviceStatus();
  return {
    ok: true,
    data: { connected: status.connected, raw: status.raw ?? status.error },
  };
}

const testSendSchema = z.object({
  phone: z.string().min(6).max(20),
});

export async function sendWhatsappTestMessageAction(
  input: z.infer<typeof testSendSchema>,
): Promise<ActionResult<{ ok: true; externalMessageId?: string }>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = testSendSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.failed' };

  // Composes a one-line test message; respects the current mode (DEV/SANDBOX
  // means it doesn't actually deliver — useful for verifying the admin UI
  // wiring without spamming the owner's phone).
  const result = await sendWhatsApp({
    phone: parsed.data.phone,
    body: `Print By Falcon — رسالة اختبار من لوحة التحكم. Test message from admin panel. ${new Date().toLocaleString()}`,
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'settings.whatsapp.test_send',
      entityType: 'Setting',
      entityId: 'whatsapp.transport',
      after: {
        phone: parsed.data.phone,
        ok: result.ok,
        externalMessageId: result.externalMessageId ?? null,
        error: result.error ?? null,
      } as never,
    },
  });

  if (!result.ok) {
    return {
      ok: false,
      errorKey: 'whatsapp.send_failed',
      detail: result.error,
    };
  }
  return {
    ok: true,
    data: { ok: true, externalMessageId: result.externalMessageId },
  };
}
