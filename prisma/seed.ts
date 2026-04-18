/**
 * Seeds the first Owner admin on boot. Idempotent: only creates if no Owner exists.
 * Temp password comes from OWNER_TEMP_PASSWORD; mustChangePassword=true forces
 * a password reset on first successful login.
 */
import { PrismaClient, UserType, AdminRole, Locale } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const ownerEmail = process.env.OWNER_EMAIL;
  const ownerTempPassword = process.env.OWNER_TEMP_PASSWORD;

  if (!ownerEmail || !ownerTempPassword) {
    throw new Error(
      'OWNER_EMAIL and OWNER_TEMP_PASSWORD must be set to seed the first admin.',
    );
  }

  const existing = await prisma.user.findFirst({
    where: { type: UserType.ADMIN, adminRole: AdminRole.OWNER },
  });

  if (existing) {
    // eslint-disable-next-line no-console
    console.warn(`Owner admin already exists (${existing.email}); skipping seed.`);
    return;
  }

  const passwordHash = await bcrypt.hash(ownerTempPassword, 12);

  const owner = await prisma.user.create({
    data: {
      type: UserType.ADMIN,
      adminRole: AdminRole.OWNER,
      name: 'Falcon Owner',
      email: ownerEmail,
      passwordHash,
      mustChangePassword: true,
      languagePref: Locale.AR,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: null,
      action: 'admin.seed',
      entityType: 'User',
      entityId: owner.id,
      note: 'Initial Owner seeded via prisma seed; password reset required on first login.',
    },
  });

  // eslint-disable-next-line no-console
  console.warn(`Seeded Owner admin: ${owner.email}. Must reset password on first login.`);
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
