/**
 * Demo-dataset seeder (Sprint 5 S5-D5-T3) — creates 30 orders spread across
 * statuses, payment methods, and dates so the admin orders list and cancellation
 * queue have realistic rows during the sprint demo.
 *
 * Usage (from the repo root):
 *   npm run seed:orders            # creates ~30 demo orders if none exist
 *   npm run seed:orders -- --force # wipes demo-seeded orders (tagged in internalNotes)
 *                                  # and recreates
 *
 * The seeder only touches orders it owns — rows whose `internalNotes` contains
 * the `[demo-seed]` tag. Real orders are never modified.
 */
import {
  PaymentMethod,
  PaymentStatus,
  PrismaClient,
  type Product,
} from '@prisma/client';
import { randomUUID } from 'node:crypto';

const prisma = new PrismaClient();
const DEMO_TAG = '[demo-seed]';

type StatusSpec = {
  status:
    | 'PENDING_CONFIRMATION'
    | 'CONFIRMED'
    | 'HANDED_TO_COURIER'
    | 'OUT_FOR_DELIVERY'
    | 'DELIVERED'
    | 'CANCELLED'
    | 'RETURNED'
    | 'DELAYED_OR_ISSUE';
  count: number;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  // days ago range for createdAt
  daysAgo: [number, number];
};

const STATUS_MIX: StatusSpec[] = [
  {
    status: 'CONFIRMED',
    count: 6,
    paymentStatus: 'PAID',
    paymentMethod: 'PAYMOB_CARD',
    daysAgo: [0, 2],
  },
  {
    status: 'CONFIRMED',
    count: 3,
    paymentStatus: 'PENDING_ON_DELIVERY',
    paymentMethod: 'COD',
    daysAgo: [0, 2],
  },
  {
    status: 'HANDED_TO_COURIER',
    count: 5,
    paymentStatus: 'PAID',
    paymentMethod: 'PAYMOB_CARD',
    daysAgo: [1, 4],
  },
  {
    status: 'OUT_FOR_DELIVERY',
    count: 4,
    paymentStatus: 'PAID',
    paymentMethod: 'PAYMOB_CARD',
    daysAgo: [2, 5],
  },
  {
    status: 'DELIVERED',
    count: 6,
    paymentStatus: 'PAID',
    paymentMethod: 'PAYMOB_CARD',
    daysAgo: [3, 14],
  },
  {
    status: 'DELIVERED',
    count: 2,
    paymentStatus: 'PAID',
    paymentMethod: 'COD',
    daysAgo: [3, 14],
  },
  {
    status: 'CANCELLED',
    count: 2,
    paymentStatus: 'REFUNDED',
    paymentMethod: 'PAYMOB_CARD',
    daysAgo: [5, 10],
  },
  {
    status: 'DELAYED_OR_ISSUE',
    count: 1,
    paymentStatus: 'PAID',
    paymentMethod: 'PAYMOB_CARD',
    daysAgo: [2, 4],
  },
  {
    status: 'RETURNED',
    count: 1,
    paymentStatus: 'REFUNDED',
    paymentMethod: 'COD',
    daysAgo: [6, 12],
  },
  // Sprint 8 S8-D8-T3 — B2B Submit-for-Review orders waiting for a sales rep
  // to confirm. Placed by a plausible name + a PO reference on half of them.
  {
    status: 'PENDING_CONFIRMATION',
    count: 4,
    paymentStatus: 'PENDING',
    paymentMethod: 'SUBMIT_FOR_REVIEW',
    daysAgo: [0, 2],
  },
];

const DEMO_NAMES = [
  'Mahmoud Hassan',
  'Youssef Ibrahim',
  'Nada Hany',
  'Omar Sherif',
  'Sara Khaled',
  'Ahmed Mostafa',
  'Laila Fouad',
  'Karim Tarek',
  'Dina Samir',
  'Mohamed Samy',
  'Reem Adel',
  'Hassan Kamel',
  'Amira Salah',
  'Yara Mahmoud',
  'Tamer Naguib',
];

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]!;
}

