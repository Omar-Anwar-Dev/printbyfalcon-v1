/**
 * Lightweight pg-boss enqueue helper for Server Actions / webhook routes.
 *
 * A full pg-boss client inside the Next.js process would keep idle
 * connections open and race the worker's own boss instance for schema
 * creation. Instead we insert a job row directly into `pgboss.job` — the
 * same table the worker's `boss.work(...)` consumes from. The worker's
 * pg-boss install creates the schema on its first boot; by the time a web
 * request hits this module, the tables exist.
 *
 * Keep the payload shape in sync with the worker's `register*Job` handlers.
 */
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';

type JobOptions = {
  retryLimit?: number;
  retryDelay?: number; // seconds
  retryBackoff?: boolean;
  singletonKey?: string;
};

/**
 * Enqueue a pg-boss job by writing straight to `pgboss.job`. Returns the job id.
 * The worker picks it up on its next poll tick (default ~2 seconds in pg-boss v10).
 */
export async function enqueueJob<T extends Record<string, unknown>>(
  name: string,
  data: T,
  opts: JobOptions = {},
): Promise<string> {
  const retryLimit = opts.retryLimit ?? 3;
  const retryDelay = opts.retryDelay ?? 60;
  const retryBackoff = opts.retryBackoff ?? true;
  const singletonKey = opts.singletonKey ?? null;

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    INSERT INTO pgboss.job (name, data, retry_limit, retry_delay, retry_backoff, singleton_key, state)
    VALUES (
      ${name},
      ${JSON.stringify(data)}::jsonb,
      ${retryLimit}::int,
      ${retryDelay}::int,
      ${retryBackoff}::boolean,
      ${singletonKey},
      'created'
    )
    RETURNING id
  `);
  return rows[0]?.id ?? '';
}
