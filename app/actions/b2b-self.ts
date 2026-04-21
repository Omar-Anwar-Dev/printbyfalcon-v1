'use server';

/**
 * Self-service B2B actions — the B2B user editing their own contact details
 * on `/b2b/profile`. Commercial-registry and tax-card edits stay admin-only
 * (PRD Feature 4 — read-only from the user side).
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireB2BUser } from '@/lib/auth';
import { egyptianPhoneSchema, nameSchema } from '@/lib/validation/common';
import { toLocalizedIssues } from '@/lib/validation/error-map';

type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: string;
      fieldErrors?: { path: (string | number)[]; key: string }[];
    };

const profileSchema = z.object({
  contactName: nameSchema,
  phone: egyptianPhoneSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'email.invalid' })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export async function updateB2BProfileContactAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const user = await requireB2BUser();

  const parsed = profileSchema.safeParse({
    contactName: formData.get('contactName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  // Email changes are sensitive — collide with existing users same way signup
  // does. If the email is unchanged we skip the check; otherwise verify no
  // other User owns it.
  if (parsed.data.email && parsed.data.email !== user.email) {
    const collision = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (collision && collision.id !== user.id) {
      return { ok: false, errorKey: 'b2b.profile.email_in_use' };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.contactName,
        phone: parsed.data.phone,
        email: parsed.data.email ?? user.email,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'b2b.profile.contact_update',
        entityType: 'User',
        entityId: user.id,
        before: { name: user.name, phone: user.phone, email: user.email },
        after: parsed.data,
      },
    });
  });

  revalidatePath('/b2b/profile');
  return { ok: true, data: null };
}
