/**
 * pg-boss worker entry point.
 * Runs as a separate Node process (own Docker container) sharing Postgres
 * with the web app. Registers job handlers and cron schedules, then idles.
 */
import 'dotenv/config';
import PgBoss from 'pg-boss';
import { logger } from '@/lib/logger';
import { cleanupExpiredRateLimits } from '@/lib/rate-limit';
import { cleanupExpiredSessions } from '@/lib/session';
import { cleanupExpiredOtps } from '@/lib/otp';
import { registerEmailJob } from './jobs/send-email';
import { registerWhatsAppJob } from './jobs/send-whatsapp';
import { registerHeartbeatJob } from './jobs/heartbeat';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  logger.error('DATABASE_URL missing; worker cannot start.');
  process.exit(1);
}

const concurrency = Number(process.env.WORKER_CONCURRENCY ?? 5);

async function main() {
  const boss = new PgBoss({
    connectionString: DATABASE_URL,
    retentionDays: 7,
    // allow cron & scheduled jobs
    schedule: true,
  });

  boss.on('error', (err) => logger.error({ err }, 'pgboss.error'));

  await boss.start();
  logger.warn({ concurrency }, 'worker.started');

  await registerHeartbeatJob(boss);
  await registerEmailJob(boss, concurrency);
  await registerWhatsAppJob(boss, concurrency);

  // Cleanup crons. pg-boss v10 requires explicit queue creation before
  // schedule/work; otherwise schedule fails with FK violation.
  await boss.createQueue('cleanup-expired-otps');
  await boss.schedule(
    'cleanup-expired-otps',
    '0 * * * *',
    {},
    { tz: 'Africa/Cairo' },
  );
  await boss.work<Record<string, never>>('cleanup-expired-otps', async () => {
    const n = await cleanupExpiredOtps();
    logger.info({ removed: n }, 'cleanup.otps.done');
  });

  await boss.createQueue('cleanup-expired-sessions');
  await boss.schedule(
    'cleanup-expired-sessions',
    '*/30 * * * *',
    {},
    { tz: 'Africa/Cairo' },
  );
  await boss.work<Record<string, never>>(
    'cleanup-expired-sessions',
    async () => {
      const n = await cleanupExpiredSessions();
      logger.info({ removed: n }, 'cleanup.sessions.done');
    },
  );

  await boss.createQueue('cleanup-expired-rate-limits');
  await boss.schedule(
    'cleanup-expired-rate-limits',
    '15 * * * *',
    {},
    { tz: 'Africa/Cairo' },
  );
  await boss.work<Record<string, never>>(
    'cleanup-expired-rate-limits',
    async () => {
      const n = await cleanupExpiredRateLimits();
      logger.info({ removed: n }, 'cleanup.rate_limits.done');
    },
  );

  // Shutdown hooks
  const shutdown = async (signal: string) => {
    logger.warn({ signal }, 'worker.shutting_down');
    await boss.stop({ graceful: true, timeout: 10_000 });
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((err) => {
  logger.error({ err }, 'worker.fatal');
  process.exit(1);
});
