'use server';

/**
 * Admin B2B actions (Sprint 7). Owner + Sales Rep may approve/reject
 * applications; Ops cannot (pricing + credit decisions are sales territory
 * per ADR-016). Welcome / rejection emails enqueue onto pg-boss so SMTP
 * failures don't block the admin dialog.
 */
import bcrypt from 'bcryptjs';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireAdmin } from '@/lib/auth';
import { enqueueJob } from '@/lib/queue';
import { generateTempPassword } from '@/lib/b2b/temp-password';
import { renderB2BWelcomeEmail } from '@/lib/email/b2b-welcome';
import { renderB2BRejectionEmail } from '@/lib/email/b2b-rejection';
import {
  b2bApplicationApproveSchema,
  b2bApplicationRejectSchema,
  companyPriceOverrideSchema,
  companyUpdateSchema,
} from '@/lib/validation/b2b';
import { toLocalizedIssues } from '@/lib/validation/error-map';

type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: string;
      fieldErrors?: { path: (string | number)[]; key: string }[];
    };

/** Sprint 7 delegates B2B approval + rejection to Owner + Sales Rep. Ops
 * doesn't touch tier / credit decisions (ADR-016). */
const B2B_REVIEW_ROLES = ['OWNER', 'SALES_REP'] as const;

function tierLabel(code: 'A' | 'B' | 'C', locale: 'ar' | 'en'): string {
  if (locale === 'ar') {
    return code === 'A'
      ? 'المستوى أ — خصم 10٪'
      : code === 'B'
        ? 'المستوى ب — خصم 15٪'
        : 'المستوى ج — أسعار مخصّصة لكل منتج';
  }
  return code === 'A'
    ? 'Tier A — 10% off list price'
    : code === 'B'
      ? 'Tier B — 15% off list price'
      : 'Tier C — per-product negotiated pricing';
}

function creditLabel(
  terms: 'NONE' | 'NET_15' | 'NET_30' | 'CUSTOM',
  limitEgp: number | null,
  locale: 'ar' | 'en',
): string {
  if (locale === 'ar') {
    switch (terms) {
      case 'NONE':
        return 'الدفع على الطلب — بدون أجل';
      case 'NET_15':
        return 'أجل سداد 15 يومًا';
      case 'NET_30':
        return 'أجل سداد 30 يومًا';
      case 'CUSTOM':
        return limitEgp
          ? `شروط خاصة — حد ائتماني ${limitEgp.toLocaleString('ar-EG')} ج.م`
          : 'شروط خاصة';
    }
  }
  switch (terms) {
    case 'NONE':
      return 'Pay on order — no credit extended';
    case 'NET_15':
      return 'Net 15';
    case 'NET_30':
      return 'Net 30';
    case 'CUSTOM':
      return limitEgp
        ? `Custom terms — credit limit ${limitEgp.toLocaleString('en-US')} EGP`
        : 'Custom terms';
  }
}

/**
 * Approve an application — creates User + Company in a single transaction,
 * marks the source application APPROVED, and enqueues the welcome email
 * with a generated temp password.
 */