function seededRng(seed: number): () => number {
  // mulberry32 — deterministic so repeat runs produce the same order (easier to diff)
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtOrderNumber(d: Date, serial: number): string {
  const yy = String(d.getUTCFullYear()).slice(-2);
  const dd = String(d.getUTCDate()).padStart(2, '0');
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `ORD-${yy}-${dd}${mm}-${String(serial).padStart(5, '0')}`;
}

async function main() {
  const force = process.argv.includes('--force');

  if (force) {
    const del = await prisma.order.deleteMany({
      where: { internalNotes: { contains: DEMO_TAG } },
    });
    console.log(`[seed-orders] --force: removed ${del.count} prior demo rows`);
  } else {
    const existing = await prisma.order.count({
      where: { internalNotes: { contains: DEMO_TAG } },
    });
    if (existing > 0) {
      console.log(
        `[seed-orders] ${existing} demo orders already present — skipping. Use --force to recreate.`,
      );
      return;
    }
  }

  // Need at least a few products to build cart items.
  const products: Pick<
    Product,
    'id' | 'sku' | 'nameAr' | 'nameEn' | 'basePriceEgp'
  >[] = await prisma.product.findMany({
    where: { status: 'ACTIVE' },
    select: {
      id: true,
      sku: true,
      nameAr: true,
      nameEn: true,
      basePriceEgp: true,
    },
    take: 30,
  });
  if (products.length === 0) {
    console.error(
      '[seed-orders] no ACTIVE products — run `npm run seed:catalog` first.',
    );
    process.exit(1);
  }

  const rng = seededRng(42);
  let serial = 1000; // offset so demo IDs don't collide with real daily serials

  for (const spec of STATUS_MIX) {
    for (let i = 0; i < spec.count; i += 1) {
      const createdAtDaysAgo =
        spec.daysAgo[0] +
        Math.floor(rng() * (spec.daysAgo[1] - spec.daysAgo[0] + 1));
      const createdAt = new Date(
        Date.now() - createdAtDaysAgo * 24 * 60 * 60 * 1000,
      );
      const name = pick(DEMO_NAMES, rng);
      const phoneTail = String(10_000_000 + Math.floor(rng() * 89_999_999));
      const phone = `+2010${phoneTail.slice(0, 8)}`;
      const orderSerial = ++serial;
      const orderNumber = fmtOrderNumber(createdAt, orderSerial);

      // 1-3 items per order, with snapshotted prices.
      const itemCount = 1 + Math.floor(rng() * 3);
      const chosen = new Set<number>();
      while (chosen.size < itemCount && chosen.size < products.length) {
        chosen.add(Math.floor(rng() * products.length));
      }
      const items = Array.from(chosen).map((idx) => {
        const p = products[idx]!;
        const qty = 1 + Math.floor(rng() * 3);
        const unit = Number(p.basePriceEgp);
        return {
          productId: p.id,
          skuSnapshot: p.sku,
          nameArSnapshot: p.nameAr,
          nameEnSnapshot: p.nameEn,
          qty,
          unitPriceEgp: unit,
          lineTotalEgp: unit * qty,
        };
      });
      const subtotal = items.reduce((a, i) => a + i.lineTotalEgp, 0);
      const shipping = subtotal > 500 ? 0 : 50;
      const total = subtotal + shipping;

      const addressSnapshot = {
        recipientName: name,
        phone,
        governorate: 'CAIRO',
        city: 'Cairo',
        area: pick(['Maadi', 'Nasr City', 'Zamalek', 'Heliopolis'], rng),
        street: `${Math.floor(rng() * 200) + 1} Demo Street`,
        building: String(Math.floor(rng() * 50) + 1),
        apartment: String(Math.floor(rng() * 20) + 1),
        notes: null,
      };

      // Sprint 8 S8-D8-T3: SFR demo orders are always B2B + always carry a
      // placedByName; half carry a PO reference. Other demo orders split 20%
      // B2B 80% B2C.
      const isSfr = spec.paymentMethod === 'SUBMIT_FOR_REVIEW';
      const orderType: 'B2C' | 'B2B' = isSfr
        ? 'B2B'
        : rng() < 0.2
          ? 'B2B'
          : 'B2C';

      const order = await prisma.order.create({
        data: {
          orderNumber,
          type: orderType,
          contactName: name,
          contactPhone: phone,
          contactEmail:
            rng() < 0.5
              ? `${name.toLowerCase().replace(' ', '.')}@example.com`
              : null,
          addressSnapshot: addressSnapshot as never,
          status: spec.status,
          paymentMethod: spec.paymentMethod,
          paymentStatus: spec.paymentStatus,
          subtotalEgp: subtotal,
          shippingEgp: shipping,
          vatEgp: 0,
          totalEgp: total,
          paymobTransactionId:
            spec.paymentMethod !== 'COD' && !isSfr
              ? `demo-${randomUUID().slice(0, 16)}`
              : null,
          createdAt,
          confirmedAt:
            spec.status !== 'PENDING_CONFIRMATION' ? createdAt : null,
          deliveredAt:
            spec.status === 'DELIVERED' || spec.status === 'RETURNED'
              ? new Date(createdAt.getTime() + 2 * 24 * 60 * 60 * 1000)
              : null,
          placedByName: isSfr ? pick(DEMO_NAMES, rng) : null,
          poReference:
            isSfr && rng() < 0.5
              ? `PO-${Math.floor(1000 + rng() * 9000)}`
              : null,
          internalNotes: `${DEMO_TAG} seeded ${new Date().toISOString()}`,
          items: { create: items },
          statusEvents: {
            create: [{ status: spec.status, createdAt }],
          },
        },
      });

      console.log(`[seed-orders] ${order.orderNumber} · ${spec.status}`);
    }
  }

  const total = await prisma.order.count({
    where: { internalNotes: { contains: DEMO_TAG } },
  });
  console.log(`[seed-orders] done — ${total} demo orders present.`);

  // Sprint 10 S10-D9-T3 — seed 5 sample returns on DELIVERED demo orders.
  const deliveredDemo = await prisma.order.findMany({
    where: {
      internalNotes: { contains: DEMO_TAG },
      status: 'DELIVERED',
    },
    include: { items: { select: { id: true, qty: true, skuSnapshot: true } } },
    take: 5,
  });
  const REASONS = [
    'Damaged on arrival',
    'Wrong cartridge sent',
    'Customer changed mind within window',
    'Package missing one line',
    'Manufacturing defect reported',
  ];
  const DECISIONS = [
    'APPROVED_CASH',
    'APPROVED_CARD_MANUAL',
    'PENDING',
    'DENIED',
    'APPROVED_CASH',
  ] as const;
  let seededReturns = 0;
  for (let i = 0; i < deliveredDemo.length; i += 1) {
    const order = deliveredDemo[i]!;
    const firstItem = order.items[0];
    if (!firstItem) continue;
    const existing = await prisma.return.count({
      where: { orderId: order.id, note: { contains: DEMO_TAG } },
    });
    if (existing > 0) continue;
    await prisma.return.create({
      data: {
        orderId: order.id,
        reason: REASONS[i % REASONS.length]!,
        refundDecision: DECISIONS[i]!,
        refundAmountEgp: DECISIONS[i] === 'DENIED' ? null : 150,
        note: DEMO_TAG,
        items: {
          create: [
            {
              orderItemId: firstItem.id,
              qty: Math.min(1, firstItem.qty),
            },
          ],
        },
      },
    });
    seededReturns += 1;
  }
  console.log(`[seed-orders] seeded ${seededReturns} demo returns`);
}

main()
  .catch((err) => {
    console.error('[seed-orders] failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
