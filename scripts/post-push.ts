/**
 * Post-`prisma db push` bootstrap — applies raw-SQL artifacts that Prisma's
 * schema can't express yet (GIN indexes on Unsupported("tsvector"), pg_trgm
 * extension, searchVector backfill for existing rows).
 *
 * Runs on every app container start, after `db push` and before `seed.ts`,
 * so it is idempotent by design (every statement is `IF NOT EXISTS` or an
 * unconditional UPDATE).
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Trigram extension — powers fallback short-query search and fuzzy lookups
  // for printer-model names.
  await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);

  // GIN index for tsvector queries. `Unsupported("tsvector")` in Prisma means
  // we manage this by hand. Naming matches Prisma's `<Model>_<field>_idx`.
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_searchVector_idx" ON "Product" USING GIN ("searchVector")`,
  );

  // Trigram indexes for short-query fallback (catches queries shorter than a
  // tokenizer word boundary) on fields users actually type into the search box.
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_nameAr_trgm_idx" ON "Product" USING GIN ("nameAr" gin_trgm_ops)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_nameEn_trgm_idx" ON "Product" USING GIN ("nameEn" gin_trgm_ops)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "Product_sku_trgm_idx" ON "Product" USING GIN ("sku" gin_trgm_ops)`,
  );
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "PrinterModel_modelName_trgm_idx" ON "PrinterModel" USING GIN ("modelName" gin_trgm_ops)`,
  );

  // Backfill searchVector for every product. Safe to run every boot — it's a
  // single UPDATE that rewrites identical bytes when nothing changed.
  const rewritten = await prisma.$executeRawUnsafe(`
    UPDATE "Product" p
    SET "searchVector" =
      setweight(to_tsvector('simple', coalesce(p."sku", '')), 'A')
      || setweight(to_tsvector('simple', coalesce(p."nameAr", '')), 'A')
      || setweight(to_tsvector('simple', coalesce(p."nameEn", '')), 'A')
      || setweight(to_tsvector('simple', coalesce(b."nameAr", '')), 'B')
      || setweight(to_tsvector('simple', coalesce(b."nameEn", '')), 'B')
      || setweight(to_tsvector('simple', coalesce(p."descriptionAr", '')), 'C')
      || setweight(to_tsvector('simple', coalesce(p."descriptionEn", '')), 'C')
    FROM "Brand" b
    WHERE b.id = p."brandId"
  `);

  // eslint-disable-next-line no-console
  console.warn(
    `[post-push] FTS bootstrap OK — rewrote ${rewritten} product search vectors.`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('[post-push] failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
