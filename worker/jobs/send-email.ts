import type PgBoss from 'pg-boss';
import { sendEmail } from '@/lib/mailer';
import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';

export type SendEmailJobPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
  /**
   * Optional Notification row id; when set, the worker flips that row's
   * status (PENDING → SENT / FAILED) after SMTP settles. Matches the
   * Whats360 send-job pattern for end-to-end traceability.
   */
  notificationId?: string;
};

export async function registerEmailJob(boss: PgBoss, concurrency: number) {
  const queue = 'send-email';
  await boss.createQueue(queue);
  await boss.work<SendEmailJobPayload>(
    queue,
    { batchSize: concurrency },
    async (jobs) => {
      for (const job of jobs) {
        try {
          await sendEmail(job.data);

          if (job.data.notificationId) {
            try {
              await prisma.notification.update({
                where: { id: job.data.notificationId },
                data: {
                  status: 'SENT',
                  externalMessageId: `smtp-${Date.now()}`,
                  sentAt: new Date(),
                  errorMessage: null,
                },
              });
            } catch (err) {
              logger.warn(
                { notificationId: job.data.notificationId, err },
                'send-email.notification_update_failed',
              );
            }
          }
        } catch (err) {
          if (job.data.notificationId) {
            try {
              await prisma.notification.update({
                where: { id: job.data.notificationId },
                data: {
                  status: 'FAILED',
                  errorMessage: (err as Error).message ?? 'smtp send failed',
                },
              });
            } catch (upErr) {
              logger.warn(
                { notificationId: job.data.notificationId, err: upErr },
                'send-email.notification_update_failed',
              );
            }
          }
          logger.error({ err, jobId: job.id }, 'send-email.failed');
          throw err;
        }
      }
    },
  );
}

export async function enqueueEmail(boss: PgBoss, payload: SendEmailJobPayload) {
  return boss.send('send-email', payload, {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
  });
}
