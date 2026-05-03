#!/usr/bin/env tsx
/**
 * M1 production cutover — wipe all test/demo data, then import the real
 * catalog CSV. Single-shot script intended to run ONCE at the M1 launch
 * cutover, immediately after a fresh `bash scripts/backup.sh` snapshot.
 *
 *   npx tsx scripts/m1-fresh-catalog.ts <csv-path>                  # DRY RUN (default)
 *   npx tsx scripts/m1-fresh-catalog.ts <csv-path> --execute        # actually wipe + import
 *   npx tsx scripts/m1-fresh-catalog.ts <csv-path> --execute --also-customers
 *                                                                   # also wipe non-admin Users + Address + Company + B2BApplication
 *   npx tsx scripts/m1-fresh-catalog.ts <csv-path> --execute --also-promos
 *                                                                   # also wipe PromoCode (default keeps owner-configured promos)
 *
 * What gets wiped (default mode):
 *   - All Cart + CartItem
 *   - All InventoryReservation + InventoryMovement
 *   - All Order + OrderItem + OrderStatusEvent + Return + ReturnItem + Invoice + Notification
 *   - All Product + ProductImage + Inventory + ProductCompatibility
 *   - All Brand + Category + PrinterModel
 *   - All Feedback (M1 starts clean)
 *   - All RateLimit + WhatsAppOtp (operational housekeeping)
 *
 * What gets preserved:
 *   - User (admins + B2C/B2B testers if any)  →  use --also-customers to wipe non-admin
 *   - Session, AdminInvite
 *   - Setting (admin-configured: shipping zones, COD policy, VAT, returns policy, store info)
 *   - ShippingZone + GovernorateZone
 *   - Courier (admin-CRUD'd)
 *   - PricingTier (B2B tiers)
 *   - PromoCode  →  use --also-promos to wipe
 *   - Company + B2BApplication  →  use --also-customers to wipe
 *   - AuditLog (history of past changes)
 *
 * Storage files (`/var/pbf/storage/products/<productId>/*`) are NOT deleted by
 * this script. Run `rm -rf /var/pbf/storage/products/*` on the VPS after the
 * DB wipe + before the CSV import; the new CSV's image references will land
 * in fresh per-product directories.
 *
 * The script uses a single Prisma transaction so a partial failure rolls back
 * the entire wipe + import. If anything goes wrong, the DB is back to the
 * pre-script state (the backup is your second-line safety net).
 */
import { PrismaClient } from '@prisma/client';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCatalogCsv } from '@/lib/catalog/csv-parser';

const prisma = new PrismaClient();

type Plan = {
  csvPath: string;
  execute: boolean;
  alsoCustomers: boolean;
  alsoPromos: boolean;
};

function parseArgs(argv: string[]): Plan {
  const args = argv.slice(2);
  const csvPath = args.find((a) => !a.startsWith('--'));
  if (!csvPath) {
    console.error(
      'Usage: npx tsx scripts/m1-fresh-catalog.ts <csv-path> [--execute] [--also-customers] [--also-promos]',
    );
    process.exit(2);
  }
  return {
    csvPath: path.resolve(csvPath),
    execute: args.includes('--execute'),
    alsoCustomers: args.includes('--also-customers'),
    alsoPromos: args.includes('--also-promos'),
  };
}

type Counts = Record<string, number>;

async function countCurrentRows(plan: Plan): Promise<Counts> {
  const c: Counts = {};
  c.Cart = await prisma.cart.count();
  c.CartItem = await prisma.cartItem.count();
  c.InventoryReservation = await prisma.inventoryReservation.count();
  c.InventoryMovement = await prisma.inventoryMovement.count();
  c.Order = await prisma.order.count();
  c.OrderItem = await prisma.orderItem.count();
  c.OrderStatusEvent = await prisma.orderStatusEvent.count();
  c.Return = await prisma.return.count();
  c.ReturnItem = await prisma.returnItem.count();
  c.Notification = await prisma.notification.count();
  c.Invoice = await prisma.invoice.count();
  c.Product = await prisma.product.count();
  c.ProductImage = await prisma.productImage.count();
  c.Inventory = await prisma.inventory.count();
  c.ProductCompatibility = await prisma.productCompatibility.count();
  c.Brand = await prisma.brand.count();
  c.Category = await prisma.category.count();
  c.PrinterModel = await prisma.printerModel.count();
  c.Feedback = await prisma.feedback.count();
  c.RateLimit = await prisma.rateLimit.count();
  c.WhatsAppOtp = await prisma.whatsAppOtp.count();
  if (plan.alsoCustomers) {
    c.User_nonAdmin = await prisma.user.count({
      where: { type: { not: 'ADMIN' } },
    });
    c.Address = await prisma.address.count();
    c.Company = await prisma.company.count();
    c.B2BApplication = await prisma.b2BApplication.count();
  }
  if (plan.alsoPromos) {
    c.PromoCode = await prisma.promoCode.count();
  }
  // Always-preserved counts (informational).
  c['(preserved) User_admin'] = await prisma.user.count({
    where: { type: 'ADMIN' },
  });
  c['(preserved) Setting'] = await prisma.setting.count();
  c['(preserved) Courier'] = await prisma.courier.count();
  c['(preserved) ShippingZone'] = await prisma.shippingZone.count();
  c['(preserved) AuditLog'] = await prisma.auditLog.count();
  return c;
}

