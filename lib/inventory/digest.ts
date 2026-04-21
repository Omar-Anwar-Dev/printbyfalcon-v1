/**
 * Build + enqueue the daily low-stock digest email (Sprint 6 S6-D3-T1).
 *
 * Queues one `send-email` job per OWNER/OPS admin with an email, so recipient
 * failures don't block the rest. Returns the count of jobs enqueued for the
 * worker log. Skips entirely when there's nothing low.
 */
import { prisma } from '@/lib/db';
import { enqueueJob } from '@/lib/queue';
import { listLowStockProducts } from '@/lib/inventory/low-stock';
import { renderLowStockDigest } from '@/lib/email/low-stock-digest';

export async function sendLowStockDigest(): Promise<{
  rows: number;
  enqueued: number;
}> {
  const rows = await listLowStockProducts(100);
  if (rows.length === 0) return { rows: 0, enqueued: 0 };

  const recipients = await prisma.user.findMany({
    where: {
      type: 'ADMIN',
      status: 'ACTIVE',
      adminRole: { in: ['OWNER', 'OPS'] },
      email: { not: null },
    },
    select: { id: true, email: true, languagePref: true },
  });
  if (recipients.length === 0) return { rows: rows.length, enqueued: 0 };

  let enqueued = 0;
  for (const r of recipients) {
    if (!r.email) continue;
    const locale: 'ar' | 'en' = r.languagePref === 'EN' ? 'en' : 'ar';
    const rendered = renderLowStockDigest(locale, rows);
    await enqueueJob('send-email', {
      to: r.email,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
    enqueued += 1;
  }
  return { rows: rows.length, enqueued };
}
