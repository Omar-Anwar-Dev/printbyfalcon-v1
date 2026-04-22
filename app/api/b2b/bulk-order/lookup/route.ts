/**
 * Sprint 8 S8-D4 — per-row B2B bulk-order lookup.
 *
 * Given a product id, returns the B2B-resolved price + reservation-aware
 * availability so the bulk-order table can render the correct unit price and
 * stock warning for the caller's tier.
 *
 * Gated on the caller being the primary user of an ACTIVE Company.
 */
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';
import { getB2BCheckoutContext } from '@/lib/b2b/checkout-context';
import { getPricingContextForUser } from '@/lib/pricing/context';
import { resolvePrice } from '@/lib/pricing/resolve';
import { getAvailableQty } from '@/lib/cart/stock';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
  const b2b = await getB2BCheckoutContext();
  if (!b2b) {
    return NextResponse.json({ error: 'b2b_required' }, { status: 403 });
  }
  const user = await getOptionalUser();

  const url = new URL(request.url);
  const productId = url.searchParams.get('productId');
  const sku = url.searchParams.get('sku');
  if (!productId && !sku) {
    return NextResponse.json(
      { error: 'productId_or_sku_required' },
      {
        status: 400,
      },
    );
  }

  const product = productId
    ? await prisma.product.findFirst({
        where: { id: productId, status: 'ACTIVE' },
      })
    : await prisma.product.findFirst({
        where: { sku: sku!.trim(), status: 'ACTIVE' },
      });
  if (!product) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const ctx = await getPricingContextForUser(user);
  const resolved = resolvePrice(product, ctx);
  const availableQty = await getAvailableQty(product.id, null);

  return NextResponse.json(
    {
      productId: product.id,
      sku: product.sku,
      nameAr: product.nameAr,
      nameEn: product.nameEn,
      basePriceEgp: product.basePriceEgp.toString(),
      finalPriceEgp: resolved.finalPriceEgp.toFixed(2),
      appliedDiscount: resolved.source,
      availableQty,
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