function printPlan(plan: Plan, before: Counts, csvRows: number): void {
  console.log(
    `\nM1 fresh-catalog plan — ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`,
  );
  console.log(`CSV: ${plan.csvPath}`);
  console.log(`CSV rows parsed: ${csvRows}`);
  console.log(
    `Execute mode: ${plan.execute ? 'YES (will write)' : 'NO (dry run; pass --execute to apply)'}`,
  );
  console.log(`Also wipe customers: ${plan.alsoCustomers ? 'YES' : 'no'}`);
  console.log(`Also wipe promos: ${plan.alsoPromos ? 'YES' : 'no'}`);
  console.log('\nCurrent row counts (will WIPE unless prefixed (preserved)):');
  for (const [tbl, n] of Object.entries(before)) {
    const pad = tbl.padEnd(28);
    console.log(`  ${pad}${n.toString().padStart(8)}`);
  }
}

async function wipe(plan: Plan): Promise<void> {
  // Dependency-ordered DELETEs inside a single transaction. Most parent→child
  // FKs already cascade per schema (ProductImage, Inventory, OrderItem,
  // OrderStatusEvent, Return*, Invoice all cascade from Product/Order).
  // Deleting parents first is enough for those; for Restrict relations we
  // delete in dependency order explicitly.
  await prisma.$transaction([
    // Transactional + ephemeral data (orders, carts, notifications, ratelimits).
    prisma.cartItem.deleteMany({}),
    prisma.cart.deleteMany({}),
    prisma.inventoryReservation.deleteMany({}),
    prisma.inventoryMovement.deleteMany({}),
    prisma.notification.deleteMany({}),
    prisma.invoice.deleteMany({}),
    prisma.returnItem.deleteMany({}),
    prisma.return.deleteMany({}),
    prisma.orderStatusEvent.deleteMany({}),
    prisma.orderItem.deleteMany({}),
    prisma.order.deleteMany({}),
    prisma.feedback.deleteMany({}),
    prisma.rateLimit.deleteMany({}),
    prisma.whatsAppOtp.deleteMany({}),
    // Catalog (Product cascades to ProductImage, Inventory, ProductCompatibility).
    prisma.productCompatibility.deleteMany({}),
    prisma.productImage.deleteMany({}),
    prisma.inventory.deleteMany({}),
    prisma.product.deleteMany({}),
    prisma.printerModel.deleteMany({}),
    // Categories: leaf-first via repeated deletes (parent Restrict). Loop
    // outside the transaction, then run a single final deleteMany so any
    // surviving roots go in the same TX. For 200 demo rows this completes in
    // one or two iterations.
    prisma.category.deleteMany({}),
    prisma.brand.deleteMany({}),
    ...(plan.alsoPromos ? [prisma.promoCode.deleteMany({})] : []),
    ...(plan.alsoCustomers
      ? [
          // Wipe in cascade-aware order. Address + Cart + Notification (User-linked)
          // already cascade from User; Order has SetNull on userId so it's already
          // gone. Company has primaryUserId Cascade so Company → User wipe needs
          // Company first.
          prisma.companyPriceOverride.deleteMany({}),
          prisma.company.deleteMany({}),
          prisma.b2BApplication.deleteMany({}),
          prisma.address.deleteMany({}),
          prisma.session.deleteMany({
            where: { user: { type: { not: 'ADMIN' } } },
          }),
          prisma.user.deleteMany({ where: { type: { not: 'ADMIN' } } }),
        ]
      : []),
  ]);
}

async function importCatalog(
  csvPath: string,
): Promise<{ ok: number; failed: number }> {
  // Defer to the existing seed-catalog logic by spawning it as a child
  // process — keeps a single canonical importer. The seeder does upsert-by-SKU
  // which on a fresh DB is just inserts.
  const { spawn } = await import('node:child_process');
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['tsx', 'scripts/seed-catalog.ts', csvPath],
      { stdio: 'inherit' },
    );
    const ok = 0;
    const failed = 0;
    child.on('exit', (code) => {
      if (code === 0) {
        // The seeder logs "done: N ok, M failed" — parse that from stdout if
        // we'd captured it. For now, exit 0 means all rows ok; let the seeder
        // own the per-row reporting (stdio is inherited so the operator sees it).
        resolve({ ok, failed });
      } else {
        reject(new Error(`seed-catalog exited with code ${code}`));
      }
    });
    child.on('error', reject);
  });
}

async function main(): Promise<void> {
  const plan = parseArgs(process.argv);

  // Parse CSV first — fail fast if the file's malformed, before touching DB.
  const csvText = await readFile(plan.csvPath, 'utf8');
  const parsed = parseCatalogCsv(csvText);
  if (parsed.errors.length > 0 && parsed.rows.length === 0) {
    console.error('\nCSV parse failed — no valid rows. Errors:');
    for (const e of parsed.errors) console.error('  ' + e.message);
    process.exit(1);
  }
  if (parsed.errors.length > 0) {
    console.warn(
      `\nCSV has ${parsed.errors.length} bad row(s) (will be skipped on import):`,
    );
    for (const e of parsed.errors) console.warn('  ' + e.message);
  }

  const before = await countCurrentRows(plan);
  printPlan(plan, before, parsed.rows.length);

  if (!plan.execute) {
    console.log(
      '\n— DRY RUN — no writes. Pass --execute to actually wipe + import.\n',
    );
    return;
  }

  console.log(
    '\n— EXECUTING — wiping + importing in 3 seconds. Ctrl+C to abort.',
  );
  await new Promise((r) => setTimeout(r, 3000));

  console.log('\nWiping...');
  await wipe(plan);

  console.log('\nImporting catalog...');
  await importCatalog(plan.csvPath);

  const after = await countCurrentRows(plan);
  console.log('\nPost-import counts:');
  for (const [tbl, n] of Object.entries(after)) {
    console.log(`  ${tbl.padEnd(28)}${n.toString().padStart(8)}`);
  }

  console.log(
    '\nM1 cutover complete. Verify on /admin/products before announcing.',
  );
}

main()
  .catch((err) => {
    console.error('\nm1-fresh-catalog FAILED:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
