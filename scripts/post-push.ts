/**
 * Post-`prisma db push` bootstrap — applies raw-SQL artifacts that Prisma's
 * schema can't express yet (GIN indexes on Unsupported("tsvector"), pg_trgm
 * extension, searchVector backfill for existing rows).
 *
 * Runs on every app container start, after `db push` and before `seed.ts`,
 * so it is idempotent by design (every statement is `IF NOT EXISTS` or an
 * unconditional UPDATE).
 */
import { PrismaClient, type Governorate } from '@prisma/client';
import { DEFAULT_WHATSAPP_TEMPLATES } from '../lib/whatsapp/templates-seed';
import { RECOMPUTE_POPULARITY_SQL } from '../lib/catalog/popularity';

const prisma = new PrismaClient();

// Sprint 11.5 — shipping-zone codes (was the `ShippingZoneCode` enum). Stable
// string slugs used for upsert idempotency. Admin can add new zones with
// auto-generated slugs via /admin/settings/shipping.
type ShippingZoneCode =
  | 'GREATER_CAIRO'
  | 'ALEX_DELTA'
  | 'CANAL_SUEZ'
  | 'UPPER_EGYPT'
  | 'SINAI_RED_SEA_REMOTE';

// Sprint 11.5 — bilingual labels for the 27 governorates. Mirrors
// `lib/i18n/governorates.ts` so post-push has zero runtime dependency on the
// app code (post-push runs at container boot, before Next.js compiles).
const GOVERNORATE_LABELS: Array<{
  code: Governorate;
  nameAr: string;
  nameEn: string;
}> = [
  { code: 'CAIRO', nameAr: 'القاهرة', nameEn: 'Cairo' },
  { code: 'GIZA', nameAr: 'الجيزة', nameEn: 'Giza' },
  { code: 'QALYUBIA', nameAr: 'القليوبية', nameEn: 'Qalyubia' },
  { code: 'ALEXANDRIA', nameAr: 'الإسكندرية', nameEn: 'Alexandria' },
  { code: 'BEHEIRA', nameAr: 'البحيرة', nameEn: 'Beheira' },
  { code: 'DAKAHLIA', nameAr: 'الدقهلية', nameEn: 'Dakahlia' },
  { code: 'DAMIETTA', nameAr: 'دمياط', nameEn: 'Damietta' },
  { code: 'GHARBIA', nameAr: 'الغربية', nameEn: 'Gharbia' },
  { code: 'KAFR_EL_SHEIKH', nameAr: 'كفر الشيخ', nameEn: 'Kafr El Sheikh' },
  { code: 'MENOUFIA', nameAr: 'المنوفية', nameEn: 'Menoufia' },
  { code: 'SHARQIA', nameAr: 'الشرقية', nameEn: 'Sharqia' },
  { code: 'ISMAILIA', nameAr: 'الإسماعيلية', nameEn: 'Ismailia' },
  { code: 'PORT_SAID', nameAr: 'بورسعيد', nameEn: 'Port Said' },
  { code: 'SUEZ', nameAr: 'السويس', nameEn: 'Suez' },
  { code: 'NORTH_SINAI', nameAr: 'شمال سيناء', nameEn: 'North Sinai' },
  { code: 'SOUTH_SINAI', nameAr: 'جنوب سيناء', nameEn: 'South Sinai' },
  { code: 'RED_SEA', nameAr: 'البحر الأحمر', nameEn: 'Red Sea' },
  { code: 'MATRUH', nameAr: 'مطروح', nameEn: 'Matrouh' },
  { code: 'NEW_VALLEY', nameAr: 'الوادي الجديد', nameEn: 'New Valley' },
  { code: 'BENI_SUEF', nameAr: 'بني سويف', nameEn: 'Beni Suef' },
  { code: 'FAYOUM', nameAr: 'الفيوم', nameEn: 'Fayoum' },
  { code: 'MINYA', nameAr: 'المنيا', nameEn: 'Minya' },
  { code: 'ASYUT', nameAr: 'أسيوط', nameEn: 'Asyut' },
  { code: 'SOHAG', nameAr: 'سوهاج', nameEn: 'Sohag' },
  { code: 'QENA', nameAr: 'قنا', nameEn: 'Qena' },
  { code: 'LUXOR', nameAr: 'الأقصر', nameEn: 'Luxor' },
  { code: 'ASWAN', nameAr: 'أسوان', nameEn: 'Aswan' },
];

