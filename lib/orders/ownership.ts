/**
 * Shared order-ownership check (Sprint 8 S8-D9-T3).
 *
 * Returns true iff the caller is the user who placed the order (B2C), OR the
 * primary user of the Company the order is attached to (B2B), OR any admin.
 * Any other result returns false — server actions / routes should treat that
 * as a 404 to avoid leaking the order's existence.
 */
import { prisma } from '@/lib/db';
import type { User } from '@prisma/client';

export async function userCanAccessOrder(
  user: User | null,
  orderId: string,
): Promise<{
  canAccess: boolean;
  order: {
    id: string;
    userId: string | null;
    companyId: string | null;
    type: string;
  } | null;
}> {
  if (!user) return { canAccess: false, order: null };
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true, userId: true, companyId: true, type: true },
  });
  if (!order) return { canAccess: false, order: null };

  if (user.type === 'ADMIN') return { canAccess: true, order };
  if (order.userId === user.id) return { canAccess: true, order };

  if (user.type === 'B2B' && order.companyId) {
    const company = await prisma.company.findUnique({
      where: { primaryUserId: user.id },
      select: { id: true },
    });
    if (company && company.id === order.companyId) {
      return { canAccess: true, order };
    }
  }

  return { canAccess: false, order };
}
