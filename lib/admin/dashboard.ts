import { prisma } from '@/lib/db';
import { listLowStockProducts } from '@/lib/inventory/low-stock';
import type { OrderStatus } from '@prisma/client';

export type SalesDelta = {
  currentEgp: number;
  priorEgp: number;
  deltaPct: number | null; // null when prior = 0
};

export type DashboardCounts = {
  newOrdersAwaitingAction: number;
  pendingConfirmation: number;
  pendingB2BApplications: number;
  returnsPending: number;
  lowStockCount: number;
};

/** Orders that count toward "sales" — terminal or paid-up revenue. */
const SALES_STATUSES: OrderStatus[] = [
  'CONFIRMED',
  'HANDED_TO_COURIER',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

/** Orders that count toward "revenue" in the home dashboard — excludes
 *  cancelled/returned. */
function paidOrEnRoute(): { status: { in: OrderStatus[] } } {
  return { status: { in: SALES_STATUSES } };
}

function rangeStart(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(): Date {
  // Sat = start of work week in Egypt, but the owner works Sun-Thu. Either way,
  // we default to last-7-days (rolling) which is language- and week-agnostic.
  return rangeStart(6);
}

function startOfMonth(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(1);
  return d;
}

async function sumOrderTotals(from: Date, to?: Date): Promise<number> {
  const rows = await prisma.order.aggregate({
    where: {
      ...paidOrEnRoute(),
      createdAt: to ? { gte: from, lt: to } : { gte: from },
    },
    _sum: { totalEgp: true },
  });
  return Number(rows._sum.totalEgp ?? 0);
}

export async function getSalesToday(): Promise<SalesDelta> {
  const today = startOfToday();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const [current, prior] = await Promise.all([
    sumOrderTotals(today),
    sumOrderTotals(yesterday, today),
  ]);
  return {
    currentEgp: current,
    priorEgp: prior,
    deltaPct: prior === 0 ? null : ((current - prior) / prior) * 100,
  };
}

export async function getSalesWeek(): Promise<SalesDelta> {
  const start = startOfWeek();
  const priorStart = rangeStart(13);
  const [current, prior] = await Promise.all([
    sumOrderTotals(start),
    sumOrderTotals(priorStart, start),
  ]);
  return {
    currentEgp: current,
    priorEgp: prior,
    deltaPct: prior === 0 ? null : ((current - prior) / prior) * 100,
  };
}

export async function getSalesMonth(): Promise<SalesDelta> {
  const start = startOfMonth();
  const priorStart = new Date(start);
  priorStart.setMonth(priorStart.getMonth() - 1);
  const [current, prior] = await Promise.all([
    sumOrderTotals(start),
    sumOrderTotals(priorStart, start),
  ]);
  return {
    currentEgp: current,
    priorEgp: prior,
    deltaPct: prior === 0 ? null : ((current - prior) / prior) * 100,
  };
}

/** Daily totals for the last 30 days — used by the sparkline chart. */
export async function getSalesTrend30d(): Promise<
  Array<{ day: string; totalEgp: number }>
> {
  const start = rangeStart(29);
  const orders = await prisma.order.findMany({
    where: {
      ...paidOrEnRoute(),
      createdAt: { gte: start },
    },
    select: { createdAt: true, totalEgp: true },
  });
  const buckets = new Map<string, number>();
  for (let i = 0; i < 30; i += 1) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const o of orders) {
    const k = o.createdAt.toISOString().slice(0, 10);
    buckets.set(k, (buckets.get(k) ?? 0) + Number(o.totalEgp));
  }
  return Array.from(buckets.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([day, totalEgp]) => ({ day, totalEgp }));
}

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const [
    newOrdersAwaitingAction,
    pendingConfirmation,
    pendingB2BApplications,
    returnsPending,
    lowStock,
  ] = await Promise.all([
    prisma.order.count({
      where: {
        status: 'CONFIRMED',
        paymentStatus: { in: ['PAID', 'PENDING_ON_DELIVERY'] },
      },
    }),
    prisma.order.count({
      where: { status: 'PENDING_CONFIRMATION', type: 'B2B' },
    }),
    prisma.b2BApplication.count({ where: { status: 'PENDING' } }),
    prisma.return.count({ where: { refundDecision: 'PENDING' } }),
    listLowStockProducts(100),
  ]);
  return {
    newOrdersAwaitingAction,
    pendingConfirmation,
    pendingB2BApplications,
    returnsPending,
    lowStockCount: lowStock.length,
  };
}

/** Top-10 products this month by units sold. */
export async function getTopProductsThisMonth() {
  const start = startOfMonth();
  const rows = await prisma.orderItem.groupBy({
    by: ['skuSnapshot', 'nameArSnapshot', 'nameEnSnapshot'],
    where: {
      order: {
        ...paidOrEnRoute(),
        createdAt: { gte: start },
      },
    },
    _sum: { qty: true, lineTotalEgp: true },
    orderBy: { _sum: { qty: 'desc' } },
    take: 10,
  });
  return rows.map((r) => ({
    sku: r.skuSnapshot,
    nameAr: r.nameArSnapshot,
    nameEn: r.nameEnSnapshot,
    unitsSold: r._sum.qty ?? 0,
    revenueEgp: Number(r._sum.lineTotalEgp ?? 0),
  }));
}

/** Top-10 customers this month by revenue (B2C + B2B aggregated by user). */
export async function getTopCustomersThisMonth() {
  const start = startOfMonth();
  const grouped = await prisma.order.groupBy({
    by: ['userId'],
    where: {
      ...paidOrEnRoute(),
      createdAt: { gte: start },
      userId: { not: null },
    },
    _sum: { totalEgp: true },
    _count: { _all: true },
    orderBy: { _sum: { totalEgp: 'desc' } },
    take: 10,
  });
  const userIds = grouped
    .map((g) => g.userId)
    .filter((id): id is string => !!id);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, type: true, phone: true, email: true },
  });
  const userById = new Map(users.map((u) => [u.id, u]));
  return grouped
    .map((g) => {
      const u = g.userId ? userById.get(g.userId) : undefined;
      if (!u) return null;
      return {
        userId: u.id,
        name: u.name,
        type: u.type,
        phone: u.phone,
        email: u.email,
        orderCount: g._count._all,
        totalEgp: Number(g._sum.totalEgp ?? 0),
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);
}

/** Oldest PENDING_CONFIRMATION order age (hours) — surfaced in sales-rep widget. */
export async function getOldestPendingB2BHours(): Promise<number | null> {
  const row = await prisma.order.findFirst({
    where: { status: 'PENDING_CONFIRMATION', type: 'B2B' },
    orderBy: { createdAt: 'asc' },
    select: { createdAt: true },
  });
  if (!row) return null;
  return Math.floor((Date.now() - row.createdAt.getTime()) / (60 * 60 * 1000));
}
