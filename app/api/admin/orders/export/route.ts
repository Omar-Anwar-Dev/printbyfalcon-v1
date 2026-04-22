import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import type { OrderStatus, Prisma } from '@prisma/client';

/**
 * Sprint 10 S10-D7-T2 — CSV export for orders admin. OWNER + OPS only.
 * Respects current filters via query params (status, paymentStatus, search).
 * Columns are ASCII-safe; Arabic product names stay intact via UTF-8 BOM
 * so Excel renders them correctly on Windows.
 */
export async function GET(req: NextRequest) {
  await requireAdmin(['OWNER', 'OPS']);
  const sp = req.nextUrl.searchParams;
  const status = sp.get('status') as OrderStatus | null;
  const paymentStatus = sp.get('paymentStatus');
  const q = sp.get('q')?.trim() ?? '';
  const from = sp.get('from');
  const to = sp.get('to');

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(paymentStatus
      ? {
          paymentStatus:
            paymentStatus as Prisma.OrderWhereInput['paymentStatus'],
        }
      : {}),
    ...(q
      ? {
          OR: [
            { orderNumber: { contains: q, mode: 'insensitive' } },
            { contactName: { contains: q, mode: 'insensitive' } },
            { contactPhone: { contains: q } },
          ],
        }
      : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
  };

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 5000,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      type: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      contactName: true,
      contactPhone: true,
      contactEmail: true,
      subtotalEgp: true,
      shippingEgp: true,
      discountEgp: true,
      vatEgp: true,
      codFeeEgp: true,
      totalEgp: true,
      user: { select: { name: true } },
      company: { select: { nameAr: true } },
    },
  });

  const headers = [
    'order_number',
    'created_at',
    'type',
    'status',
    'payment_status',
    'payment_method',
    'contact_name',
    'contact_phone',
    'contact_email',
    'company_name',
    'user_name',
    'subtotal_egp',
    'shipping_egp',
    'discount_egp',
    'vat_egp',
    'cod_fee_egp',
    'total_egp',
  ];

  function esc(v: unknown): string {
    if (v === null || v === undefined) return '';
    const s = String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }

  const rows = [headers.join(',')];
  for (const o of orders) {
    rows.push(
      [
        esc(o.orderNumber),
        esc(o.createdAt.toISOString()),
        esc(o.type),
        esc(o.status),
        esc(o.paymentStatus),
        esc(o.paymentMethod),
        esc(o.contactName),
        esc(o.contactPhone),
        esc(o.contactEmail ?? ''),
        esc(o.company?.nameAr ?? ''),
        esc(o.user?.name ?? ''),
        esc(o.subtotalEgp.toString()),
        esc(o.shippingEgp.toString()),
        esc(o.discountEgp.toString()),
        esc(o.vatEgp.toString()),
        esc(o.codFeeEgp.toString()),
        esc(o.totalEgp.toString()),
      ].join(','),
    );
  }

  const body = '\uFEFF' + rows.join('\n'); // UTF-8 BOM for Excel compatibility
  const filename = `pbf-orders-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  });
}
