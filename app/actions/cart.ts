'use server';

/**
 * Cart Server Actions — add / update-qty / remove / clear. All mutations
 * maintain a matching `InventoryReservation` row (type=CART) with a 15-min
 * TTL so other buyers see the held qty as unavailable.
 *
 * Stock rule: we never let requested qty exceed available-excluding-own-hold.
 * When a user bumps qty from 2→3, we check `(currentQty − other reservations)
 * ≥ 3` before updating both the CartItem and the InventoryReservation.
 */
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { getOrCreateCart } from '@/lib/cart/cart';
import {
  CART_RESERVATION_TTL_MINUTES,
  getAvailableQty,
} from '@/lib/cart/stock';
import { getOptionalUser } from '@/lib/auth';
import { getPricingContextForUser } from '@/lib/pricing/context';
import { resolvePrice } from '@/lib/pricing/resolve';

type ActionOk<T> = { ok: true; data: T };
type ActionErr = { ok: false; errorKey: string };
type ActionResult<T> = ActionOk<T> | ActionErr;

const addSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive().max(99).default(1),
});

const updateSchema = z.object({
  cartItemId: z.string().min(1),
  qty: z.number().int().nonnegative().max(99),
});

function reservationExpiresAt(): Date {
  return new Date(Date.now() + CART_RESERVATION_TTL_MINUTES * 60 * 1000);
}

export async function addToCartAction(
  input: z.infer<typeof addSchema>,
): Promise<ActionResult<{ cartItemId: string; qty: number }>> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };

  const product = await prisma.product.findFirst({
    where: { id: parsed.data.productId, status: 'ACTIVE' },
  });
  if (!product) return { ok: false, errorKey: 'catalog.product.not_found' };

  const cart = await getOrCreateCart();
  const existing = await prisma.cartItem.findUnique({
    where: {
      cartId_productId: { cartId: cart.id, productId: product.id },
    },
  });
  const nextQty = (existing?.qty ?? 0) + parsed.data.qty;

  const available = await getAvailableQty(product.id, existing?.id ?? null);
  if (available < nextQty) {
    return { ok: false, errorKey: 'cart.insufficient_stock' };
  }

  // Resolve the price for the current user (base for guests/B2C, tier- or
  // override-adjusted for approved B2B). Snapshotting this value means the
  // OrderItem eventually sees the price the customer saw at cart-add time.
  const user = await getOptionalUser();
  const ctx = await getPricingContextForUser(user);
  const resolved = resolvePrice(product, ctx);

  const result = await prisma.$transaction(async (tx) => {
    const item = existing
      ? await tx.cartItem.update({
          where: { id: existing.id },
          data: { qty: nextQty },
        })
      : await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: product.id,
            qty: parsed.data.qty,
            unitPriceEgpSnapshot: resolved.finalPriceEgp,
          },
        });

    // Upsert the matching reservation keyed on refId=cartItem.id.
    const existingRes = await tx.inventoryReservation.findFirst({
      where: { refId: item.id, type: 'CART' },
    });
    if (existingRes) {
      await tx.inventoryReservation.update({
        where: { id: existingRes.id },
        data: { qty: item.qty, expiresAt: reservationExpiresAt() },
      });
    } else {
      await tx.inventoryReservation.create({
        data: {
          type: 'CART',
          productId: product.id,
          refId: item.id,
          qty: item.qty,
          expiresAt: reservationExpiresAt(),
        },
      });
    }
    return item;
  });

  revalidatePath('/', 'layout');
  return { ok: true, data: { cartItemId: result.id, qty: result.qty } };
}

export async function updateCartItemAction(
  input: z.infer<typeof updateSchema>,
): Promise<ActionResult<{ qty: number }>> {
  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, errorKey: 'validation.invalid' };

  const cart = await getOrCreateCart();
  const item = await prisma.cartItem.findFirst({
    where: { id: parsed.data.cartItemId, cartId: cart.id },
  });
  if (!item) return { ok: false, errorKey: 'cart.item_not_found' };

  if (parsed.data.qty === 0) {
    await prisma.$transaction([
      prisma.inventoryReservation.deleteMany({
        where: { refId: item.id, type: 'CART' },
      }),
      prisma.cartItem.delete({ where: { id: item.id } }),
    ]);
    revalidatePath('/', 'layout');
    return { ok: true, data: { qty: 0 } };
  }

  const available = await getAvailableQty(item.productId, item.id);
  if (available < parsed.data.qty) {
    return { ok: false, errorKey: 'cart.insufficient_stock' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.cartItem.update({
      where: { id: item.id },
      data: { qty: parsed.data.qty },
    });
    const existingRes = await tx.inventoryReservation.findFirst({
      where: { refId: item.id, type: 'CART' },
    });
    if (existingRes) {
      await tx.inventoryReservation.update({
        where: { id: existingRes.id },
        data: {
          qty: parsed.data.qty,
          expiresAt: reservationExpiresAt(),
        },
      });
    } else {
      await tx.inventoryReservation.create({
        data: {
          type: 'CART',
          productId: item.productId,
          refId: item.id,
          qty: parsed.data.qty,
          expiresAt: reservationExpiresAt(),
        },
      });
    }
  });

  revalidatePath('/', 'layout');
  return { ok: true, data: { qty: parsed.data.qty } };
}

export async function removeCartItemAction(
  cartItemId: string,
): Promise<ActionResult<null>> {
  const cart = await getOrCreateCart();
  const item = await prisma.cartItem.findFirst({
    where: { id: cartItemId, cartId: cart.id },
  });
  if (!item) return { ok: false, errorKey: 'cart.item_not_found' };

  await prisma.$transaction([
    prisma.inventoryReservation.deleteMany({
      where: { refId: item.id, type: 'CART' },
    }),
    prisma.cartItem.delete({ where: { id: item.id } }),
  ]);

  revalidatePath('/', 'layout');
  return { ok: true, data: null };
}

export async function clearCartAction(): Promise<ActionResult<null>> {
  const cart = await getOrCreateCart();
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    select: { id: true },
  });
  if (items.length === 0) return { ok: true, data: null };

  const ids = items.map((i) => i.id);
  await prisma.$transaction([
    prisma.inventoryReservation.deleteMany({
      where: { refId: { in: ids }, type: 'CART' },
    }),
    prisma.cartItem.deleteMany({ where: { cartId: cart.id } }),
  ]);

  revalidatePath('/', 'layout');
  return { ok: true, data: null };
}
