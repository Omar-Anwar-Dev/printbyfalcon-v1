'use server';

/**
 * Sprint 12 — closed-beta feedback channel (S12-D2-T3).
 *
 * Anonymous-safe: signed-in users get their userId + userType captured for
 * triage, guests submit without auth. Rate-limited to 5/IP/hour so a
 * frustrated tester can still file two bugs back-to-back, but a bot can't
 * flood the queue.
 *
 * Admin review surface lives at /admin/feedback (OWNER + OPS).
 */
import { z } from 'zod';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { FeedbackCategory, FeedbackStatus, Locale } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getOptionalUser, requireAdmin } from '@/lib/auth';
import { canAct } from '@/lib/admin/role-matrix';
import { checkAndIncrement, RATE_LIMIT_RULES } from '@/lib/rate-limit';
import { getClientIp } from '@/lib/request-ip';
import { logger } from '@/lib/logger';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const submitSchema = z.object({
  category: z.nativeEnum(FeedbackCategory),
  message: z.string().trim().min(10).max(2000),
  contactName: z.string().trim().max(80).optional().or(z.literal('')),
  contactValue: z.string().trim().max(120).optional().or(z.literal('')),
  pathname: z.string().trim().max(500).optional().or(z.literal('')),
  locale: z.enum(['ar', 'en']),
});

export type FeedbackInput = z.infer<typeof submitSchema>;

function nullable(v: string | undefined): string | null {
  return v && v.trim().length > 0 ? v.trim() : null;
}

export async function submitFeedbackAction(
  input: FeedbackInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errorKey: 'feedback.validation_invalid' };
  }

  const headerBag = await headers();
  const ip = getClientIp(headerBag) ?? 'unknown';
  const userAgent = headerBag.get('user-agent')?.slice(0, 500) ?? null;

  const limit = await checkAndIncrement(RATE_LIMIT_RULES.feedback, `ip:${ip}`);
  if (!limit.allowed) {
    return { ok: false, errorKey: 'feedback.rate_limited' };
  }

  const user = await getOptionalUser();

  const created = await prisma.feedback.create({
    data: {
      userId: user?.id ?? null,
      userType: user?.type ?? null,
      locale: parsed.data.locale === 'ar' ? Locale.AR : Locale.EN,
      category: parsed.data.category,
      message: parsed.data.message.trim(),
      contactName: nullable(parsed.data.contactName),
      contactValue: nullable(parsed.data.contactValue),
      pathname: nullable(parsed.data.pathname),
      userAgent,
    },
    select: { id: true },
  });

  logger.info(
    {
      feedbackId: created.id,
      category: parsed.data.category,
      signedIn: !!user,
    },
    'feedback.submitted',
  );

  // Bust the admin /admin/feedback list cache so a tester reporting at the
  // same time as the owner triaging sees their report appear immediately.
  revalidatePath('/admin/feedback');

  return { ok: true, data: { id: created.id } };
}

const adminUpdateSchema = z.object({
  feedbackId: z.string().min(1),
  status: z.nativeEnum(FeedbackStatus),
  adminNote: z.string().trim().max(2000).optional().or(z.literal('')),
});

export async function updateFeedbackStatusAction(
  input: z.infer<typeof adminUpdateSchema>,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireAdmin();
  if (!canAct(user.adminRole ?? null, 'FEEDBACK')) {
    return { ok: false, errorKey: 'forbidden' };
  }
  const parsed = adminUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errorKey: 'feedback.validation_invalid' };
  }
  const updated = await prisma.feedback.update({
    where: { id: parsed.data.feedbackId },
    data: {
      status: parsed.data.status,
      adminNote: nullable(parsed.data.adminNote),
      reviewedAt: new Date(),
      reviewedById: user.id,
    },
    select: { id: true },
  });
  revalidatePath('/admin/feedback');
  revalidatePath(`/admin/feedback/${updated.id}`);
  return { ok: true, data: { id: updated.id } };
}