// Sprint 9 seed data — zone rates from the owner's 2026-04-22 kickoff.
// All values are admin-editable post-seed via /admin/settings/shipping.
const SHIPPING_ZONES: Array<{
  code: ShippingZoneCode;
  nameAr: string;
  nameEn: string;
  baseRateEgp: number;
  position: number;
}> = [
  {
    code: 'GREATER_CAIRO',
    nameAr: 'القاهرة الكبرى',
    nameEn: 'Greater Cairo',
    baseRateEgp: 40,
    position: 1,
  },
  {
    code: 'ALEX_DELTA',
    nameAr: 'الإسكندرية والدلتا',
    nameEn: 'Alexandria + Delta',
    baseRateEgp: 65,
    position: 2,
  },
  {
    code: 'CANAL_SUEZ',
    nameAr: 'القناة والسويس',
    nameEn: 'Canal + Suez',
    baseRateEgp: 70,
    position: 3,
  },
  {
    code: 'UPPER_EGYPT',
    nameAr: 'الصعيد',
    nameEn: 'Upper Egypt',
    baseRateEgp: 85,
    position: 4,
  },
  {
    code: 'SINAI_RED_SEA_REMOTE',
    nameAr: 'سيناء والبحر الأحمر والمناطق النائية',
    nameEn: 'Sinai + Red Sea + Remote',
    baseRateEgp: 130,
    position: 5,
  },
];

// Governorate → zone mapping — plain reading of PRD §5 Feature 3.
const GOVERNORATE_ZONES: Array<{
  governorate: Governorate;
  zoneCode: ShippingZoneCode;
}> = [
  // Greater Cairo
  { governorate: 'CAIRO', zoneCode: 'GREATER_CAIRO' },
  { governorate: 'GIZA', zoneCode: 'GREATER_CAIRO' },
  { governorate: 'QALYUBIA', zoneCode: 'GREATER_CAIRO' },
  // Alex + Delta
  { governorate: 'ALEXANDRIA', zoneCode: 'ALEX_DELTA' },
  { governorate: 'BEHEIRA', zoneCode: 'ALEX_DELTA' },
  { governorate: 'DAKAHLIA', zoneCode: 'ALEX_DELTA' },
  { governorate: 'DAMIETTA', zoneCode: 'ALEX_DELTA' },
  { governorate: 'GHARBIA', zoneCode: 'ALEX_DELTA' },
  { governorate: 'KAFR_EL_SHEIKH', zoneCode: 'ALEX_DELTA' },
  { governorate: 'MENOUFIA', zoneCode: 'ALEX_DELTA' },
  { governorate: 'SHARQIA', zoneCode: 'ALEX_DELTA' },
  // Canal + Suez
  { governorate: 'ISMAILIA', zoneCode: 'CANAL_SUEZ' },
  { governorate: 'PORT_SAID', zoneCode: 'CANAL_SUEZ' },
  { governorate: 'SUEZ', zoneCode: 'CANAL_SUEZ' },
  // Upper Egypt
  { governorate: 'BENI_SUEF', zoneCode: 'UPPER_EGYPT' },
  { governorate: 'FAYOUM', zoneCode: 'UPPER_EGYPT' },
  { governorate: 'MINYA', zoneCode: 'UPPER_EGYPT' },
  { governorate: 'ASYUT', zoneCode: 'UPPER_EGYPT' },
  { governorate: 'SOHAG', zoneCode: 'UPPER_EGYPT' },
  { governorate: 'QENA', zoneCode: 'UPPER_EGYPT' },
  { governorate: 'LUXOR', zoneCode: 'UPPER_EGYPT' },
  { governorate: 'ASWAN', zoneCode: 'UPPER_EGYPT' },
  // Sinai + Red Sea + Remote
  { governorate: 'NORTH_SINAI', zoneCode: 'SINAI_RED_SEA_REMOTE' },
  { governorate: 'SOUTH_SINAI', zoneCode: 'SINAI_RED_SEA_REMOTE' },
  { governorate: 'RED_SEA', zoneCode: 'SINAI_RED_SEA_REMOTE' },
  { governorate: 'MATRUH', zoneCode: 'SINAI_RED_SEA_REMOTE' },
  { governorate: 'NEW_VALLEY', zoneCode: 'SINAI_RED_SEA_REMOTE' },
];

