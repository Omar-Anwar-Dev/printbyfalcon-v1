/**
 * Sales-rep fan-out notifier (Sprint 8 S8-D1-T3).
 *
 * Fans a "new Submit-for-Review order" email out to every OWNER + SALES_REP
 * admin with a populated email — matches the low-stock digest pattern
 * (Sprint 6 `lib/inventory/digest.ts`). "Assigned rep" stays v1.1 per PRD.
 */
import { prisma } from '@/lib/db';
import { enqueueJob } from '@/lib/queue';
import { renderSalesRepNewOrderEmail } from '@/lib/email/sales-rep-new-order';

export async function notifySalesRepsOfPendingOrder(args: {
  orderId: string;
  orderNumber: string;
  companyNameAr: string;
  companyNameEn: string | null;
  placedByName: string;
  totalEgp: number;
}): Promise<{ enqueued: number }> {
  const recipients = await prisma.user.findMany({
    where: {
      type: 'ADMIN',
      status: 'ACTIVE',
      adminRole: { in: ['OWNER', 'SALES_REP'] },
      email: { not: null },
    },
    select: { id: true, email: true, languagePref: true },
  });
  if (recipients.length === 0) return { enqueued: 0 };

  const appUrl = (process.env.APP_URL ?? 'https://printbyfalcon.com').replace(
    /\/+$/,
    '',
  );

  let enqueued = 0;
  for (const r of recipients) {
    if (!r.email) continue;
    const locale: 'ar' | 'en' = r.languagePref === 'EN' ? 'en' : 'ar';
    const rendered = renderSalesRepNewOrderEmail({
      locale,
      orderNumber: args.orderNumber,
      companyName:
        locale === 'en' && args.companyNameEn
          ? args.companyNameEn
          : args.companyNameAr,
      placedByName: args.placedByName,
      totalEgp: args.totalEgp,
      adminOrderUrl: `${appUrl}/${locale}/admin/orders/${args.orderId}`,
      queueUrl: `${appUrl}/${locale}/admin/b2b/pending-confirmation`,
    });
    await enqueueJob(
      'send-email',
      {
        to: r.email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      },
      { retryLimit: 3, retryDelay: 60, retryBackoff: true },
    );
    enqueued += 1;
  }
  return { enqueued };
}
