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
import { releaseExpiredCartReservations } from '@/lib/cart/stock';
import { reconcileStalePaymobOrders } from '@/lib/order/reconciliation';
import { sendLowStockDigest } from '@/lib/inventory/digest';
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

  // Sprint 4: release cart soft-holds whose 15-min TTL elapsed.
  await boss.createQueue('cleanup-expired-cart-reservations');
  await boss.schedule(
    'cleanup-expired-cart-reservations',
    '*/5 * * * *',
    {},
    { tz: 'Africa/Cairo' },
  );
  await boss.work<Record<string, never>>(
    'cleanup-expired-cart-reservations',
    async () => {
      const n = await releaseExpiredCartReservations();
      if (n > 0) logger.info({ removed: n }, 'cleanup.cart_reservations.done');
    },
  );

  // Sprint 4: Paymob reconciliation for orders whose webhook never arrived.
  await boss.createQueue('paymob-reconciliation');
  await boss.schedule(
    'paymob-reconciliation',
    '25 * * * *',
    {},
    { tz: 'Africa/Cairo' },
  );
  await boss.work<Record<string, never>>('paymob-reconciliation', async () => {
    const { checked, updated } = await reconcileStalePaymobOrders();
    if (checked > 0) {
      logger.warn({ checked, updated }, 'reconcile.paymob.done');
    }
  });

  // Sprint 6: low-stock digest (daily 08:00 Africa/Cairo).
  await boss.createQueue('low-stock-digest');
  await boss.schedule(
    'low-stock-digest',
    '0 8 * * *',
    {},
    { tz: 'Africa/Cairo' },
  );
  await boss.work<Record<string, never>>('low-stock-digest', async () => {
    const { rows, enqueued } = await sendLowStockDigest();
    if (rows > 0) {
      logger.warn({ rows, enqueued }, 'low_stock_digest.sent');
    } else {
      logger.info('low_stock_digest.empty');
    }
  });

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
