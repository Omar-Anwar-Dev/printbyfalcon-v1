/**
 * Single shared Prisma client. Avoids exhausting DB connections during HMR in dev.
 *
 * Logs a one-line diagnostic at module load so incident triage can see whether
 * DATABASE_URL was actually in the process environment when Prisma was
 * instantiated — critical signal when the app container boots cleanly but a
 * later render fails with PrismaClientInitializationError.
 */
import { PrismaClient } from '@prisma/client';

// Boot-time diagnostic. Runs once per Node process on first import of `prisma`.
// Prints in both dev and prod (one line, minimal cost) so container logs record
// it before any request handler runs.
if (!(globalThis as Record<string, unknown>).__pbfPrismaBootLogged) {
  (globalThis as Record<string, unknown>).__pbfPrismaBootLogged = true;
  console.log(
    `[PBF] Prisma client init — NODE_ENV=${
      process.env.NODE_ENV ?? 'unset'
    } DATABASE_URL_present=${!!process.env.DATABASE_URL}`,
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