async function main() {
  // Trigram extension — powers fallback short-query search and fuzzy lookups
  // for printer-model names.
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // GIN index for tsvector queries. `Unsupported("tsvector")` in Prisma means
  // we manage this by hand. Naming matches Prisma's `<Model>_<field>_idx`.
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_searchVector_idx" ON "Product" USING GIN ("searchVector")`,
  );

  // Trigram indexes for short-query fallback (catches queries shorter than a
  // tokenizer word boundary) on fields users actually type into the search box.
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_nameAr_trgm_idx" ON "Product" USING GIN ("nameAr" gin_trgm_ops)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_nameEn_trgm_idx" ON "Product" USING GIN ("nameEn" gin_trgm_ops)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_sku_trgm_idx" ON "Product" USING GIN ("sku" gin_trgm_ops)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PrinterModel_modelName_trgm_idx" ON "PrinterModel" USING GIN ("modelName" gin_trgm_ops)`,
  );

  // Sprint 4 bootstrap: every ACTIVE product needs an Inventory row so cart
  // soft reservations and order-placement inventory decrement have something
  // to work against. Seed missing rows with qty=100. Sprint 6 replaces the
  // default with real receive/adjust flow.
  await prisma.$executeRawUnsafe(`
    INSERT INTO "Inventory" ("productId", "currentQty", "updatedAt")
    SELECT p.id, 100, NOW()
    FROM "Product" p
    WHERE NOT EXISTS (SELECT 1 FROM "Inventory" i WHERE i."productId" = p.id)
  `);

  // Sprint 7 bootstrap: seed the 3 default PricingTier rows. Code is the
  // natural key (UNIQUE in Prisma), so upsert-by-code is idempotent across
  // every container restart. Defaults from PRD §5 Feature 2 + kickoff
  // resolution: A = 10%, B = 15%, C = per-SKU only (no blanket discount).
  await prisma.pricingTier.upsert({
    where: { code: 'A' },
    update: {},
    create: {
      code: 'A',
      nameAr: 'المستوى أ',
      nameEn: 'Tier A',
      defaultDiscountPercent: 10,
    },
  });
  await prisma.pricingTier.upsert({
    where: { code: 'B' },
    update: {},
    create: {
      code: 'B',
      nameAr: 'المستوى ب',
      nameEn: 'Tier B',
      defaultDiscountPercent: 15,
    },
  });
  await prisma.pricingTier.upsert({
    where: { code: 'C' },
    update: {},
    create: {
      code: 'C',
      nameAr: 'المستوى ج (أسعار مخصّصة)',
      nameEn: 'Tier C (Custom)',
      defaultDiscountPercent: null,
    },
  });

  // Sprint 9 bootstrap: seed 5 ShippingZones + 27 GovernorateZone mappings
  // + default COD policy + VAT rate + free-ship thresholds. Every call is
  // upsert-by-natural-key so container restarts are safe; admin edits
  // survive because `update: {}` is a no-op on existing rows.
  for (const zone of SHIPPING_ZONES) {
    await prisma.shippingZone.upsert({
      where: { code: zone.code },
      update: {},
      create: {
        code: zone.code,
        nameAr: zone.nameAr,
        nameEn: zone.nameEn,
        baseRateEgp: zone.baseRateEgp,
        position: zone.position,
        codEnabled: true,
      },
    });
  }

  // Build the code→id map once so the governorate-zone upsert below is a
  // pure loop with no per-row DB lookup for zone id.
  const zoneRows = await prisma.shippingZone.findMany({
    select: { id: true, code: true },
  });
  const zoneIdByCode = new Map(zoneRows.map((z) => [z.code, z.id]));
  for (const gov of GOVERNORATE_ZONES) {
    const zoneId = zoneIdByCode.get(gov.zoneCode);
    if (!zoneId) continue; // defensive — shouldn't happen after the loop above
    await prisma.governorateZone.upsert({
      where: { governorate: gov.governorate },
      update: {}, // don't overwrite admin edits
      create: { governorate: gov.governorate, zoneId },
    });
  }

  // Sprint 11.5 — seed `GovernorateConfig` for all 27 enum codes. New
  // admin-editable surface (deliverable toggle, names, position, zone
  // reassignment); kept in lock-step with `GovernorateZone` above for
  // legacy readers (`lib/shipping/resolve.ts`). `update: {}` preserves
  // admin edits across redeploys.
  for (let i = 0; i < GOVERNORATE_LABELS.length; i++) {
    const entry = GOVERNORATE_LABELS[i]!;
    const mapping = GOVERNORATE_ZONES.find((g) => g.governorate === entry.code);
    const zoneId = mapping ? zoneIdByCode.get(mapping.zoneCode) : undefined;
    await prisma.governorateConfig.upsert({
      where: { code: entry.code },
      update: {}, // don't overwrite admin edits
      create: {
        code: entry.code,
        nameAr: entry.nameAr,
        nameEn: entry.nameEn,
        deliverable: true,
        position: i,
        zoneId: zoneId ?? null,
      },
    });
  }

  // Sprint 11.5 — seed payment methods + default mode. `update: {}` preserves
  // any admin edits (toggle / labels) so changes from /admin/settings/payment-
  // methods survive redeploys. The 4 default rows mirror PRD Feature 3 +
  // ADR-022 / ADR-025 (card live, Fawry via Paymob sub-integration disabled
  // by default until owner flips it, wallet placeholder, COD always on).
  const PAYMENT_METHODS: Array<{
    code: string;
    enabled: boolean;
    nameAr: string;
    nameEn: string;
    descriptionAr: string;
    descriptionEn: string;
    position: number;
    paymobIntegrationKind: string | null;
  }> = [
    {
      code: 'paymob_card',
      enabled: true,
      nameAr: 'فيزا / ماستركارد / ميزة',
      nameEn: 'Visa / Mastercard / Meeza',
      descriptionAr: 'دفع آمن بالبطاقة عبر Paymob.',
      descriptionEn: 'Secure card payment via Paymob.',
      position: 1,
      paymobIntegrationKind: 'card',
    },
    {
      code: 'paymob_fawry',
      enabled: false,
      nameAr: 'فوري — دفع عند المنفذ',
      nameEn: 'Fawry — pay at outlet',
      descriptionAr:
        'سيُولَّد كود فوري بعد إتمام الطلب. ادفع نقداً عند أي منفذ فوري.',
      descriptionEn:
        'A Fawry reference code will be generated after checkout. Pay cash at any Fawry outlet.',
      position: 2,
      paymobIntegrationKind: 'fawry',
    },
    {
      code: 'paymob_wallet',
      enabled: false,
      nameAr: 'محفظة إلكترونية',
      nameEn: 'Mobile wallet',
      descriptionAr: 'فودافون كاش / إتصالات كاش / أورنج كاش / واي باي.',
      descriptionEn: 'Vodafone Cash / Etisalat Cash / Orange Cash / WE Pay.',
      position: 3,
      paymobIntegrationKind: 'wallet',
    },
    {
      code: 'cod',
      enabled: true,
      nameAr: 'الدفع عند الاستلام',
      nameEn: 'Cash on delivery',
      descriptionAr: 'ادفع نقداً للمندوب عند تسليم الطلب.',
      descriptionEn: 'Pay the courier in cash at delivery.',
      position: 4,
      paymobIntegrationKind: null,
    },
  ];
  for (const pm of PAYMENT_METHODS) {
    await prisma.paymentMethodConfig.upsert({
      where: { code: pm.code },
      update: {}, // don't overwrite admin edits
      create: pm,
    });
  }

  // Sprint 11.5 — default payment mode: LIVE in production. Owner flips from
  // /admin/settings/payment-methods (gated by admin password).
  const PAYMENT_MODE_KEY = 'payment.mode';
  const existingPaymentMode = await prisma.setting.findUnique({
    where: { key: PAYMENT_MODE_KEY },
    select: { key: true },
  });
  if (!existingPaymentMode) {
    await prisma.setting.create({
      data: {
        key: PAYMENT_MODE_KEY,
        value: { mode: 'LIVE' } as never,
      },
    });
  }

  // Sprint 11.5 — default Whats360 transport mode: LIVE. Owner flips from
  // /admin/settings/whatsapp (admin-password gated). Env vars
  // NOTIFICATIONS_DEV_MODE / WHATS360_SANDBOX still win at the env layer for
  // local-dev convenience.
  const WHATSAPP_MODE_KEY = 'whatsapp.transport';
  const existingWhatsappMode = await prisma.setting.findUnique({
    where: { key: WHATSAPP_MODE_KEY },
    select: { key: true },
  });
  if (!existingWhatsappMode) {
    await prisma.setting.create({
      data: {
        key: WHATSAPP_MODE_KEY,
        value: { mode: 'LIVE' } as never,
      },
    });
  }

  // Free-shipping threshold defaults (B2C=1500, B2B=5000). Per-zone
  // overrides live on ShippingZone columns; admin sets globals here.
  const FREE_SHIP_KEY = 'shipping.freeShipThresholds';
  const existingFreeShip = await prisma.setting.findUnique({
    where: { key: FREE_SHIP_KEY },
    select: { key: true },
  });
  if (!existingFreeShip) {
    await prisma.setting.create({
      data: {
        key: FREE_SHIP_KEY,
        value: { b2cEgp: 1500, b2bEgp: 5000 } as never,
      },
    });
  }

  // COD policy defaults (closes PRD Q#13): enabled / 20 EGP fixed fee /
  // max 15000 EGP. Per-zone on/off lives on ShippingZone.codEnabled so
  // the admin can toggle Sinai/Red Sea without touching the global
  // policy. `feeType` is FIXED or PERCENT; `feeValue` is EGP (FIXED) or
  // percent points (PERCENT).
  const COD_KEY = 'cod.policy';
  const existingCod = await prisma.setting.findUnique({
    where: { key: COD_KEY },
    select: { key: true },
  });
  if (!existingCod) {
    await prisma.setting.create({
      data: {
        key: COD_KEY,
        value: {
          enabled: true,
          feeType: 'FIXED',
          feeValue: 20,
          maxOrderEgp: 15000,
        } as never,
      },
    });
  }

  // VAT defaults (14% per PRD §8 Non-Functional Requirements).
  const VAT_KEY = 'vat.rate';
  const existingVat = await prisma.setting.findUnique({
    where: { key: VAT_KEY },
    select: { key: true },
  });
  if (!existingVat) {
    await prisma.setting.create({
      data: {
        key: VAT_KEY,
        value: { percent: 14 } as never,
      },
    });
  }

  // Sprint 10 — Return policy defaults.
  // Shape: { enabled, windowDays, minOrderEgp (nullable), overrideRoles[] }.
  // OWNER can edit in /admin/settings/returns; admin edits preserved via findUnique gate.
  const RETURN_KEY = 'returns.policy';
  const existingReturn = await prisma.setting.findUnique({
    where: { key: RETURN_KEY },
    select: { key: true },
  });
  if (!existingReturn) {
    await prisma.setting.create({
      data: {
        key: RETURN_KEY,
        value: {
          enabled: true,
          windowDays: 14,
          minOrderEgp: null,
          overrideRoles: ['OWNER', 'OPS', 'SALES_REP'],
        } as never,
      },
    });
  }

  // Sprint 9 S9-D9-T3 — seed 3 demo promo codes across types. Idempotent by
  // unique `code`. `update: {}` preserves admin edits to value / cap / limit,
  // so changes made via the admin UI survive redeploys.
  await prisma.promoCode.upsert({
    where: { code: 'WELCOME10' },
    update: {},
    create: {
      code: 'WELCOME10',
      type: 'PERCENT',
      value: 10,
      minOrderEgp: 300,
      // Cap for percent-based discount — 10% on a 28k order = 2,895 ج.م
      // which is absurd for a "welcome" promo. 150 EGP is the ceiling.
      maxDiscountEgp: 150,
      usageLimit: null, // unlimited
      active: true,
    },
  });
  await prisma.promoCode.upsert({
    where: { code: 'FIXED50' },
    update: {},
    create: {
      code: 'FIXED50',
      type: 'FIXED',
      value: 50,
      minOrderEgp: 500,
      maxDiscountEgp: null, // redundant for FIXED
      usageLimit: 100,
      active: true,
    },
  });
  await prisma.promoCode.upsert({
    where: { code: 'B2BBULK' },
    update: {},
    create: {
      code: 'B2BBULK',
      type: 'PERCENT',
      value: 5,
      minOrderEgp: 2000,
      // B2B orders are bigger by nature — cap at 500 EGP so a massive
      // corporate order doesn't ride the promo for thousands off. Owner
      // tunes later via admin UI.
      maxDiscountEgp: 500,
      usageLimit: null,
      active: true,
    },
  });

  // Sprint 5 bootstrap: at least one active courier is required for the
  // "Mark Handed to Courier" admin action — the modal's courier dropdown
  // gates the submit button. Without a seeded default, every fresh DB lands
  // ops on a "no active couriers" wall the first time they try to ship.
  // Owner edits / replaces these via /admin/couriers; idempotent on nameEn.
  const DEFAULT_COURIERS: Array<{
    nameAr: string;
    nameEn: string;
    phone: string | null;
    position: number;
  }> = [
    { nameAr: 'بوسطة', nameEn: 'Bosta', phone: null, position: 1 },
    {
      nameAr: 'مندوب داخلي',
      nameEn: 'In-house Driver',
      phone: null,
      position: 2,
    },
  ];
  for (const c of DEFAULT_COURIERS) {
    const existing = await prisma.courier.findFirst({
      where: { nameEn: c.nameEn },
      select: { id: true },
    });
    if (!existing) {
      await prisma.courier.create({ data: c });
    }
  }

  // Sprint 15 — seed default WhatsApp message templates. Idempotent by key.
  // `update: {}` means re-running this on every boot does NOT overwrite an
  // owner's edits — only NEW keys (fresh templates added in code) get
  // inserted. To restore a default, the admin UI has a "Reset to default"
  // action that overwrites the row from `DEFAULT_WHATSAPP_TEMPLATES`.
  for (const tpl of DEFAULT_WHATSAPP_TEMPLATES) {
    await prisma.whatsappTemplate.upsert({
      where: { key: tpl.key },
      update: {},
      create: {
        key: tpl.key,
        category: tpl.category,
        nameAr: tpl.nameAr,
        nameEn: tpl.nameEn,
        descriptionAr: tpl.descriptionAr,
        descriptionEn: tpl.descriptionEn,
        bodyAr: tpl.bodyAr,
        bodyEn: tpl.bodyEn,
        variables: tpl.variables as never,
      },
    });
  }

  // Backfill searchVector for every product. Safe to run every boot — it's a
  // single UPDATE that rewrites identical bytes when nothing changed.
  const rewritten = await prisma.$executeRawUnsafe(`
    UPDATE "Product" p
    SET "searchVector" =
      setweight(to_tsvector('simple', coalesce(p."sku", '')), 'A')
      || setweight(to_tsvector('simple', coalesce(p."nameAr", '')), 'A')
      || setweight(to_tsvector('simple', coalesce(p."nameEn", '')), 'A')
      || setweight(to_tsvector('simple', coalesce(b."nameAr", '')), 'B')
      || setweight(to_tsvector('simple', coalesce(b."nameEn", '')), 'B')
      || setweight(to_tsvector('simple', coalesce(p."descriptionAr", '')), 'C')
      || setweight(to_tsvector('simple', coalesce(p."descriptionEn", '')), 'C')
    FROM "Brand" b
    WHERE b.id = p."brandId"
  `);

  // eslint-disable-next-line no-console
  console.warn(
    `[post-push] FTS bootstrap OK — rewrote ${rewritten} product search vectors.`,
  );

  // PR 3 (extended PR 4) — recompute popularityScore once on every deploy
  // so the "recommended" sort works immediately after a release rather
  // than waiting up to 24h for the nightly cron's first tick. SQL is the
  // single source of truth in `lib/catalog/popularity.ts`.
  const popularityUpdated = await prisma.$executeRawUnsafe(
    RECOMPUTE_POPULARITY_SQL,
  );
  // eslint-disable-next-line no-console
  console.warn(
    `[post-push] popularity bootstrap OK — recomputed ${popularityUpdated} product scores.`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[post-push] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
