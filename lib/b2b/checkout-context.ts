/**
 * B2B checkout-context resolver (Sprint 8 S8-D1-T2 / S8-D3-T1).
 *
 * Loads the caller's Company + tier + checkoutPolicy so the checkout page
 * and the createOrder / submitForReviewOrder server actions agree on
 * which buttons to render and which path to take.
 *
 * Null = caller is guest / B2C / B2B applicant (no ACTIVE Company yet).
 * In that case the storefront falls back to the standard B2C checkout
 * flow — matches PRD Feature 2 "browse as B2C while pending."
 */
import type { B2BCheckoutPolicy } from '@prisma/client';
import { prisma } from '@/lib/db';
import { getOptionalUser } from '@/lib/auth';

export type B2BCheckoutContext = {
  userId: string;
  companyId: string;
  companyNameAr: string;
  companyNameEn: string | null;
  checkoutPolicy: B2BCheckoutPolicy;
  tierCode: 'A' | 'B' | 'C';
  allowPayNow: boolean;
  allowSubmitForReview: boolean;
};

export async function getB2BCheckoutContext(): Promise<B2BCheckoutContext | null> {
  const user = await getOptionalUser();
  if (!user || user.type !== 'B2B') return null;

  const company = await prisma.company.findUnique({
    where: { primaryUserId: user.id },
    select: {
      id: true,
      nameAr: true,
      nameEn: true,
      status: true,
      checkoutPolicy: true,
      pricingTier: { select: { code: true } },
    },
  });
  if (!company || company.status !== 'ACTIVE') return null;

  const policy = company.checkoutPolicy;
  return {
    userId: user.id,
    companyId: company.id,
    companyNameAr: company.nameAr,
    companyNameEn: company.nameEn,
    checkoutPolicy: policy,
    tierCode: company.pricingTier.code,
    allowPayNow: policy === 'BOTH' || policy === 'PAY_NOW_ONLY',
    allowSubmitForReview:
      policy === 'BOTH' || policy === 'SUBMIT_FOR_REVIEW_ONLY',
  };
}
