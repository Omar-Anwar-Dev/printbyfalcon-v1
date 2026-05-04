'use server';

/**
 * Sprint 15 — admin actions for WhatsApp template management.
 *
 * Edit / activate-deactivate / reset-to-default. OWNER-only per ADR-067 — the
 * blast radius of a misedit (every customer notification garbled) is high
 * enough that we don't grant OPS the edit role.
 *
 * Audit: every edit logs the before/after to AuditLog (existing helper).
 * Reset is logged as `whatsapp.template.reset` with the default body
 * recorded as the "after" so an audit query can reproduce the change.
 */
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { DEFAULT_WHATSAPP_TEMPLATES } from '@/lib/whatsapp/templates-seed';

// Local audit helper — same shape as the one in admin-catalog.ts. Pulling
// audit out into a shared lib is a separate refactor.
async function audit(
  actorId: string,
  action: string,
  entityType: string,
  entityId: string,
  before: unknown,
  after: unknown,
): Promise<void> {
  await prisma.auditLog.create({
    data: {
      actorId,
      action,
      entityType,
      entityId,
      before: before as never,
      after: after as never,
    },
  });
}

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const updateSchema = z.object({
  id: z.string().min(1),
  bodyAr: z.string().trim().min(1).max(2000),
  bodyEn: z.string().trim().min(1).max(2000),
  isActive: z.boolean(),
});

export async function updateWhatsappTemplateAction(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin(['OWNER']);
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errorKey: 'validation.invalid' };
  }
  const before = await prisma.whatsappTemplate.findUnique({
    where: { id: parsed.data.id },
  });
  if (!before) {
    return { ok: false, errorKey: 'whatsapp_template.not_found' };
  }

  const after = await prisma.whatsappTemplate.update({
    where: { id: parsed.data.id },
    data: {
      bodyAr: parsed.data.bodyAr,
      bodyEn: parsed.data.bodyEn,
      isActive: parsed.data.isActive,
      updatedBy: admin.id,
    },
  });

  await audit(
    admin.id,
    'whatsapp.template.update',
    'WhatsappTemplate',
    after.id,
    {
      bodyAr: before.bodyAr,
      bodyEn: before.bodyEn,
      isActive: before.isActive,
    },
    {
      bodyAr: after.bodyAr,
      bodyEn: after.bodyEn,
      isActive: after.isActive,
    },
  );

  revalidatePath('/admin/settings/whatsapp-templates');
  revalidatePath(`/admin/settings/whatsapp-templates/${after.id}`);

  return { ok: true, data: { id: after.id } };
}

const resetSchema = z.object({
  id: z.string().min(1),
});

export async function resetWhatsappTemplateAction(
  input: z.infer<typeof resetSchema>,
): Promise<ActionResult<{ id: string }>> {
  const admin = await requireAdmin(['OWNER']);
  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errorKey: 'validation.invalid' };
  }
  const before = await prisma.whatsappTemplate.findUnique({
    where: { id: parsed.data.id },
  });
  if (!before) {
    return { ok: false, errorKey: 'whatsapp_template.not_found' };
  }
  const seed = DEFAULT_WHATSAPP_TEMPLATES.find((t) => t.key === before.key);
  if (!seed) {
    // Template exists in DB but not in code — shouldn't happen unless owner
    // manually inserted a template. Refuse to reset what we can't reproduce.
    return { ok: false, errorKey: 'whatsapp_template.no_default' };
  }

  const after = await prisma.whatsappTemplate.update({
    where: { id: parsed.data.id },
    data: {
      nameAr: seed.nameAr,
      nameEn: seed.nameEn,
      descriptionAr: seed.descriptionAr,
      descriptionEn: seed.descriptionEn,
      bodyAr: seed.bodyAr,
      bodyEn: seed.bodyEn,
      variables: seed.variables as never,
      isActive: true,
      updatedBy: admin.id,
    },
  });

  await audit(
    admin.id,
    'whatsapp.template.reset',
    'WhatsappTemplate',
    after.id,
    { bodyAr: before.bodyAr, bodyEn: before.bodyEn, isActive: before.isActive },
    { bodyAr: after.bodyAr, bodyEn: after.bodyEn, isActive: after.isActive },
  );

  revalidatePath('/admin/settings/whatsapp-templates');
  revalidatePath(`/admin/settings/whatsapp-templates/${after.id}`);

  return { ok: true, data: { id: after.id } };
}
