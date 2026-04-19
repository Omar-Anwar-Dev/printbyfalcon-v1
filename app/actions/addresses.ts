'use server';

/**
 * Address Server Actions — per-user up to 5 addresses (PRD Feature 2).
 * Guest checkout uses inline address fields on the order instead of this.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Governorate } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const MAX_ADDRESSES_PER_USER = 5;

const addressSchema = z.object({
  recipientName: z.string().trim().min(2).max(80),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{9,15}$/, 'validation.phone.invalid_eg'),
  governorate: z.nativeEnum(Governorate),
  city: z.string().trim().min(1).max(80),
  area: z.string().trim().max(80).optional(),
  street: z.string().trim().min(1).max(160),
  building: z.string().trim().max(40).optional(),
  apartment: z.string().trim().max(40).optional(),
  notes: z.string().trim().max(280).optional(),
  isDefault: z.boolean().optional(),
});

export type AddressInput = z.infer<typeof addressSchema>;

async function requireB2C() {
  const user = await getOptionalUser();
  if (!user || user.type !== 'B2C') {
    return null;
  }
  return user;
}

export async function addAddressAction(
  input: AddressInput,
): Promise<ActionResult<{ id: string }>> {
  const user = await requireB2C();
  if (!user) return { ok: false, errorKey: 'auth.not_signed_in' };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };

  const count = await prisma.address.count({ where: { userId: user.id } });
  if (count >= MAX_ADDRESSES_PER_USER) {
    return { ok: false, errorKey: 'address.limit_reached' };
  }

  const shouldBeDefault = parsed.data.isDefault || count === 0;

  const address = await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) {
      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    return tx.address.create({
      data: {
        userId: user.id,
        recipientName: parsed.data.recipientName,
        phone: parsed.data.phone,
        governorate: parsed.data.governorate,
        city: parsed.data.city,
        area: parsed.data.area ?? null,
        street: parsed.data.street,
        building: parsed.data.building ?? null,
        apartment: parsed.data.apartment ?? null,
        notes: parsed.data.notes ?? null,
        isDefault: shouldBeDefault,
      },
    });
  });

  revalidatePath('/account/addresses', 'page');
  return { ok: true, data: { id: address.id } };
}

export async function updateAddressAction(
  id: string,
  input: AddressInput,
): Promise<ActionResult<null>> {
  const user = await requireB2C();
  if (!user) return { ok: false, errorKey: 'auth.not_signed_in' };

  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };

  const existing = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { ok: false, errorKey: 'address.not_found' };

  await prisma.$transaction(async (tx) => {
    if (parsed.data.isDefault && !existing.isDefault) {
      await tx.address.updateMany({
        where: { userId: user.id, isDefault: true },
        data: { isDefault: false },
      });
    }
    await tx.address.update({
      where: { id },
      data: {
        recipientName: parsed.data.recipientName,
        phone: parsed.data.phone,
        governorate: parsed.data.governorate,
        city: parsed.data.city,
        area: parsed.data.area ?? null,
        street: parsed.data.street,
        building: parsed.data.building ?? null,
        apartment: parsed.data.apartment ?? null,
        notes: parsed.data.notes ?? null,
        isDefault: parsed.data.isDefault ?? existing.isDefault,
      },
    });
  });

  revalidatePath('/account/addresses', 'page');
  return { ok: true, data: null };
}

export async function deleteAddressAction(
  id: string,
): Promise<ActionResult<null>> {
  const user = await requireB2C();
  if (!user) return { ok: false, errorKey: 'auth.not_signed_in' };

  const existing = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { ok: false, errorKey: 'address.not_found' };

  await prisma.address.delete({ where: { id } });

  // If we just deleted the default, promote the most recent remaining one.
  if (existing.isDefault) {
    const remaining = await prisma.address.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
    if (remaining) {
      await prisma.address.update({
        where: { id: remaining.id },
        data: { isDefault: true },
      });
    }
  }

  revalidatePath('/account/addresses', 'page');
  return { ok: true, data: null };
}

export async function setDefaultAddressAction(
  id: string,
): Promise<ActionResult<null>> {
  const user = await requireB2C();
  if (!user) return { ok: false, errorKey: 'auth.not_signed_in' };

  const existing = await prisma.address.findFirst({
    where: { id, userId: user.id },
  });
  if (!existing) return { ok: false, errorKey: 'address.not_found' };

  await prisma.$transaction([
    prisma.address.updateMany({
      where: { userId: user.id, isDefault: true },
      data: { isDefault: false },
    }),
    prisma.address.update({
      where: { id },
      data: { isDefault: true },
    }),
  ]);

  revalidatePath('/account/addresses', 'page');
  return { ok: true, data: null };
}
