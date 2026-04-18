import type PgBoss from 'pg-boss';
import { sendEmail } from '@/lib/mailer';
import { logger } from '@/lib/logger';

export type SendEmailJobPayload = {
  to: string;
  subject: string;
  text?: string;
  html?: string;
  replyTo?: string;
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
        } catch (err) {
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
