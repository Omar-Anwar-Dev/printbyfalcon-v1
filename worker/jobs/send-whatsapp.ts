import type PgBoss from 'pg-boss';
import { sendWhatsAppTemplate, type WhatsAppTemplateSend } from '@/lib/whatsapp';
import { logger } from '@/lib/logger';

export async function registerWhatsAppJob(boss: PgBoss, concurrency: number) {
  const queue = 'send-whatsapp';
  await boss.work<WhatsAppTemplateSend>(
    queue,
    { batchSize: concurrency },
    async (jobs) => {
      for (const job of jobs) {
        const result = await sendWhatsAppTemplate(job.data);
        if (!result.ok) {
          logger.error(
            { jobId: job.id, template: job.data.template, error: result.error },
            'send-whatsapp.failed',
          );
          throw new Error(result.error ?? 'send failed');
        }
      }
    },
  );
}

export async function enqueueWhatsApp(
  boss: PgBoss,
  payload: WhatsAppTemplateSend,
) {
  return boss.send('send-whatsapp', payload, {
    retryLimit: 3,
    retryDelay: 60,
    retryBackoff: true,
  });
}
