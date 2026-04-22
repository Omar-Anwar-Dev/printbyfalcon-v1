#!/usr/bin/env tsx
/**
 * Catalog CSV seeder.
 *
 *   npm run seed:catalog -- <path-to.csv>   (upserts rows by SKU)
 *   npm run seed:catalog -- --dry <path.csv> (parse + validate, no writes)
 *
 * CSV columns (header required, order-insensitive):
 *   sku, name_ar, name_en, description_ar, description_en,
 *   brand_slug, category_slug, base_price_egp, vat_exempt,
 *   authenticity, specs_json, status
 *
 * Images go in `{csv-dir}/images/<sku>/*.jpg|png|webp|avif` and are processed
 * via the same sharp pipeline the admin UI uses. Any existing images for a
 * SKU are left untouched — delete the product's images from admin if you want
 * to replace them.
 *
 * Brands and categories are upserted by slug; missing brand/category slugs in
 * the CSV will create a row with Arabic==English==slug as a placeholder (the
 * admin can edit them afterwards).
 *
 * A companion file `docs/catalog-data-guide.md` ships in Day 8 with the full
 * field-by-field spec.
 */
import {
  PrismaClient,
  type Authenticity,
  type CatalogStatus,
} from '@prisma/client';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { processProductImage } from '@/lib/storage/images';
import { slugify, uniqueSlug } from '@/lib/catalog/slug';
import { updateProductSearchVector } from '@/lib/catalog/search-vector';
import { parseCatalogCsv, type CsvRow } from '@/lib/catalog/csv-parser';

const prisma = new PrismaClient();

// CsvRow / CSV parsing + validation moved to `lib/catalog/csv-parser.ts` in
// Sprint 11 so edge cases (BOM, duplicate SKUs, missing headers, Arabic
// Unicode quirks) can be unit-tested without instantiating PrismaClient.

async function ensureBrand(slug: string) {
  const existing = await prisma.brand.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.brand.create({
    data: {
      slug,
      nameAr: slug,
      nameEn: slug,
    },
  });
}

async function ensureCategory(slug: string) {
  const existing = await prisma.category.findUnique({ where: { slug } });
  if (existing) return existing;
  return prisma.category.create({
    data: {
      slug,
      nameAr: slug,
      nameEn: slug,
    },
  });
}

async function importRow(row: CsvRow, csvDir: string, dry: boolean) {
  const sku = row.sku.trim();
  if (!sku) throw new Error('Row missing SKU');
  const name_en = row.name_en.trim();
  if (!name_en) throw new Error(`SKU ${sku}: name_en required`);

  if (dry) return { sku, skipped: 'dry' };

  const brand = await ensureBrand(row.brand_slug.trim() || 'generic');
  const category = await ensureCategory(
    row.category_slug.trim() || 'uncategorized',
  );

  const basePrice = Number.parseFloat(row.base_price_egp);
  if (!Number.isFinite(basePrice) || basePrice < 0) {
    throw new Error(
      `SKU ${sku}: invalid base_price_egp "${row.base_price_egp}"`,
    );
  }

  const authenticity: Authenticity =
    row.authenticity.toUpperCase() === 'COMPATIBLE' ? 'COMPATIBLE' : 'GENUINE';
  const status: CatalogStatus =
    row.status.toUpperCase() === 'ARCHIVED' ? 'ARCHIVED' : 'ACTIVE';
  const vatExempt = row.vat_exempt.trim().toLowerCase() === 'true';

  const specs: Record<string, string> = {};
  if (row.specs_json.trim()) {
    try {
      const parsed = JSON.parse(row.specs_json);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') specs[k] = v;
        }
      }
    } catch {
      throw new Error(`SKU ${sku}: specs_json not valid JSON`);
    }
  }

  const existing = await prisma.product.findUnique({ where: { sku } });

  let productId: string;
  if (existing) {
    const updated = await prisma.product.update({
      where: { sku },
      data: {
        nameAr: row.name_ar.trim() || name_en,
        nameEn: name_en,
        descriptionAr: row.description_ar,
        descriptionEn: row.description_en,
        brandId: brand.id,
        categoryId: category.id,
        basePriceEgp: basePrice,
        vatExempt,
        authenticity,
        status,
        specs,
      },
    });
    productId = updated.id;
  } else {
    const slug = await uniqueSlug(
      `${name_en}-${sku}`,
      async (candidate) =>
        (await prisma.product.count({ where: { slug: candidate } })) > 0,
    );
    const created = await prisma.product.create({
      data: {
        sku,
        slug,
        nameAr: row.name_ar.trim() || name_en,
        nameEn: name_en,
        descriptionAr: row.description_ar,
        descriptionEn: row.description_en,
        brandId: brand.id,
        categoryId: category.id,
        basePriceEgp: basePrice,
        vatExempt,
        authenticity,
        status,
        specs,
      },
    });
    productId = created.id;
  }

  await updateProductSearchVector(productId);

  // Images: {csvDir}/images/{sku}/*
  const imageDir = path.join(csvDir, 'images', sku);
  let entries: string[] = [];
  try {
    entries = await readdir(imageDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }
  const imageFiles = entries.filter((e) =>
    /\.(jpe?g|png|webp|avif|gif)$/i.test(e),
  );

  // Only import images if product currently has none — re-running the seeder
  // shouldn't duplicate images for products that already have them.
  const currentImageCount = await prisma.productImage.count({
    where: { productId },
  });
  if (currentImageCount === 0 && imageFiles.length > 0) {
    let position = 0;
    for (const file of imageFiles) {
      const buffer = await readFile(path.join(imageDir, file));
      const processed = await processProductImage(productId, buffer);
      await prisma.productImage.create({
        data: {
          productId,
          filename: processed.filename,
          position: position++,
        },
      });
    }
  }

  return {
    sku,
    productId,
    imported_images: currentImageCount === 0 ? imageFiles.length : 0,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const dry = args.includes('--dry');
  const csvPath = args.find((a) => !a.startsWith('--'));
  if (!csvPath) {
    console.error('Usage: npm run seed:catalog -- [--dry] <path-to.csv>');
    process.exit(2);
  }
  const absCsv = path.resolve(csvPath);
  const csvDir = path.dirname(absCsv);
  const text = await readFile(absCsv, 'utf8');
  const parseResult = parseCatalogCsv(text);

  if (parseResult.errors.length > 0) {
    console.error(
      `[seed-catalog] PARSE ERRORS (${parseResult.errors.length}):`,
    );
    for (const e of parseResult.errors) {
      console.error(`[seed-catalog]   ${e.message}`);
    }
    if (parseResult.rows.length === 0) process.exit(1);
    console.warn(
      `[seed-catalog] proceeding with ${parseResult.rows.length} valid rows; ${parseResult.errors.length} rows skipped.`,
    );
  }
  if (parseResult.warnings.length > 0) {
    for (const w of parseResult.warnings) {
      console.warn(`[seed-catalog] WARN ${w.message}`);
    }
  }

  const rows = parseResult.rows;
  console.warn(`[seed-catalog] parsed ${rows.length} rows from ${absCsv}`);

  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      const r = await importRow(row, csvDir, dry);
      console.warn(
        `[seed-catalog] ok sku=${r.sku}${'imported_images' in r ? ` images=${r.imported_images}` : ''}`,
      );
      ok++;
    } catch (err) {
      console.error(
        `[seed-catalog] FAIL sku=${row.sku}: ${(err as Error).message}`,
      );
      failed++;
    }
  }
  console.warn(`[seed-catalog] done: ${ok} ok, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

// Fallback slugify re-export so callers can inspect normalization (used by tests).
export { slugify };
