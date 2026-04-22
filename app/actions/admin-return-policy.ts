'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { getReturnPolicy, saveReturnPolicy } from '@/lib/returns/policy';
import type { AdminRole } from '@prisma/client';

type ActionResult<T> = { ok: true; data: T } | { ok: false; errorKey: string };

const VALID_ROLES: readonly AdminRole[] = ['OWNER', 'OPS', 'SALES_REP'];

const policySchema = z.object({
  enabled: z.coerce.boolean(),
  windowDays: z.coerce.number().int().min(1).max(365),
  minOrderEgp: z
    .union([z.coerce.number().nonnegative(), z.literal('')])
    .transform((v) => (v === '' ? null : v)),
  overrideRoles: z
    .array(z.enum(['OWNER', 'OPS', 'SALES_REP']))
    .min(1, 'At least one role must be allowed to override'),
});

export async function updateReturnPolicyAction(
  input: z.input<typeof policySchema>,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER']);
  const parsed = policySchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };

  const previous = await getReturnPolicy();
  await saveReturnPolicy(
    {
      enabled: parsed.data.enabled,
      windowDays: parsed.data.windowDays,
      minOrderEgp:
        parsed.data.minOrderEgp === null
          ? null
          : Number(parsed.data.minOrderEgp),
      overrideRoles: parsed.data.overrideRoles,
    },
    actor.id,
  );
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      action: 'settings.returns.update',
      entityType: 'Setting',
      entityId: 'returns.policy',
      before: previous as never,
      after: parsed.data as never,
    },
  });

  revalidatePath('/admin/settings/returns', 'page');
  return { ok: true, data: null };
}

export async function setProductReturnableAction(input: {
  productId: string;
  returnable: boolean;
}): Promise<ActionResult<null>> {
  const actor = await requireAdmin(['OWNER', 'OPS']);
  const { productId, returnable } = input;
  if (!productId || typeof returnable !== 'boolean') {
    return { ok: false, errorKey: 'validation.invalid' };
  }
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, returnable: true },
  });
  if (!product) return { ok: false, errorKey: 'product.not_found' };
  if (product.returnable === returnable) return { ok: true, data: null };

  await prisma.$transaction([
    prisma.product.update({
      where: { id: productId },
      data: { returnable },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'product.returnable_update',
        entityType: 'Product',
        entityId: productId,
        before: { returnable: product.returnable } as never,
        after: { returnable } as never,
      },
    }),
  ]);
  revalidatePath(`/admin/products/${productId}`, 'page');
  revalidatePath('/admin/settings/returns', 'page');
  return { ok: true, data: null };
}

// keep VALID_ROLES referenced in case this module is imported for validation
// fallback; not otherwise used outside the schema above.
export const RETURN_POLICY_ROLES = VALID_ROLES;
