#!/usr/bin/env tsx
/**
 * Search performance audit — runs the canonical Sprint 3 search query shapes
 * 50 times each, reports p50/p95/p99 latency, and prints EXPLAIN (ANALYZE,
 * BUFFERS) for one sample so the index plan can be eyeballed.
 *
 * Exit criterion: p95 < 500 ms across all query shapes (architecture NFR).
 *
 * Usage:
 *   npm run perf:search                # against the DB in $DATABASE_URL
 *   npm run perf:search -- --runs 100  # more samples
 */
import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const runs = (() => {
  const i = process.argv.indexOf('--runs');
  if (i > -1) {
    const n = Number.parseInt(process.argv[i + 1] ?? '', 10);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 50;
})();

type QueryShape = {
  name: string;
  run: () => Promise<unknown>;
  explain?: Prisma.Sql;
};

const QUERIES: QueryShape[] = [
  {
    name: 'FTS keyword (Arabic: حبر)',
    run: () => prisma.$queryRaw`
      SELECT p.id, ts_rank_cd(p."searchVector", plainto_tsquery('simple', 'حبر')) AS rank
      FROM "Product" p
      JOIN "Brand" b ON b.id = p."brandId"
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE p.status = 'ACTIVE' AND b.status = 'ACTIVE' AND c.status = 'ACTIVE'
        AND p."searchVector" @@ plainto_tsquery('simple', 'حبر')
      ORDER BY rank DESC LIMIT 20
    `,
    explain: Prisma.sql`EXPLAIN (ANALYZE, BUFFERS) SELECT p.id
      FROM "Product" p
      JOIN "Brand" b ON b.id = p."brandId"
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE p.status = 'ACTIVE' AND b.status = 'ACTIVE' AND c.status = 'ACTIVE'
        AND p."searchVector" @@ plainto_tsquery('simple', 'حبر')
      ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('simple', 'حبر')) DESC LIMIT 20
    `,
  },
  {
    name: 'FTS keyword (English: toner)',
    run: () => prisma.$queryRaw`
      SELECT p.id FROM "Product" p
      JOIN "Brand" b ON b.id = p."brandId"
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE p.status = 'ACTIVE' AND b.status = 'ACTIVE' AND c.status = 'ACTIVE'
        AND p."searchVector" @@ plainto_tsquery('simple', 'toner')
      ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('simple', 'toner')) DESC LIMIT 20
    `,
  },
  {
    name: 'FTS + filter (brand + authenticity)',
    run: () => prisma.$queryRaw`
      SELECT p.id FROM "Product" p
      JOIN "Brand" b ON b.id = p."brandId"
      JOIN "Category" c ON c.id = p."categoryId"
      WHERE p.status = 'ACTIVE' AND b.status = 'ACTIVE' AND c.status = 'ACTIVE'
        AND p."searchVector" @@ plainto_tsquery('simple', 'HP')
        AND p.authenticity = 'GENUINE'::"Authenticity"
      ORDER BY ts_rank_cd(p."searchVector", plainto_tsquery('simple', 'HP')) DESC LIMIT 20
    `,
  },
  {
    name: 'Printer-model detection (fuzzy)',
    run: () => prisma.$queryRaw`
      SELECT pm.id FROM "PrinterModel" pm
      JOIN "Brand" b ON b.id = pm."brandId"
      WHERE pm.status = 'ACTIVE' AND b.status = 'ACTIVE'
        AND (pm."modelName" ILIKE '%M404%' OR similarity(pm."modelName", 'M404') > 0.35)
      ORDER BY similarity(pm."modelName", 'M404') DESC LIMIT 1
    `,
  },
  {
    name: 'Printer-compatibility filter (EXISTS)',
    run: async () => {
      const [pm] = await prisma.$queryRaw<{ id: string }[]>`
        SELECT id FROM "PrinterModel" WHERE status='ACTIVE' LIMIT 1
      `;
      if (!pm) return [];
      return prisma.$queryRaw`
        SELECT p.id FROM "Product" p
        WHERE p.status = 'ACTIVE' AND EXISTS (
          SELECT 1 FROM "ProductCompatibility" pc
          WHERE pc."productId" = p.id AND pc."printerModelId" = ${pm.id}
        ) LIMIT 20
      `;
    },
  },
];

function pct(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length),
  );
  return sorted[idx]!;
}

async function main() {
  // eslint-disable-next-line no-console
  console.warn(`[perf] runs=${runs} per query shape. Target: p95 < 500 ms.`);

  for (const shape of QUERIES) {
    const timings: number[] = [];
    // Warm-up so caches stabilize.
    for (let i = 0; i < 3; i++) await shape.run();

    for (let i = 0; i < runs; i++) {
      const t0 = performance.now();
      await shape.run();
      timings.push(performance.now() - t0);
    }

    const p50 = pct(timings, 50);
    const p95 = pct(timings, 95);
    const p99 = pct(timings, 99);
    const flag = p95 < 500 ? 'OK' : 'SLOW';
    // eslint-disable-next-line no-console
    console.warn(
      `[perf] ${flag.padEnd(4)} | ${shape.name}: p50=${p50.toFixed(1)}ms p95=${p95.toFixed(1)}ms p99=${p99.toFixed(1)}ms`,
    );
  }

  // EXPLAIN one representative plan so the operator can verify GIN usage.
  const explainShape = QUERIES.find((q) => q.explain);
  if (explainShape?.explain) {
    // eslint-disable-next-line no-console
    console.warn(`\n[perf] EXPLAIN ANALYZE for: ${explainShape.name}`);
    const plan = await prisma.$queryRaw<{ 'QUERY PLAN': string }[]>(
      explainShape.explain,
    );
    for (const row of plan) {
      // eslint-disable-next-line no-console
      console.warn(row['QUERY PLAN']);
    }
  }
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[perf] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
