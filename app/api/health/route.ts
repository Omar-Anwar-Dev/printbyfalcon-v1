/**
 * Liveness + readiness probe. UptimeRobot hits this every 5 minutes; if the
 * DB ping fails we return 503 so it's logged as downtime rather than served
 * from a broken node.
 */
import { prisma } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({
      ok: true,
      service: 'pbf-web',
      env: process.env.NODE_ENV ?? 'unknown',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return Response.json(
      {
        ok: false,
        error: (err as Error).message,
        timestamp: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
