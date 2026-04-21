/**
 * Sprint 7 demo seeder — creates 3 B2B companies spanning all three pricing
 * tiers so the sprint demo shows negotiated-pricing behaviour end-to-end
 * without waiting on a real application → approval cycle.
 *
 *   npm run seed:b2b
 *
 * Idempotent: re-running upserts by email / CR#. Credentials printed to stdout.
 */
import { PrismaClient, type PricingTierCode } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type Seed = {
  label: string;
  nameAr: string;
  nameEn: string;
  crNumber: string;
  taxCardNumber: string;
  contactName: string;
  phone: string;
  email: string;
  password: string; // pre-hashed below
  tier: PricingTierCode;
  /** Optional — for demo tier C we'll also seed one override. */
  overrideSkuHint?: string;
  overridePriceEgp?: number;
};

const SEEDS: Seed[] = [
  {
    label: 'Tier A demo',
    nameAr: 'شركة النيل للطباعة',
    nameEn: 'Nile Printing Co.',
    crNumber: 'DEMO-CR-A-0001',
    taxCardNumber: 'DEMO-TAX-A-0001',
    contactName: 'Hala Farouk',
    phone: '+201012345001',
    email: 'demo-a@printbyfalcon.example',
    password: 'DemoPass2026A!',
    tier: 'A',
  },
  {
    label: 'Tier B demo',
    nameAr: 'مؤسسة الهرم للأعمال',
    nameEn: 'Pyramid Business',
    crNumber: 'DEMO-CR-B-0002',
    taxCardNumber: 'DEMO-TAX-B-0002',
    contactName: 'Mostafa Khalil',
    phone: '+201012345002',
    email: 'demo-b@printbyfalcon.example',
    password: 'DemoPass2026B!',
    tier: 'B',
  },
  {
    label: 'Tier C demo (custom pricing)',
    nameAr: 'شركة الإسكندرية التجارية',
    nameEn: 'Alexandria Trading',
    crNumber: 'DEMO-CR-C-0003',
    taxCardNumber: 'DEMO-TAX-C-0003',
    contactName: 'Nour El-Sayed',
    phone: '+201012345003',
    email: 'demo-c@printbyfalcon.example',
    password: 'DemoPass2026C!',
    tier: 'C',
  },
];

async function main() {
  // Ensure tiers are seeded first (post-push.ts does this on boot). We look
  // them up and abort if any are missing.
  const tiers = await prisma.pricingTier.findMany();
  const tierByCode = new Map(tiers.map((t) => [t.code, t]));
  for (const code of ['A', 'B', 'C'] as const) {
    if (!tierByCode.has(code)) {
      throw new Error(`PricingTier ${code} missing — run post-push.ts first`);
    }
  }

  for (const seed of SEEDS) {
    const passwordHash = await bcrypt.hash(seed.password, 12);

    // User first (unique by email).
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {
        type: 'B2B',
        name: seed.contactName,
        phone: seed.phone,
        passwordHash,
        mustChangePassword: false,
        status: 'ACTIVE',
      },
      create: {
        type: 'B2B',
        name: seed.contactName,
        phone: seed.phone,
        email: seed.email,
        passwordHash,
        mustChangePassword: false,
        status: 'ACTIVE',
        languagePref: 'AR',
      },
    });

    // Company (unique by CR#).
    await prisma.company.upsert({
      where: { crNumber: seed.crNumber },
      update: {
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
        taxCardNumber: seed.taxCardNumber,
        status: 'ACTIVE',
        pricingTierId: tierByCode.get(seed.tier)!.id,
        creditTerms: seed.tier === 'C' ? 'NET_30' : 'NONE',
        primaryUserId: user.id,
      },
      create: {
        nameAr: seed.nameAr,
        nameEn: seed.nameEn,
        crNumber: seed.crNumber,
        taxCardNumber: seed.taxCardNumber,
        status: 'ACTIVE',
        pricingTierId: tierByCode.get(seed.tier)!.id,
        creditTerms: seed.tier === 'C' ? 'NET_30' : 'NONE',
        primaryUserId: user.id,
      },
    });

    // eslint-disable-next-line no-console
    console.info(`[seed:b2b] ${seed.label} — ${seed.email} / ${seed.password}`);
  }

  // Tier C override — pick any ACTIVE product and attach a negotiated price.
  const tierCCompany = await prisma.company.findUnique({
    where: { crNumber: 'DEMO-CR-C-0003' },
    select: { id: true },
  });
  const firstProduct = await prisma.product.findFirst({
    where: { status: 'ACTIVE' },
    select: { id: true, sku: true, basePriceEgp: true },
    orderBy: { createdAt: 'asc' },
  });
  if (tierCCompany && firstProduct) {
    const customPrice =
      Math.round(Number(firstProduct.basePriceEgp) * 0.8 * 100) / 100;
    await prisma.companyPriceOverride.upsert({
      where: {
        companyId_productId: {
          companyId: tierCCompany.id,
          productId: firstProduct.id,
        },
      },
      update: { customPriceEgp: customPrice },
      create: {
        companyId: tierCCompany.id,
        productId: firstProduct.id,
        customPriceEgp: customPrice,
      },
    });
    // eslint-disable-next-line no-console
    console.info(
      `[seed:b2b] Tier C override — ${firstProduct.sku} @ ${customPrice} EGP (base ${firstProduct.basePriceEgp})`,
    );
  }

  // eslint-disable-next-line no-console
  console.info('[seed:b2b] Done — 3 companies ready for the sprint demo.');
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[seed:b2b] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
