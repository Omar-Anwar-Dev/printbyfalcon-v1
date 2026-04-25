'use server';

/**
 * Self-service B2C profile actions — the customer editing their own name and
 * (optional) email on `/account`. Phone is the auth identity (set by OTP) and
 * cannot be changed here; it would require re-OTP-verifying the new number.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { nameSchema } from '@/lib/validation/common';
import { toLocalizedIssues } from '@/lib/validation/error-map';

type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: string;
      fieldErrors?: { path: (string | number)[]; key: string }[];
    };

const profileSchema = z.object({
  name: nameSchema,
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: 'email.invalid' })
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
});

export async function updateB2CProfileAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const user = await getOptionalUser();
  if (!user || user.type !== 'B2C') {
    return { ok: false, errorKey: 'auth.not_signed_in' };
  }

  const rawEmail = formData.get('email');
  const parsed = profileSchema.safeParse({
    name: formData.get('name'),
    email:
      typeof rawEmail === 'string' && rawEmail.trim().length > 0
        ? rawEmail
        : undefined,
  });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  // Email uniqueness — only check when the value is actually changing.
  if (parsed.data.email && parsed.data.email !== user.email) {
    const collision = await prisma.user.findUnique({
      where: { email: parsed.data.email },
      select: { id: true },
    });
    if (collision && collision.id !== user.id) {
      return { ok: false, errorKey: 'profile.email_in_use' };
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: parsed.data.name,
        email: parsed.data.email ?? null,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: user.id,
        action: 'b2c.profile.update',
        entityType: 'User',
        entityId: user.id,
        before: { name: user.name, email: user.email },
        after: { name: parsed.data.name, email: parsed.data.email ?? null },
      },
    });
  });

  revalidatePath('/account', 'layout');
  return { ok: true, data: null };
}
