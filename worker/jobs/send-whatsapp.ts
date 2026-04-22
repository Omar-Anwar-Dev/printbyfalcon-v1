import type PgBoss from 'pg-boss';
import { sendWhatsApp, type WhatsAppSend } from '@/lib/whatsapp';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { isCustomerOptedOut } from '@/lib/notifications/opt-out';

export async function registerWhatsAppJob(boss: PgBoss, concurrency: number) {
  const queue = 'send-whatsapp';
  await boss.createQueue(queue);
  await boss.work<WhatsAppSend>(
    queue,
    { batchSize: concurrency },
    async (jobs) => {
      for (const job of jobs) {
        // Sprint 11 — skip customer-opted-out recipients (recorded when the
        // customer replied STOP to our WhatsApp number). OTP sends bypass
        // this queue entirely (issueOtp calls sendWhatsApp directly) so auth
        // flows still work for opted-out users.
        if (await isCustomerOptedOut(job.data.phone)) {
          if (job.data.notificationId) {
            await prisma.notification
              .update({
                where: { id: job.data.notificationId },
                data: { status: 'FAILED', errorMessage: 'opted_out' },
              })
              .catch((err) =>
                logger.warn(
                  { notificationId: job.data.notificationId, err },
                  'send-whatsapp.opt_out.notification_update_failed',
                ),
              );
          }
          logger.info(
            { jobId: job.id, bodyPreview: job.data.body.slice(0, 40) },
            'send-whatsapp.skipped.opted_out',
          );
          continue;
        }

        const result = await sendWhatsApp(job.data);

        // Reflect the send result back onto the Notification row if one was
        // passed. Best-effort — if the row is gone (deleted, re-issued, etc.)
        // we log and continue. The job's own retry behaviour is still
        // governed by the throw/return below.
        if (job.data.notificationId) {
          try {
            await prisma.notification.update({
              where: { id: job.data.notificationId },
              data: result.ok
                ? {
                    status: 'SENT',
                    externalMessageId: result.externalMessageId ?? null,
                    sentAt: new Date(),
                    errorMessage: null,
                  }
                : {
                    status: 'FAILED',
                    errorMessage: result.error ?? 'send failed',
                  },
            });
          } catch (err) {
            logger.warn(
              { notificationId: job.data.notificationId, err },
              'send-whatsapp.notification_update_failed',
            );
          }
        }

        if (!result.ok) {
          logger.error(
            {
              jobId: job.id,
              error: result.error,
              bodyPreview: job.data.body.slice(0, 40),
            },
            'send-whatsapp.failed',
          );
          throw new Error(result.error ?? 'send failed');
        }
      }
    },
  );
}

export async function enqueueWhatsApp(boss: PgBoss, payload: WhatsAppSend) {
  return boss.send('send-whatsapp', payload, {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
  });
}
