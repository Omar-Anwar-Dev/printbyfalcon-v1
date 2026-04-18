import type PgBoss from 'pg-boss';
import { logger } from '@/lib/logger';

export async function registerHeartbeatJob(boss: PgBoss) {
  const queue = 'heartbeat';
  await boss.schedule(queue, '* * * * *', {}, { tz: 'Africa/Cairo' });
  await boss.work<Record<string, never>>(queue, async (jobs) => {
    logger.info({ jobs: jobs.length }, 'heartbeat.tick');
  });
}