export async function approveB2BApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ companyId: string }>> {
  const actor = await requireAdmin([...B2B_REVIEW_ROLES]);

  const parsed = b2bApplicationApproveSchema.safeParse({
    applicationId: formData.get('applicationId'),
    pricingTierCode: formData.get('pricingTierCode'),
    creditTerms: formData.get('creditTerms'),
    creditLimitEgp: formData.get('creditLimitEgp'),
    note: formData.get('note'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }
  const input = parsed.data;

  const application = await prisma.b2BApplication.findUnique({
    where: { id: input.applicationId },
  });
  if (!application) {
    return { ok: false, errorKey: 'b2b.application.not_found' };
  }
  if (application.status !== 'PENDING') {
    return { ok: false, errorKey: 'b2b.application.already_reviewed' };
  }

  const tier = await prisma.pricingTier.findUnique({
    where: { code: input.pricingTierCode },
  });
  if (!tier) {
    // Shouldn't happen in normal operation — tiers are seeded by post-push.
    return { ok: false, errorKey: 'b2b.tier.not_found' };
  }

  // Double-check collisions that may have appeared between form open and
  // submit (admin could have two tabs / another admin could have approved).
  const [emailTaken, phoneTaken, crTaken, taxTaken] = await Promise.all([
    prisma.user.findUnique({
      where: { email: application.email },
      select: { id: true, type: true },
    }),
    prisma.user.findUnique({
      where: { phone: application.phone },
      select: { id: true, type: true },
    }),
    prisma.company.findUnique({
      where: { crNumber: application.crNumber },
      select: { id: true },
    }),
    prisma.company.findUnique({
      where: { taxCardNumber: application.taxCardNumber },
      select: { id: true },
    }),
  ]);
  if (emailTaken && emailTaken.type !== 'B2C') {
    return { ok: false, errorKey: 'b2b.signup.email_in_use' };
  }
  // Phone is `@unique` globally. Only accept a B2C match when it's the same
  // user we'd upgrade via email match — otherwise approving would try to
  // write a duplicate phone on a fresh/different User row and Prisma P2002
  // would bubble up as `common.error`.
  if (
    phoneTaken &&
    (phoneTaken.type !== 'B2C' || phoneTaken.id !== emailTaken?.id)
  ) {
    return { ok: false, errorKey: 'b2b.signup.phone_in_use' };
  }
  if (crTaken) return { ok: false, errorKey: 'b2b.signup.cr_in_use' };
  if (taxTaken) return { ok: false, errorKey: 'b2b.signup.tax_in_use' };

  const tempPassword = generateTempPassword(12);
  const tempPasswordHash = await bcrypt.hash(tempPassword, 12);

  let companyId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      // If a B2C user exists with the same email (they browsed + ordered as
      // B2C before applying), upgrade that User to B2B — preserving their
      // order history. Otherwise create fresh.
      const user = emailTaken
        ? await tx.user.update({
            where: { id: emailTaken.id },
            data: {
              type: 'B2B',
              name: application.contactName,
              phone: application.phone,
              passwordHash: tempPasswordHash,
              mustChangePassword: true,
              status: 'ACTIVE',
            },
          })
        : await tx.user.create({
            data: {
              type: 'B2B',
              name: application.contactName,
              phone: application.phone,
              email: application.email,
              passwordHash: tempPasswordHash,
              mustChangePassword: true,
              status: 'ACTIVE',
            },
          });

      const company = await tx.company.create({
        data: {
          nameAr: application.companyName,
          nameEn: null,
          crNumber: application.crNumber,
          taxCardNumber: application.taxCardNumber,
          status: 'ACTIVE',
          pricingTierId: tier.id,
          creditTerms: input.creditTerms,
          creditLimitEgp:
            input.creditLimitEgp != null
              ? new Prisma.Decimal(input.creditLimitEgp)
              : null,
          monthlyVolumeEstimate: application.monthlyVolumeEstimate,
          primaryUserId: user.id,
        },
      });

      await tx.b2BApplication.update({
        where: { id: application.id },
        data: {
          status: 'APPROVED',
          reviewerId: actor.id,
          reviewedAt: new Date(),
          decisionNote: input.note,
          resultingCompanyId: company.id,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          action: 'b2b.application.approve',
          entityType: 'B2BApplication',
          entityId: application.id,
          after: {
            companyId: company.id,
            userId: user.id,
            pricingTier: tier.code,
            creditTerms: input.creditTerms,
            creditLimitEgp: input.creditLimitEgp,
            note: input.note,
          },
        },
      });

      return { companyId: company.id };
    });
    companyId = result.companyId;
  } catch (err) {
    logger.error(
      { err, applicationId: input.applicationId },
      'b2b.approve.transaction_failed',
    );
    return { ok: false, errorKey: 'common.error' };
  }

  // Send welcome email via the worker (non-blocking). Both locales are
  // rendered on-the-server — the applicant's preferred language lives on the
  // User (defaulted to AR for new rows). We use the User's languagePref we
  // just wrote / upserted; re-read to avoid assumptions about the branch.
  const baseUrl =
    process.env.APP_BASE_URL?.replace(/\/$/, '') ?? 'https://printbyfalcon.com';
  const freshUser = await prisma.user.findUnique({
    where: { email: application.email },
    select: { languagePref: true },
  });
  const locale: 'ar' | 'en' =
    (freshUser?.languagePref?.toLowerCase() as 'ar' | 'en' | undefined) ?? 'ar';

  const email = renderB2BWelcomeEmail({
    companyName: application.companyName,
    contactName: application.contactName,
    email: application.email,
    tempPassword,
    pricingTierLabel: tierLabel(tier.code, locale),
    creditTermsLabel: creditLabel(
      input.creditTerms,
      input.creditLimitEgp,
      locale,
    ),
    loginUrl: `${baseUrl}/${locale}/b2b/login`,
    note: input.note,
    locale,
  });

  try {
    await enqueueJob('send-email', {
      to: application.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (err) {
    // Non-fatal — admin can resend from the company detail page if SMTP hiccups.
    logger.warn(
      { err, applicationId: application.id },
      'b2b.approve.welcome_email_enqueue_failed',
    );
  }

  revalidatePath('/admin/b2b/applications');
  revalidatePath('/admin/b2b/companies');

  logger.info(
    { applicationId: application.id, companyId, actorId: actor.id },
    'b2b.application.approved',
  );
  return { ok: true, data: { companyId } };
}

/**
 * Reject an application — leaves no User row behind (Design A). The
 * applicant keeps access to retry with the same email after fixing the
 * issue the rejection reason called out.
 */
export async function rejectB2BApplicationAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin([...B2B_REVIEW_ROLES]);

  const parsed = b2bApplicationRejectSchema.safeParse({
    applicationId: formData.get('applicationId'),
    reason: formData.get('reason'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const application = await prisma.b2BApplication.findUnique({
    where: { id: parsed.data.applicationId },
  });
  if (!application) {
    return { ok: false, errorKey: 'b2b.application.not_found' };
  }
  if (application.status !== 'PENDING') {
    return { ok: false, errorKey: 'b2b.application.already_reviewed' };
  }

  await prisma.$transaction(async (tx) => {
    await tx.b2BApplication.update({
      where: { id: application.id },
      data: {
        status: 'REJECTED',
        reviewerId: actor.id,
        reviewedAt: new Date(),
        decisionNote: parsed.data.reason,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'b2b.application.reject',
        entityType: 'B2BApplication',
        entityId: application.id,
        after: { reason: parsed.data.reason },
      },
    });
  });

  const baseUrl =
    process.env.APP_BASE_URL?.replace(/\/$/, '') ?? 'https://printbyfalcon.com';
  // Rejected applications haven't created a User, so we don't have a stored
  // language preference — send AR since most applicants submit in AR.
  const locale: 'ar' | 'en' = 'ar';
  const email = renderB2BRejectionEmail({
    companyName: application.companyName,
    contactName: application.contactName,
    reason: parsed.data.reason,
    registerUrl: `${baseUrl}/${locale}/b2b/register`,
    locale,
  });

  try {
    await enqueueJob('send-email', {
      to: application.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    });
  } catch (err) {
    logger.warn(
      { err, applicationId: application.id },
      'b2b.reject.email_enqueue_failed',
    );
  }

  revalidatePath('/admin/b2b/applications');

  logger.info(
    { applicationId: application.id, actorId: actor.id },
    'b2b.application.rejected',
  );
  return { ok: true, data: null };
}

// ---------------------------------------------------------------------------
// Post-approval admin edits — tier / credit / status / checkout policy.
// Owner + Sales Rep can rebalance commercial terms; Ops cannot.
// ---------------------------------------------------------------------------

export async function updateCompanyTermsAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin([...B2B_REVIEW_ROLES]);

  const parsed = companyUpdateSchema.safeParse({
    companyId: formData.get('companyId'),
    pricingTierCode: formData.get('pricingTierCode'),
    creditTerms: formData.get('creditTerms'),
    creditLimitEgp: formData.get('creditLimitEgp'),
    status: formData.get('status'),
    checkoutPolicy: formData.get('checkoutPolicy'),
  });
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const tier = await prisma.pricingTier.findUnique({
    where: { code: parsed.data.pricingTierCode },
    select: { id: true },
  });
  if (!tier) return { ok: false, errorKey: 'b2b.tier.not_found' };

  const prior = await prisma.company.findUnique({
    where: { id: parsed.data.companyId },
    select: {
      pricingTierId: true,
      creditTerms: true,
      creditLimitEgp: true,
      status: true,
      checkoutPolicy: true,
    },
  });
  if (!prior) return { ok: false, errorKey: 'b2b.company.not_found' };

  await prisma.$transaction(async (tx) => {
    await tx.company.update({
      where: { id: parsed.data.companyId },
      data: {
        pricingTierId: tier.id,
        creditTerms: parsed.data.creditTerms,
        creditLimitEgp:
          parsed.data.creditLimitEgp != null
            ? new Prisma.Decimal(parsed.data.creditLimitEgp)
            : null,
        status: parsed.data.status,
        checkoutPolicy: parsed.data.checkoutPolicy,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'b2b.company.update_terms',
        entityType: 'Company',
        entityId: parsed.data.companyId,
        before: {
          pricingTierId: prior.pricingTierId,
          creditTerms: prior.creditTerms,
          creditLimitEgp: prior.creditLimitEgp?.toString() ?? null,
          status: prior.status,
          checkoutPolicy: prior.checkoutPolicy,
        },
        after: {
          pricingTierCode: parsed.data.pricingTierCode,
          creditTerms: parsed.data.creditTerms,
          creditLimitEgp: parsed.data.creditLimitEgp,
          status: parsed.data.status,
          checkoutPolicy: parsed.data.checkoutPolicy,
        },
      },
    });
  });

  revalidatePath(`/admin/b2b/companies/${parsed.data.companyId}`);
  revalidatePath('/admin/b2b/companies');

  return { ok: true, data: null };
}

/**
 * Upsert a per-SKU price override for a company. Used primarily by Tier C
 * accounts whose pricing is negotiated line-by-line, but valid for any tier.
 * Lookup by SKU instead of productId so the admin can paste in a list from
 * a spreadsheet without needing internal IDs.
 */
export async function upsertCompanyPriceOverrideAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin([...B2B_REVIEW_ROLES]);

  let parsed;
  try {
    parsed = companyPriceOverrideSchema.safeParse({
      companyId: formData.get('companyId'),
      sku: formData.get('sku'),
      customPriceEgp: formData.get('customPriceEgp'),
    });
  } catch (err) {
    logger.warn({ err }, 'b2b.override.validation_failed');
    return { ok: false, errorKey: 'validation.invalid' };
  }
  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const product = await prisma.product.findUnique({
    where: { sku: parsed.data.sku },
    select: { id: true, status: true },
  });
  if (!product || product.status !== 'ACTIVE') {
    return { ok: false, errorKey: 'b2b.override.sku.not_found' };
  }

  await prisma.$transaction(async (tx) => {
    const existing = await tx.companyPriceOverride.findUnique({
      where: {
        companyId_productId: {
          companyId: parsed.data.companyId,
          productId: product.id,
        },
      },
    });
    await tx.companyPriceOverride.upsert({
      where: {
        companyId_productId: {
          companyId: parsed.data.companyId,
          productId: product.id,
        },
      },
      create: {
        companyId: parsed.data.companyId,
        productId: product.id,
        customPriceEgp: new Prisma.Decimal(parsed.data.customPriceEgp),
      },
      update: {
        customPriceEgp: new Prisma.Decimal(parsed.data.customPriceEgp),
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: existing
          ? 'b2b.company.override.update'
          : 'b2b.company.override.create',
        entityType: 'CompanyPriceOverride',
        entityId: `${parsed.data.companyId}:${product.id}`,
        before: existing
          ? { customPriceEgp: existing.customPriceEgp.toString() }
          : undefined,
        after: {
          productId: product.id,
          sku: parsed.data.sku,
          customPriceEgp: parsed.data.customPriceEgp,
        },
      },
    });
  });

  revalidatePath(`/admin/b2b/companies/${parsed.data.companyId}`);
  return { ok: true, data: null };
}

export async function deleteCompanyPriceOverrideAction(
  formData: FormData,
): Promise<ActionResult<null>> {
  const actor = await requireAdmin([...B2B_REVIEW_ROLES]);
  const overrideId = String(formData.get('overrideId') ?? '').trim();
  if (!overrideId) return { ok: false, errorKey: 'validation.invalid' };

  const existing = await prisma.companyPriceOverride.findUnique({
    where: { id: overrideId },
    select: {
      companyId: true,
      productId: true,
      customPriceEgp: true,
    },
  });
  if (!existing) return { ok: false, errorKey: 'b2b.override.not_found' };

  await prisma.$transaction(async (tx) => {
    await tx.companyPriceOverride.delete({ where: { id: overrideId } });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: 'b2b.company.override.delete',
        entityType: 'CompanyPriceOverride',
        entityId: `${existing.companyId}:${existing.productId}`,
        before: { customPriceEgp: existing.customPriceEgp.toString() },
      },
    });
  });

  revalidatePath(`/admin/b2b/companies/${existing.companyId}`);
  return { ok: true, data: null };
}
