'use server';

/**
 * Public B2B Server Actions — no auth required. Currently just application
 * submission; other B2B actions (login, profile, etc.) live in their own
 * files and assume an active B2B session.
 */
import bcrypt from 'bcryptjs';
import { headers } from 'next/headers';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getClientIp } from '@/lib/request-ip';
import { checkAndIncrement, RATE_LIMIT_RULES } from '@/lib/rate-limit';
import { b2bApplicationSchema } from '@/lib/validation/b2b';
import { toLocalizedIssues } from '@/lib/validation/error-map';

type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      errorKey: string;
      fieldErrors?: { path: (string | number)[]; key: string }[];
    };

/**
 * Submit a B2B application. Stores everything in `B2BApplication` (including
 * the bcrypt-hashed password) so admin approval can create the User + Company
 * rows without re-prompting the applicant. No User row is created here —
 * rejected applications leave nothing dangling (Design A, Sprint 7 kickoff).
 *
 * The form-layer-safe error surface: field errors for zod issues, plus a few
 * business rules (email/CR# already belongs to an active Company, spam
 * throttling).
 */
export async function submitB2BApplicationAction(
  formData: FormData,
): Promise<ActionResult<{ applicationId: string }>> {
  const parsed = b2bApplicationSchema.safeParse({
    companyName: formData.get('companyName'),
    crNumber: formData.get('crNumber'),
    taxCardNumber: formData.get('taxCardNumber'),
    contactName: formData.get('contactName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    password: formData.get('password'),
    governorate: formData.get('governorate'),
    city: formData.get('city'),
    addressLine: formData.get('addressLine'),
    monthlyVolumeEstimate: formData.get('monthlyVolumeEstimate'),
  });

  if (!parsed.success) {
    return {
      ok: false,
      errorKey: 'validation.invalid',
      fieldErrors: toLocalizedIssues(parsed.error),
    };
  }

  const input = parsed.data;

  const rl = await checkAndIncrement(RATE_LIMIT_RULES.b2bSignup, input.email);
  if (!rl.allowed) {
    return { ok: false, errorKey: 'validation.rate_limit.exceeded' };
  }

  // Collision guards. A rejected application leaves no User row, so the email
  // naturally stays free for resubmission — we only block when the email is
  // already bound to a non-B2C User (admin/active B2B login) or when CR#/tax
  // card already belongs to an active Company.
  const [existingUser, existingPhoneUser] = await Promise.all([
    prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, type: true },
    }),
    prisma.user.findUnique({
      where: { phone: input.phone },
      select: { id: true, type: true },
    }),
  ]);
  if (existingUser && existingUser.type !== 'B2C') {
    return { ok: false, errorKey: 'b2b.signup.email_in_use' };
  }
  // Phone is `@unique` on User, so even a B2C match belonging to a
  // *different* account would collide on approval. We accept a B2C match
  // only when email + phone land on the *same* existing user — that's the
  // supported "B2C shopper upgrades to B2B on approval" path.
  if (
    existingPhoneUser &&
    (existingPhoneUser.type !== 'B2C' ||
      existingPhoneUser.id !== existingUser?.id)
  ) {
    return { ok: false, errorKey: 'b2b.signup.phone_in_use' };
  }

  const [crCompany, taxCompany] = await Promise.all([
    prisma.company.findUnique({
      where: { crNumber: input.crNumber },
      select: { id: true },
    }),
    prisma.company.findUnique({
      where: { taxCardNumber: input.taxCardNumber },
      select: { id: true },
    }),
  ]);
  if (crCompany) {
    return { ok: false, errorKey: 'b2b.signup.cr_in_use' };
  }
  if (taxCompany) {
    return { ok: false, errorKey: 'b2b.signup.tax_in_use' };
  }

  // Also reject if there's already a PENDING application on the same email —
  // admin would just see a duplicate. An APPROVED/REJECTED prior is fine
  // (approval creates User; rejection leaves a clean slate for resubmit).
  const pendingDupe = await prisma.b2BApplication.findFirst({
    where: { email: input.email, status: 'PENDING' },
    select: { id: true },
  });
  if (pendingDupe) {
    return { ok: false, errorKey: 'b2b.signup.pending_exists' };
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const h = await headers();
  const ip = getClientIp(h);
  const userAgent = h.get('user-agent') ?? null;

  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.b2BApplication.create({
      data: {
        companyName: input.companyName,
        crNumber: input.crNumber,
        taxCardNumber: input.taxCardNumber,
        contactName: input.contactName,
        phone: input.phone,
        email: input.email,
        passwordHash,
        governorate: input.governorate,
        city: input.city,
        addressLine: input.addressLine,
        monthlyVolumeEstimate: input.monthlyVolumeEstimate,
      },
      select: { id: true },
    });
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: 'b2b.application.submit',
        entityType: 'B2BApplication',
        entityId: created.id,
        after: {
          email: input.email,
          crNumber: input.crNumber,
          companyName: input.companyName,
        },
        ipAddress: ip,
        userAgent,
      },
    });
    return created;
  });

  logger.info(
    { applicationId: application.id, email: input.email },
    'b2b.application.submitted',
  );

  return { ok: true, data: { applicationId: application.id } };
}
