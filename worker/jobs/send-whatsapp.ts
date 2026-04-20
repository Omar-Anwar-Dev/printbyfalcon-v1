import type PgBoss from 'pg-boss';
import { sendWhatsApp, type WhatsAppSend } from '@/lib/whatsapp';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export async function registerWhatsAppJob(boss: PgBoss, concurrency: number) {
  const queue = 'send-whatsapp';
  await boss.createQueue(queue);
  await boss.work<WhatsAppSend>(
    queue,
    { batchSize: concurrency },
    async (jobs) => {
      for (const job of jobs) {
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
