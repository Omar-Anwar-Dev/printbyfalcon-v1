/**
 * Request-scoped pricing-context loader. Given a user, returns the
 * PricingContext used by `resolvePrice` / `resolvePrices` so catalog pages
 * render negotiated prices without an N+1 blast.
 *
 * Wrapped in `React.cache` so multiple components on the same render pass
 * (product card list + price badge in header + etc.) only hit the DB once.
 */
import { cache } from 'react';
import { prisma } from '@/lib/db';
import type { PricingContext } from './resolve';
import type { User } from '@prisma/client';

export const getPricingContextForUser = cache(
  async (user: User | null | undefined): Promise<PricingContext> => {
    if (!user || user.type !== 'B2B') {
      return { tier: null, overrides: new Map() };
    }

    const company = await prisma.company.findUnique({
      where: { primaryUserId: user.id },
      select: {
        id: true,
        status: true,
        pricingTier: {
          select: { code: true, defaultDiscountPercent: true },
        },
        priceOverrides: {
          select: { productId: true, customPriceEgp: true },
        },
      },
    });

    // SUSPENDED / missing company → treat as no discount, no overrides. The user
    // can still browse the catalog at retail prices; they can't place B2B orders
    // because checkout will guard separately.
    if (!company || company.status !== 'ACTIVE') {
      return { tier: null, overrides: new Map() };
    }

    const overrides = new Map<string, string>();
    for (const o of company.priceOverrides) {
      overrides.set(o.productId, o.customPriceEgp.toString());
    }

    return {
      tier: {
        code: company.pricingTier.code,
        defaultDiscountPercent:
          company.pricingTier.defaultDiscountPercent == null
            ? null
            : company.pricingTier.defaultDiscountPercent.toString(),
      },
      overrides,
    };
  },
);
