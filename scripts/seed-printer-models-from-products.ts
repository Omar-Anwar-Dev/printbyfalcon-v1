/**
 * One-shot helper: extract PrinterModel rows from existing printer Products
 * and link each printer Product to its matching PrinterModel via the new
 * `Product.printerModelId` column.
 *
 * Why this exists:
 *   The catalog ships with 0 PrinterModel rows and 0 ProductCompatibility
 *   links. Manually creating PrinterModels for ~55 printer Products before
 *   the storefront's compatibility sections become useful is busywork.
 *   This script bootstraps that work — owner reviews + edits afterwards.
 *
 * What it does:
 *   1. Walks the Category tree from "printers" root (configurable below).
 *   2. For every ACTIVE Product under that subtree:
 *      a. Derives a `modelName` by stripping the product's brand name from
 *         `nameEn` (or falls back to `nameAr` if `nameEn` is missing).
 *      b. Upserts a PrinterModel row keyed by (brandId, modelName).
 *      c. Sets `Product.printerModelId` to the upserted PrinterModel.
 *   3. Prints a summary of created vs reused vs skipped.
 *
 * Idempotent: re-running picks up the same PrinterModel rows by their
 * unique (brandId, modelName) constraint. Products already linked are
 * skipped unless --force is passed (which re-links them).
 *
 * Usage:
 *   npx tsx scripts/seed-printer-models-from-products.ts            # dry run
 *   npx tsx scripts/seed-printer-models-from-products.ts --apply    # writes
 *   npx tsx scripts/seed-printer-models-from-products.ts --apply --force
 *
 * Owner workflow after running:
 *   - Review the new PrinterModel list at /admin/printer-models
 *   - Fix any noisy model names (e.g. trailing Arabic words like "طابعة")
 *   - Use the existing CompatibilityPicker on each consumable's edit page
 *     to link it to the printer models it fits
 */
import { prisma } from '../lib/db';

const PRINTER_ROOT_SLUG = 'printers';

const APPLY = process.argv.includes('--apply');
const FORCE = process.argv.includes('--force');

type Brand = { id: string; nameAr: string; nameEn: string };

/**
 * Strip the brand name from the start of a product name.
 *   "HP LaserJet M404dn"   + brand HP   → "LaserJet M404dn"
 *   "Canon imageCLASS X"   + brand Canon → "imageCLASS X"
 *   "M404dn"               + brand HP   → "M404dn" (unchanged)
 *
 * Uses both English and Arabic brand names to handle bilingual product
 * names robustly.
 */
function deriveModelName(productName: string, brand: Brand): string {
  let name = productName.trim();
  for (const candidate of [brand.nameEn, brand.nameAr]) {
    const re = new RegExp(`^${escapeRegExp(candidate)}\\s+`, 'i');
    name = name.replace(re, '');
  }
  // Drop trailing single-word "طابعة" / "Printer" decorations.
  name = name.replace(/\s+(طابعة|printer)\s*$/i, '');
  return name.trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 100);
}

async function main() {
  console.log(
    `Mode: ${APPLY ? (FORCE ? 'APPLY + FORCE relink' : 'APPLY') : 'DRY RUN (use --apply to write)'}\n`,
  );

  // 1. Resolve the printer category subtree.
  const printerRoot = await prisma.category.findUnique({
    where: { slug: PRINTER_ROOT_SLUG },
    select: { id: true },
  });
  if (!printerRoot) {
    console.error(
      `Category with slug "${PRINTER_ROOT_SLUG}" not found. Aborting.`,
    );
    process.exit(1);
  }
  const allCats = await prisma.category.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, parentId: true },
  });
  const childrenOf = new Map<string, string[]>();
  for (const c of allCats) {
    if (!c.parentId) continue;
    if (!childrenOf.has(c.parentId)) childrenOf.set(c.parentId, []);
    childrenOf.get(c.parentId)!.push(c.id);
  }
  const printerCategoryIds = new Set<string>([printerRoot.id]);
  const stack: string[] = [printerRoot.id];
  while (stack.length) {
    const id = stack.pop()!;
    for (const child of childrenOf.get(id) ?? []) {
      if (!printerCategoryIds.has(child)) {
        printerCategoryIds.add(child);
        stack.push(child);
      }
    }
  }
  console.log(`Printer subtree: ${printerCategoryIds.size} categories`);

  // 2. Pull printer products + their brands.
  const products = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      categoryId: { in: Array.from(printerCategoryIds) },
    },
    include: {
      brand: { select: { id: true, nameAr: true, nameEn: true } },
    },
  });
  console.log(`Printer products to process: ${products.length}\n`);

  let created = 0;
  let reused = 0;
  let skippedAlreadyLinked = 0;
  let linked = 0;
  let skippedEmpty = 0;

  for (const p of products) {
    if (p.printerModelId && !FORCE) {
      skippedAlreadyLinked++;
      continue;
    }

    const baseName = (p.nameEn?.trim() || p.nameAr?.trim() || '').trim();
    const modelName = deriveModelName(baseName, p.brand);
    if (!modelName) {
      console.log(`  SKIP empty modelName: ${p.sku} (${baseName})`);
      skippedEmpty++;
      continue;
    }

    const existingPM = await prisma.printerModel.findFirst({
      where: { brandId: p.brand.id, modelName },
      select: { id: true },
    });

    let pmId: string;
    if (existingPM) {
      pmId = existingPM.id;
      reused++;
      console.log(
        `  REUSE  ${p.sku.padEnd(20)} → ${p.brand.nameEn} ${modelName}`,
      );
    } else {
      const slugBase = slugify(`${p.brand.nameEn}-${modelName}`);
      // Disambiguate slug if it collides — the unique constraint is on slug
      // alone (PrinterModel.slug @unique), so two brands with same model
      // string would clash without this.
      let slug = slugBase;
      let suffix = 0;
      while (
        await prisma.printerModel.count({ where: { slug } }).then((n) => n > 0)
      ) {
        suffix++;
        slug = `${slugBase}-${suffix}`;
      }
      if (APPLY) {
        const newPm = await prisma.printerModel.create({
          data: {
            brandId: p.brand.id,
            modelName,
            slug,
            status: 'ACTIVE',
          },
          select: { id: true },
        });
        pmId = newPm.id;
      } else {
        pmId = '<dry-run>';
      }
      created++;
      console.log(
        `  CREATE ${p.sku.padEnd(20)} → ${p.brand.nameEn} ${modelName}`,
      );
    }

    if (APPLY && pmId !== '<dry-run>') {
      await prisma.product.update({
        where: { id: p.id },
        data: { printerModelId: pmId },
      });
      linked++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`  PrinterModels created:        ${created}`);
  console.log(`  PrinterModels reused:         ${reused}`);
  console.log(`  Products linked:              ${linked}`);
  console.log(`  Skipped (already linked):     ${skippedAlreadyLinked}`);
  console.log(`  Skipped (empty model name):   ${skippedEmpty}`);
  if (!APPLY)
    console.log(`\nDry run — no changes written. Re-run with --apply.`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
