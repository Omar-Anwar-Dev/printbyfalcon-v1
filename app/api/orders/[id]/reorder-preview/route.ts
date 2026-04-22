/**
 * Sprint 8 S8-D5-T2 — reorder pre-confirmation data.
 *
 * Given an order the caller owns, returns the current status of each line:
 * available / out-of-stock / archived-or-deleted. Caller uses this to show
 * the reorder modal + confirm "Add available to cart."
 *
 * Prices are re-resolved at the caller's current tier — PRD Feature 4 says
 * "current prices", not the historical snapshot.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { userCanAccessOrder } from '@/lib/orders/ownership';
import { getPricingContextForUser } from '@/lib/pricing/context';
import { resolvePrice } from '@/lib/pricing/resolve';
import { getAvailableQtyMap } from '@/lib/cart/stock';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getOptionalUser();
  const { canAccess } = await userCanAccessOrder(user, id);
  if (!canAccess) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        orderBy: { createdAt: 'asc' },
        include: {
          product: {
            select: {
              id: true,
              sku: true,
              slug: true,
              nameAr: true,
              nameEn: true,
              basePriceEgp: true,
              status: true,
              vatExempt: true,
            },
          },
        },
      },
    },
  });
  if (!order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const ctx = await getPricingContextForUser(user);
  const activeProductIds = order.items
    .filter((it) => it.product && it.product.status === 'ACTIVE')
    .map((it) => it.product!.id);
  const availability = await getAvailableQtyMap(activeProductIds, []);

  const lines = order.items.map((it) => {
    const product = it.product;
    if (!product) {
      return {
        orderItemId: it.id,
        status: 'archived' as const,
        sku: it.skuSnapshot,
        nameAr: it.nameArSnapshot,
        nameEn: it.nameEnSnapshot,
        originalQty: it.qty,
        productId: null,
        finalPriceEgp: null,
        availableQty: 0,
      };
    }
    if (product.status !== 'ACTIVE') {
      return {
        orderItemId: it.id,
        status: 'archived' as const,
        sku: product.sku,
        nameAr: product.nameAr,
        nameEn: product.nameEn,
        originalQty: it.qty,
        productId: product.id,
        finalPriceEgp: null,
        availableQty: 0,
      };
    }
    const available = availability.get(product.id) ?? 0;
    const resolved = resolvePrice(product, ctx);
    const status =
      available <= 0
        ? ('out_of_stock' as const)
        : available < it.qty
          ? ('partial' as const)
          : ('available' as const);
    return {
      orderItemId: it.id,
      status,
      sku: product.sku,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      originalQty: it.qty,
      productId: product.id,
      finalPriceEgp: resolved.finalPriceEgp.toFixed(2),
      availableQty: available,
    };
  });

  return NextResponse.json(
    { orderId: order.id, orderNumber: order.orderNumber, lines },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
