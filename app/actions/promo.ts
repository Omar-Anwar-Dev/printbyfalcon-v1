'use server';

/**
 * Promo-code preview action (Sprint 9 S9-D5-T2).
 *
 * Client form calls this when the user clicks "Apply". It's a read-only
 * check — the code isn't consumed here. Actual consume happens atomically
 * inside createOrderAction / submitForReviewOrderAction on final submit.
 * If the preview succeeds but the code is exhausted by the time the order
 * hits the DB, the transaction rolls back with `promo.usage_limit_reached`.
 */
import { validatePromoCode } from '@/lib/promo/validate';
import { getOrCreateCart } from '@/lib/cart/cart';
import { prisma } from '@/lib/db';

type Ok = {
  ok: true;
  data: {
    code: string;
    discountEgp: number;
    type: 'PERCENT' | 'FIXED';
  };
};
type Err = { ok: false; errorKey: string };

export async function applyPromoCodeAction(input: {
  code: string;
}): Promise<Ok | Err> {
  const cart = await getOrCreateCart();
  const items = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    select: { qty: true, unitPriceEgpSnapshot: true },
  });
  if (items.length === 0) return { ok: false, errorKey: 'cart.empty' };
  const subtotal = items.reduce(
    (acc, i) => acc + Number(i.unitPriceEgpSnapshot) * i.qty,
    0,
  );
  const r = await validatePromoCode(input.code, subtotal);
  if (!r.ok) return { ok: false, errorKey: `promo.${r.error}` };
  return {
    ok: true,
    data: {
      code: r.promoCode.code,
      discountEgp: r.discountEgp,
      type: r.promoCode.type,
    },
  };
}
