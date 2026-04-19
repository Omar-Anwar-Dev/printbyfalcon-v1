import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * Minimal status probe used by the confirmation page's poller.
 * Returns `{ paymentStatus, status }` or 404 if the order doesn't exist.
 * Intentionally does NOT leak financial totals — just the enums.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: { paymentStatus: true, status: true },
  });
  if (!order) return NextResponse.json({ error: 'not-found' }, { status: 404 });
  return NextResponse.json(order, { headers: { 'Cache-Control': 'no-store' } });
}
